import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // dbCredentials só são necessárias para push/studio contra banco externo;
  // as migrations são geradas offline e aplicadas pela factory (dev) ou script (prod).
  ...(process.env.DATABASE_URL
    ? { dbCredentials: { url: process.env.DATABASE_URL } }
    : {}),
});
