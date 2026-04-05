/**
 * Wrapper para `node-pg-migrate`: aplica ou reverte ficheiros em /migrations.
 * Copiamos DB_* → PG* porque o cliente Postgres lê PGHOST, PGUSER, etc. por convenção;
 * assim o .env fica igual ao usado em src/config/db.js.
 */
import dotenv from "dotenv";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const pairs = [
  ["DB_HOST", "PGHOST"],
  ["DB_PORT", "PGPORT"],
  ["DB_USER", "PGUSER"],
  ["DB_PASSWORD", "PGPASSWORD"],
  ["DB_NAME", "PGDATABASE"],
];
for (const [from, to] of pairs) {
  const raw = process.env[from];
  if (raw != null && String(raw).trim() !== "") {
    process.env[to] = String(raw).trim();
  }
}

// argv: `node scripts/pg-migrate.mjs up` → up; sem argumento, assume up.
const action = process.argv[2] || "up";
const bin = path.join(root, "node_modules", "node-pg-migrate", "bin", "node-pg-migrate.js");
const child = spawn(process.execPath, [bin, action, "-m", "migrations"], {
  cwd: root,
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 1));
