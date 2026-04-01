import type { PoolConfig } from "pg";

function isLocalPostgresHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1";
}

/** Parsed parts for drizzle-kit, which ignores `ssl` when only `url` is set. */
export function parsePostgresUrl(connectionString: string): {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
} {
  const u = new URL(connectionString);
  const database = u.pathname.replace(/^\//, "").split("/")[0] || "postgres";
  const port = u.port ? Number(u.port) : 5432;
  return {
    host: u.hostname,
    port,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database,
  };
}

export function buildPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL!;
  const connectionTimeoutMillis = parseInt(
    process.env.DATABASE_CONNECTION_TIMEOUT_MS || "15000",
    10,
  );

  const base: PoolConfig = { connectionString, connectionTimeoutMillis };

  if (process.env.DATABASE_SSL === "false" || process.env.DATABASE_SSL === "0") {
    return base;
  }

  let ssl: PoolConfig["ssl"] = undefined;

  try {
    const u = new URL(connectionString);
    const mode = u.searchParams.get("sslmode")?.toLowerCase();

    if (mode === "disable") {
      return base;
    }

    const rejectUnauthorized =
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" &&
      process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "0";

    const explicitSslMode =
      mode === "require" || mode === "verify-ca" || mode === "verify-full";

    const forceSsl =
      process.env.DATABASE_SSL === "true" ||
      process.env.DATABASE_SSL === "1" ||
      explicitSslMode;

    if (forceSsl) {
      ssl = { rejectUnauthorized };
    } else if (!isLocalPostgresHost(u.hostname)) {
      ssl = { rejectUnauthorized };
    }
  } catch {
    // Invalid URL: fall back to connection string only.
  }

  if (!ssl) return base;
  return { ...base, ssl };
}
