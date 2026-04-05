import fs from "node:fs";
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

/**
 * When PoolConfig.ssl is set, drop `sslmode` from the URL so libpq-style URL flags
 * (e.g. prefer/allow) do not fight Node's TLS stack — avoids slow or stuck connects.
 */
function connectionStringForExplicitSsl(connectionString: string): string {
  try {
    const u = new URL(connectionString);
    if (!u.searchParams.has("sslmode")) return connectionString;
    u.searchParams.delete("sslmode");
    return u.toString();
  } catch {
    return connectionString;
  }
}

function buildSslOptions(rejectUnauthorized: boolean): NonNullable<PoolConfig["ssl"]> {
  const caPath = process.env.DATABASE_SSL_CA_FILE?.trim();
  if (!caPath) {
    return { rejectUnauthorized };
  }
  let ca: string;
  try {
    ca = fs.readFileSync(caPath, "utf8");
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    throw new Error(`DATABASE_SSL_CA_FILE: could not read "${caPath}": ${err}`);
  }
  return { rejectUnauthorized, ca };
}


/**
 * Maps URL sslmode to Node TLS verify behavior (aligned with PostgreSQL libpq).
 * `require` / `prefer` / `allow` — encrypted without full cert verify by default;
 * `verify-ca` / `verify-full` verify the chain. (We strip sslmode from the URL when
 * passing Pool.ssl so negotiation is not duplicated.)
 * Env DATABASE_SSL_REJECT_UNAUTHORIZED=false|0 always disables verify; true|1 forces verify.
 */
function rejectUnauthorizedForPostgresSsl(
  sslmode: string | null | undefined,
  implicitRemoteSsl: boolean,
): boolean {
  const v = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
  if (v === "false" || v === "0") return false;
  if (v === "true" || v === "1") return true;

  const mode = sslmode ?? (implicitRemoteSsl ? "require" : null);
  if (mode === "verify-full" || mode === "verify-ca") return true;
  return false;
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

    const explicitSslMode =
      mode === "require" || mode === "verify-ca" || mode === "verify-full";

    const forceSsl =
      process.env.DATABASE_SSL === "true" ||
      process.env.DATABASE_SSL === "1" ||
      explicitSslMode;

    if (forceSsl) {
      ssl = buildSslOptions(rejectUnauthorizedForPostgresSsl(mode, false));
    } else if (!isLocalPostgresHost(u.hostname)) {
      ssl = buildSslOptions(
        rejectUnauthorizedForPostgresSsl(mode, true),
      );
    }
  } catch {
    // Invalid URL: fall back to connection string only.
  }

  if (!ssl) return base;
  return {
    ...base,
    connectionString: connectionStringForExplicitSsl(connectionString),
    ssl,
  };
}
