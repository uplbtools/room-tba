import { NEON_CONNECTION_STRING } from "astro:env/server";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(NEON_CONNECTION_STRING);
