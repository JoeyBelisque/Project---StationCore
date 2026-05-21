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

export async function listarTodosUsuarios() {
  const result = await pool.query(`
    SELECT id, nome, email, role, ativo, created_at
    FROM usuarios
    ORDER BY nome ASC
  `);
  return result.rows;
}

export async function criarNovoUsuario({ nome, email, senha_hash, role = 'operador' }) {
  const result = await pool.query(
    `
      INSERT INTO usuarios (nome, email, senha_hash, role, ativo)
      VALUES ($1, $2, $3, $4, true)
      RETURNING id, nome, email, role, ativo, created_at
    `,
    [nome, email, senha_hash, role]
  );
  return result.rows[0];
}

export async function atualizarUsuario(id, { nome, email, role, ativo, senha_hash }) {
  const fields = [];
  const values = [];
  let i = 1;

  if (nome !== undefined) { fields.push(`nome = $${i++}`); values.push(nome); }
  if (email !== undefined) { fields.push(`email = $${i++}`); values.push(email); }
  if (role !== undefined) { fields.push(`role = $${i++}`); values.push(role); }
  if (ativo !== undefined) { fields.push(`ativo = $${i++}`); values.push(ativo); }
  if (senha_hash !== undefined) { fields.push(`senha_hash = $${i++}`); values.push(senha_hash); }

  if (fields.length === 0) return null;

  values.push(id);
  const result = await pool.query(
    `
      UPDATE usuarios
      SET ${fields.join(', ')}
      WHERE id = $${i}
      RETURNING id, nome, email, role, ativo, created_at
    `,
    values
  );
  return result.rows[0];
}

export async function deletarUsuario(id) {
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
  return true;
}
