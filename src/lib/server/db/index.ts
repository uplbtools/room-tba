import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import { type SQL, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

console.log(env.DATABASE_URL);
export const client = postgres(env.DATABASE_URL);

export const db = drizzle({client});

export const lower = (string: AnyPgColumn): SQL => {
  return sql`lower(${string})`;
}