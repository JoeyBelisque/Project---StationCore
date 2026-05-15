/**
 * CRUD de headsets. Colunas em snake_case = nomes iguais aos da tabela Postgres.
 */
import { pool } from "../config/db.js";

const MARCAS_PERMITIDAS = new Set(["intelbras", "plantronics"]);
let schemaEnsured = false;

async function ensureSchema() {
  if (schemaEnsured) return;
  await pool.query(`
    ALTER TABLE headsets
      ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'estoque';
  `);
  await pool.query(`
    ALTER TABLE headsets
      ALTER COLUMN numero_serie DROP NOT NULL;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS headset_historico (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      headset_id UUID NOT NULL REFERENCES headsets(id) ON DELETE CASCADE,
      acao TEXT NOT NULL,
      campo TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT,
      observacao TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  schemaEnsured = true;
}

function failValidation(message) {
  const err = new Error(message);
  err.code = "VALIDATION";
  return err;
}

function normalizeMarca(value) {
  const marca = String(value ?? "").trim().toLowerCase();
  if (!marca) return "";
  if (!MARCAS_PERMITIDAS.has(marca)) {
    throw failValidation("marca deve ser Intelbras ou Plantronics");
  }
  return marca;
}

function normalizeNumeroSerie(value) {
  const cleaned = String(value ?? "").trim();
  return cleaned || null;
}

function deriveCategoria(status) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === 'em_uso') return 'operacao';
  if (s === 'emprestimo') return 'emprestimo';
  if (s === 'entrega') return 'entrega';
  if (s === 'defeito' || s === 'manutencao') return 'manutencao';
  return 'estoque';
}

function normalizePayload(data) {
  const status = String(data?.status ?? "estoque").trim() || "estoque";
  return {
    matricula: String(data?.matricula ?? "").trim(),
    lacre: String(data?.lacre ?? "").trim(),
    marca: normalizeMarca(data?.marca),
    numero_serie: normalizeNumeroSerie(data?.numero_serie),
    status,
    categoria: deriveCategoria(status),
    observacoes: String(data?.observacoes ?? "").trim(),
  };
}

async function addHistoryEntry(client, headsetId, acao, campo, valorAnterior, valorNovo, observacao = "") {
  await client.query(
    `INSERT INTO headset_historico (headset_id, acao, campo, valor_anterior, valor_novo, observacao)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      headsetId,
      acao,
      campo,
      valorAnterior == null ? null : String(valorAnterior),
      valorNovo == null ? null : String(valorNovo),
      observacao,
    ]
  );
}

/** Lista headsets; ORDER BY updated_at DESC = mais recentes primeiro. */
export async function getHeadsets() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT id, matricula, lacre, marca, numero_serie, status, categoria, observacoes, created_at, updated_at
     FROM headsets
     ORDER BY updated_at DESC`
  );
  return result.rows;
}

export async function createHeadset(data) {
  await ensureSchema();
  const payload = normalizePayload(data);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO headsets (matricula, lacre, marca, numero_serie, status, categoria, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, matricula, lacre, marca, numero_serie, status, categoria, observacoes, created_at, updated_at`,
      [
        payload.matricula,
        payload.lacre,
        payload.marca,
        payload.numero_serie,
        payload.status,
        payload.categoria,
        payload.observacoes,
      ]
    );
    const row = result.rows[0];
    await addHistoryEntry(client, row.id, "cadastro", "headset", null, row.lacre, payload.observacoes);
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateHeadset(id, data) {
  await ensureSchema();
  const payload = normalizePayload(data);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const currentResult = await client.query(`SELECT * FROM headsets WHERE id = $1`, [id]);
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const result = await client.query(
      `UPDATE headsets SET
         matricula = $2,
         lacre = $3,
         marca = $4,
         numero_serie = $5,
         status = $6,
         categoria = $7,
         observacoes = $8,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, matricula, lacre, marca, numero_serie, status, categoria, observacoes, created_at, updated_at`,
      [
        id,
        payload.matricula,
        payload.lacre,
        payload.marca,
        payload.numero_serie,
        payload.status,
        payload.categoria,
        payload.observacoes,
      ]
    );
    const updated = result.rows[0];

    const tracked = ["matricula", "lacre", "marca", "numero_serie", "status", "categoria", "observacoes"];
    for (const field of tracked) {
      if ((current[field] ?? null) !== (updated[field] ?? null)) {
        await addHistoryEntry(
          client,
          id,
          "atualizacao",
          field,
          current[field] ?? null,
          updated[field] ?? null,
          payload.observacoes
        );
      }
    }

    await client.query("COMMIT");
    return updated;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function trocarLacre(id, novoLacre, observacao = "") {
  await ensureSchema();
  const lacre = String(novoLacre ?? "").trim();
  if (!lacre) throw failValidation("novo lacre é obrigatório");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const currentResult = await client.query(`SELECT id, lacre FROM headsets WHERE id = $1`, [id]);
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }
    const result = await client.query(
      `UPDATE headsets
       SET lacre = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, matricula, lacre, marca, numero_serie, status, categoria, observacoes, created_at, updated_at`,
      [id, lacre]
    );
    await addHistoryEntry(client, id, "troca_lacre", "lacre", current.lacre, lacre, observacao);
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function swapHeadset(idOriginal, idNovo, novoStatusOriginal, observacao = "") {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Pega dados do original (quem está saindo)
    const originalRes = await client.query(`SELECT * FROM headsets WHERE id = $1`, [idOriginal]);
    const original = originalRes.rows[0];
    if (!original) throw new Error("Headset original não encontrado");

    const matricula = original.matricula;
    if (!matricula) throw new Error("O headset original não possui um operador vinculado");

    // 2. Pega dados do novo (quem está entrando)
    const novoRes = await client.query(`SELECT * FROM headsets WHERE id = $1`, [idNovo]);
    const novo = novoRes.rows[0];
    if (!novo) throw new Error("Novo headset não encontrado");
    if (novo.status !== 'estoque' && novo.status !== 'reserva') {
      throw new Error(`Novo headset deve estar em estoque ou reserva. Status atual: ${novo.status}`);
    }

    // 3. Atualiza o original (vai para defeito, perdido ou furtado e perde a matrícula)
    await client.query(
      `UPDATE headsets SET status = $1, matricula = '', updated_at = NOW() WHERE id = $2`,
      [novoStatusOriginal, idOriginal]
    );
    await addHistoryEntry(client, idOriginal, "troca_saida", "status", original.status, novoStatusOriginal, observacao);
    await addHistoryEntry(client, idOriginal, "troca_saida", "matricula", original.matricula, "", "Troca realizada");

    // 4. Atualiza o novo (recebe a matrícula do operador e muda status para o mesmo do original antes da troca)
    const novoStatusNovo = original.status === 'emprestimo' ? 'emprestimo' : 'em_uso';
    const novaCategoriaNovo = deriveCategoria(novoStatusNovo);

    await client.query(
      `UPDATE headsets SET matricula = $1, status = $2, categoria = $3, updated_at = NOW() WHERE id = $4`,
      [matricula, novoStatusNovo, novaCategoriaNovo, idNovo]
    );
    await addHistoryEntry(client, idNovo, "troca_entrada", "matricula", "", matricula, `Substituindo o lacre ${original.lacre}`);
    await addHistoryEntry(client, idNovo, "troca_entrada", "status", novo.status, novoStatusNovo, "Troca realizada");

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getHeadsetHistorico(id) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT id, headset_id, acao, campo, valor_anterior, valor_novo, observacao, created_at
     FROM headset_historico
     WHERE headset_id = $1
     ORDER BY created_at DESC`,
    [id]
  );
  return result.rows;
}

/** Apaga uma linha; rowCount diz se algo foi removido. */
export async function deleteHeadset(id) {
  await ensureSchema();
  const result = await pool.query(`DELETE FROM headsets WHERE id = $1`, [id]);
  return result.rowCount > 0;
}
