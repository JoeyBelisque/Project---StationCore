/**
 * Model = camada que fala com a base de dados (SQL).
 * Alinhado ao padrão de Auditoria (History) e consistência do Headset.
 */
import { pool } from "../config/db.js";

let schemaEnsured = false;

async function ensureSchema() {
  if (schemaEnsured) return;
  await pool.query(`
    ALTER TABLE computadores
      ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS observacoes TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS computador_historico (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      computador_id INTEGER NOT NULL REFERENCES computadores(id) ON DELETE CASCADE,
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

async function addHistoryEntry(client, pcId, acao, campo, valorAnterior, valorNovo, observacao = "") {
  await client.query(
    `INSERT INTO computador_historico (computador_id, acao, campo, valor_anterior, valor_novo, observacao)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      pcId,
      acao,
      campo,
      valorAnterior == null || valorAnterior === "" ? null : String(valorAnterior),
      valorNovo == null || valorNovo === "" ? null : String(valorNovo),
      observacao,
    ]
  );
}

export const getComputadores = async () => {
  await ensureSchema();
  const result = await pool.query("SELECT * FROM computadores WHERE deleted_at IS NULL ORDER BY updated_at DESC");
  return result.rows;
};

export const createComputador = async (data) => {
  await ensureSchema();
  const { hostname, serial_number, status, pa, nome, observacoes } = data;
  
  // Consistência: Se estoque/inutilizavel/perdido/furtado, limpa PA
  const isAvailable = status === "estoque" || status === "inutilizavel" || status === "perdido" || status === "furtado";
  const finalPa = isAvailable ? "" : (pa || "");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `INSERT INTO computadores (hostname, serial_number, status, pa, nome, observacoes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [hostname, serial_number, status, finalPa, nome || "", observacoes || ""]
    );
    const row = result.rows[0];
    await addHistoryEntry(client, row.id, "cadastro", "computador", null, row.hostname, observacoes || "");
    await client.query("COMMIT");
    return row;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateComputador = async (id, data) => {
  await ensureSchema();
  const { hostname, serial_number, status, pa, nome, observacoes } = data;

  // Consistência: Se estoque/inutilizavel/perdido/furtado, limpa PA
  const isAvailable = status === "estoque" || status === "inutilizavel" || status === "perdido" || status === "furtado";
  const finalPa = isAvailable ? "" : (pa || "");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const currentRes = await client.query(`SELECT * FROM computadores WHERE id = $1`, [id]);
    const current = currentRes.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const result = await client.query(
      `UPDATE computadores SET 
         hostname = $1, 
         serial_number = $2, 
         status = $3, 
         pa = $4, 
         nome = $5, 
         observacoes = $6, 
         updated_at = NOW() 
       WHERE id = $7 RETURNING *`,
      [hostname, serial_number, status, finalPa, nome || "", observacoes || "", id]
    );
    const updated = result.rows[0];

    const tracked = ["hostname", "serial_number", "status", "pa", "nome", "observacoes"];
    for (const field of tracked) {
      const v1 = current[field] instanceof Date ? current[field].getTime() : (current[field] ?? null);
      const v2 = updated[field] instanceof Date ? updated[field].getTime() : (updated[field] ?? null);

      if (v1 !== v2) {
        await addHistoryEntry(
          client,
          id,
          "atualizacao",
          field,
          current[field] ?? null,
          updated[field] ?? null,
          observacoes || ""
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
};

export const swapComputador = async (idOriginal, idNovo, novoStatusOriginal, observacao = "") => {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Pega dados do original (quem está saindo)
    const originalRes = await client.query(`SELECT * FROM computadores WHERE id = $1`, [idOriginal]);
    const original = originalRes.rows[0];
    if (!original) throw new Error("Computador original não encontrado");

    const pa = original.pa;
    if (!pa) throw new Error("O computador original não possui uma PA vinculada");

    // 2. Pega dados do novo (quem está entrando)
    const novoRes = await client.query(`SELECT * FROM computadores WHERE id = $1`, [idNovo]);
    const novo = novoRes.rows[0];
    if (!novo) throw new Error("Novo computador não encontrado");

    // 3. Atualiza o original (vai para manutenção ou defeito e perde a PA)
    await client.query(
      `UPDATE computadores SET status = $1, pa = '', updated_at = NOW() WHERE id = $2`,
      [novoStatusOriginal, idOriginal]
    );
    await addHistoryEntry(client, idOriginal, "troca_saida", "status", original.status, novoStatusOriginal, observacao);
    await addHistoryEntry(client, idOriginal, "troca_saida", "pa", original.pa, "", "Troca realizada");

    // 4. Atualiza o novo (recebe a PA e muda status para em_uso)
    await client.query(
      `UPDATE computadores SET pa = $1, status = 'em_uso', updated_at = NOW() WHERE id = $2`,
      [pa, idNovo]
    );
    await addHistoryEntry(client, idNovo, "troca_entrada", "pa", novo.pa, pa, `Substituindo o PC ${original.hostname}`);
    await addHistoryEntry(client, idNovo, "troca_entrada", "status", novo.status, 'em_uso', "Troca realizada");

    await client.query("COMMIT");
    return { success: true };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const getComputadorHistorico = async (id) => {
  await ensureSchema();
  const result = await pool.query(
    `SELECT * FROM computador_historico WHERE computador_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  return result.rows;
};

export const deleteComputador = async (id) => {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Pega o hostname para o log
    const pcRes = await client.query(`SELECT hostname FROM computadores WHERE id = $1`, [id]);
    const pc = pcRes.rows[0];
    
    if (pc) {
      // 2. Registra na auditoria ANTES de marcar como deletado
      await addHistoryEntry(client, id, "exclusao", "computador", pc.hostname, null, "Registro excluído (soft-delete)");
      
      // 3. Soft delete (marca com a data atual) e limpa PA
      await client.query(`UPDATE computadores SET deleted_at = NOW(), pa = '' WHERE id = $1`, [id]);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
