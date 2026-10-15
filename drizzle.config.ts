import { defineConfig } from 'drizzle-kit';
import { loadEnv } from './scripts/load-env';

loadEnv();

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'postgresql',
	dbCredentials: { url: process.env.DATABASE_URL as string },
	out: './src/lib/server/db',
	verbose: true,
	strict: true
});
