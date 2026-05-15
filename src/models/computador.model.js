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

  return result.rows[0];
};

export const updateComputador = async (id, data) => {
  const { hostname, serial_number, status, pa } = data;

  const result = await pool.query(
    "UPDATE computadores SET hostname = $1, serial_number = $2, status = $3, pa = $4, updated_at = NOW() WHERE id = $5 RETURNING *",
    [hostname, serial_number, status, pa, id]
  );

  return result.rows[0];
};

export const deleteComputador = async (id) => {
  await pool.query("DELETE FROM computadores WHERE id = $1", [id]);
};