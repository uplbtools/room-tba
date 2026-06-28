// drizzle.config.ts

import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";

config({ path: ".env" });

export default defineConfig({
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DATABASE_URL"] as string,
  },
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
});
