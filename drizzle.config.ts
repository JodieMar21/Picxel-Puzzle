import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { buildPoolConfig, parsePostgresUrl } from "./server/postgresConnection";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const databaseUrl = process.env.DATABASE_URL;
const poolConfig = buildPoolConfig();

const dbCredentials =
  poolConfig.ssl !== undefined
    ? { ...parsePostgresUrl(databaseUrl), ssl: poolConfig.ssl }
    : { url: databaseUrl };

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials,
});
