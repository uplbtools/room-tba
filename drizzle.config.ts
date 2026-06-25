// drizzle.config.ts

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["NEON_CONNECTION_STRING"] as string,
  },
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
});
