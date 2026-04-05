/**
 * Model = camada que fala com a base de dados (SQL).
 * $1, $2, … = parâmetros seguros: o driver escapa valores e evita SQL injection.
 */
import { pool } from "../config/db.js";

export const getComputadores = async () => {
  const result = await pool.query("SELECT * FROM computadores");
  return result.rows;
};

export const createComputador = async (data) => {
  const { hostname, serial_number, status, pa } = data;

  const result = await pool.query(
    "INSERT INTO computadores (hostname, serial_number, status, pa) VALUES ($1, $2, $3, $4) RETURNING *",
    [hostname, serial_number, status, pa]
  );

  // RETURNING * devolve a linha criada (inclui id e created_at gerados pelo Postgres).
  return result.rows[0];
};