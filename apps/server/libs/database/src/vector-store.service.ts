import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import type { AppConfig } from '@libs/config';

export type VectorSearchHit = {
  chunkId: string;
  documentName: string;
  content: string;
  score: number;
};

export type EmbeddingRow = {
  chunkId: string;
  datasetId: number;
  modelKey: string;
  vector: number[];
};

@Injectable()
export class VectorStoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VectorStoreService.name);
  private readonly pool: Pool;

  constructor(config: ConfigService<AppConfig>) {
    const database = config.getOrThrow('database');
    this.pool = new Pool({
      host: database.host,
      port: database.port,
      user: database.user,
      password: database.password,
      database: database.database,
    });
  }

  async onModuleInit() {
    await this.pool.query('CREATE EXTENSION IF NOT EXISTS vector');
    await this.pool.query(`
      ALTER TABLE t_chunk
        ADD COLUMN IF NOT EXISTS embedding vector,
        ADD COLUMN IF NOT EXISTS embedding_model TEXT,
        ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER
    `);
    await this.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 't_chunk'
            AND column_name = 'embedding'
            AND udt_name <> 'vector'
        ) THEN
          ALTER TABLE t_chunk
            ALTER COLUMN embedding TYPE vector
            USING NULL::vector;
        END IF;
      END $$;
    `);
    await this.pool.query(
      'CREATE INDEX IF NOT EXISTS t_chunk_dataset_model_embedding_idx ON t_chunk (dataset_id, embedding_model)',
    );
    this.logger.log('pgvector schema is ready');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async replaceEmbeddings(rows: EmbeddingRow[]) {
    if (rows.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const row of rows) {
        await client.query(
          `UPDATE t_chunk
           SET embedding = $1::vector, embedding_model = $2, embedding_dimensions = $3
           WHERE id = $4 AND dataset_id = $5`,
          [toVectorLiteral(row.vector), row.modelKey, row.vector.length, row.chunkId, row.datasetId],
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async search(datasetId: number, modelKey: string, queryVector: number[], topK: number) {
    const result = await this.pool.query(
      `SELECT c.id AS "chunkId", d.name AS "documentName", c.content,
             1 - (c.embedding <=> $1::vector) AS score
      FROM t_chunk c
      INNER JOIN t_document d ON d.id = c.document_id
      WHERE c.dataset_id = $2
        AND c.embedding_model = $3
        AND c.embedding_dimensions = $4
        AND c.embedding IS NOT NULL
         AND c.enabled = TRUE
         AND d.enabled = TRUE
      ORDER BY c.embedding <=> $1::vector
       LIMIT $5`,
      [toVectorLiteral(queryVector), datasetId, modelKey, queryVector.length, Math.max(1, Math.min(topK, 100))],
    );
    return result.rows.map((row) => ({
      chunkId: String(row.chunkId),
      documentName: String(row.documentName),
      content: String(row.content),
      score: roundScore(Number(row.score)),
    }));
  }
}

function toVectorLiteral(vector: number[]): string {
  if (vector.length === 0 || vector.length > 8192 || vector.some((value) => !Number.isFinite(value))) {
    throw new Error('嵌入向量格式不正确');
  }
  return `[${vector.join(',')}]`;
}

function roundScore(score: number): number {
  return Math.round(score * 10_000) / 10_000;
}
