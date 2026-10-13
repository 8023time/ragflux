import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

const username = encodeURIComponent(process.env.DB_USER ?? '');
const password = encodeURIComponent(process.env.DB_PASSWORD ?? '');
const host = process.env.DB_HOST || 'localhost';
const port = process.env.DB_PORT || '5432';
const database = encodeURIComponent(process.env.DB_DATABASE ?? '');

export const db = postgres<Contract>({
  contractJson,
  url: `postgresql://${username}:${password}@${host}:${port}/${database}`,
});
