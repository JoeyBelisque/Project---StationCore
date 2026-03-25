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