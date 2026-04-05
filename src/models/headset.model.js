/**
 * CRUD de headsets. Colunas em snake_case = nomes iguais aos da tabela Postgres.
 */
import { pool } from "../config/db.js";

/** Lista headsets; ORDER BY updated_at DESC = mais recentes primeiro. */
export async function getHeadsets() {
  const result = await pool.query(
    `SELECT id, matricula, lacre, marca, numero_serie, status, observacoes, created_at, updated_at
     FROM headsets
     ORDER BY updated_at DESC`
  );
  return result.rows;
}

export async function createHeadset(data) {
  const {
    matricula,
    lacre,
    marca = "",
    numero_serie = "",
    status = "em_uso",
    observacoes = "",
  } = data;

  const result = await pool.query(
    `INSERT INTO headsets (matricula, lacre, marca, numero_serie, status, observacoes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, matricula, lacre, marca, numero_serie, status, observacoes, created_at, updated_at`,
    [matricula, lacre, marca, numero_serie, status, observacoes]
  );
  return result.rows[0];
}

export async function updateHeadset(id, data) {
  const {
    matricula,
    lacre,
    marca = "",
    numero_serie = "",
    status = "em_uso",
    observacoes = "",
  } = data;

  const result = await pool.query(
    `UPDATE headsets SET
       matricula = $2,
       lacre = $3,
       marca = $4,
       numero_serie = $5,
       status = $6,
       observacoes = $7,
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, matricula, lacre, marca, numero_serie, status, observacoes, created_at, updated_at`,
    [id, matricula, lacre, marca, numero_serie, status, observacoes]
  );
  // Sem linhas afetadas → headset com esse id não existe.
  return result.rows[0] ?? null;
}

/** Apaga uma linha; rowCount diz se algo foi removido. */
export async function deleteHeadset(id) {
  const result = await pool.query(`DELETE FROM headsets WHERE id = $1`, [id]);
  return result.rowCount > 0;
}
