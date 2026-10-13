import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

const username = encodeURIComponent(process.env.DB_USER ?? '');
const password = encodeURIComponent(process.env.DB_PASSWORD ?? '');
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '5432';
const database = encodeURIComponent(process.env.DB_DATABASE ?? '');

export default definePrismaConfig({
  orm: ormConfig({
    contract: './libs/database/src/prisma/contract.prisma',
    db: {
      connection: `postgresql://${username}:${password}@${host}:${port}/${database}`,
    },
  }),
});
