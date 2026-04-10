import { pool } from "../config/db.js";

export async function findUsuarioByEmail(email) {
  const result = await pool.query(
    `
      SELECT id, nome, email, senha_hash, role, ativo
      FROM usuarios
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );
  return result.rows[0] ?? null;
}
