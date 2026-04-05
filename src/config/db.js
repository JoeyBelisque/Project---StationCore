/**
 * Conexão com PostgreSQL via biblioteca `pg`.
 * Pool = várias ligações reutilizáveis (melhor que abrir 1 ligação por pedido).
 */
import pkg from "pg";
import dotenv from "dotenv";

// Carrega variáveis do ficheiro .env para process.env (ex.: DB_HOST).
dotenv.config();

const { Pool } = pkg;

const s = (v) => (typeof v === "string" ? v.trim() : v);
const port = Number.parseInt(s(process.env.DB_PORT), 10);

export const pool = new Pool({
  host: s(process.env.DB_HOST),
  port: Number.isFinite(port) ? port : 5432,
  user: s(process.env.DB_USER),
  password: s(process.env.DB_PASSWORD),
  database: s(process.env.DB_NAME),
});