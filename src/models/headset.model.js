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
      ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'operacao',
      ADD COLUMN IF NOT EXISTS nome TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS nome_operador TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS data_devolucao TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS data_envio_manutencao TIMESTAMPTZ;
  `);
  // Garantir que registros legados com 'estoque' na categoria sejam migrados (redundante com migration, mas seguro)
  await pool.query("UPDATE headsets SET categoria = 'operacao' WHERE categoria = 'estoque'");
  
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

function normalizePayload(data) {
  let status = String(data?.status ?? "estoque").trim() || "estoque";
  let categoria = String(data?.categoria ?? "operacao").trim() || "operacao";
  const matricula = String(data?.matricula ?? "").trim();
  const nome_operador = String(data?.nome_operador ?? "").trim();
  
  // Compatibilidade com valor antigo 'estoque' para categoria
  if (categoria === "estoque") categoria = "operacao";

  // REGRA DE OURO: Consistência de Dados
  // 1. Se informou matrícula ou nome de operador, o status NÃO PODE ser 'estoque' ou 'reserva'
  if (matricula || nome_operador) {
    if (status === "estoque" || status === "reserva") {
      // Se for um headset de empréstimo, o status correto é 'emprestimo'
      // Caso contrário, é um headset de operação comum, status 'em_uso'
      status = (categoria === "emprestimo") ? "emprestimo" : "em_uso";
    }

    // Se tem operador vinculado, a finalidade deve ser Operação,
    // a menos que já tenha sido definido explicitamente como Empréstimo.
    if (categoria !== "emprestimo") {
      categoria = "operacao";
    }
  }

  // 2. Se o status for 'estoque', 'reserva', 'defeito', 'manutencao' ou 'perdido', limpamos o operador por segurança
  const statusSemOperador = ["estoque", "reserva", "defeito", "manutencao", "perdido", "furtado"];
  const finalMatricula = statusSemOperador.includes(status) ? "" : matricula;
  const finalNomeOperador = statusSemOperador.includes(status) ? "" : nome_operador;

  // 3. Limpeza de datas temporárias se voltar para estoque
  const isAvailable = status === "estoque" || status === "reserva";
  const finalDataDevolucao = isAvailable ? null : (data?.data_devolucao ? new Date(data.data_devolucao) : null);
  const finalDataEnvioManutencao = status === "manutencao" ? (data?.data_envio_manutencao ? new Date(data.data_envio_manutencao) : new Date()) : (isAvailable ? null : (data?.data_envio_manutencao ? new Date(data.data_envio_manutencao) : null));

  return {
    nome: String(data?.nome ?? "").trim(),
    nome_operador: finalNomeOperador,
    matricula: finalMatricula,
    lacre: String(data?.lacre ?? "").trim(),
    marca: normalizeMarca(data?.marca),
    numero_serie: normalizeNumeroSerie(data?.numero_serie),
    status,
    categoria,
    observacoes: String(data?.observacoes ?? "").trim(),
    data_devolucao: finalDataDevolucao,
    data_envio_manutencao: finalDataEnvioManutencao,
  };
}

export async function addHistoryEntry(client, headsetId, acao, campo, valorAnterior, valorNovo, observacao = "") {
  const poolClient = client || pool;
  await poolClient.query(
    `INSERT INTO headset_historico (headset_id, acao, campo, valor_anterior, valor_novo, observacao)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      headsetId,
      acao,
      campo,
      valorAnterior == null || valorAnterior === "" ? null : String(valorAnterior),
      valorNovo == null || valorNovo === "" ? null : String(valorNovo),
      observacao,
    ]
  );
}

/** Lista headsets; ORDER BY updated_at DESC = mais recentes primeiro. */
export async function getHeadsets() {
  await ensureSchema();
  const result = await pool.query(
    `SELECT id, nome, nome_operador, matricula, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, data_envio_manutencao, created_at, updated_at
     FROM headsets
     WHERE deleted_at IS NULL
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
      `INSERT INTO headsets (nome, nome_operador, matricula, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, data_envio_manutencao)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, nome, nome_operador, matricula, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, data_envio_manutencao, created_at, updated_at`,
      [
        payload.nome,
        payload.nome_operador,
        payload.matricula,
        payload.lacre,
        payload.marca,
        payload.numero_serie,
        payload.status,
        payload.categoria,
        payload.observacoes,
        payload.data_devolucao,
        payload.data_envio_manutencao,
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
         nome = $2,
         nome_operador = $3,
         matricula = $4,
         lacre = $5,
         marca = $6,
         numero_serie = $7,
         status = $8,
         categoria = $9,
         observacoes = $10,
         data_devolucao = $11,
         data_envio_manutencao = $12,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, nome, nome_operador, matricula, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, data_envio_manutencao, created_at, updated_at`,
      [
        id,
        payload.nome,
        payload.nome_operador,
        payload.matricula,
        payload.lacre,
        payload.marca,
        payload.numero_serie,
        payload.status,
        payload.categoria,
        payload.observacoes,
        payload.data_devolucao,
        payload.data_envio_manutencao,
      ]
    );
    const updated = result.rows[0];

    const tracked = ["nome", "nome_operador", "matricula", "lacre", "marca", "numero_serie", "status", "categoria", "observacoes", "data_devolucao", "data_envio_manutencao"];
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
       RETURNING id, nome, nome_operador, matricula, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, data_envio_manutencao, created_at, updated_at`,
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
    const nomeOperador = original.nome_operador;
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
      `UPDATE headsets SET status = $1, matricula = '', nome_operador = '', data_devolucao = NULL, updated_at = NOW() WHERE id = $2`,
      [novoStatusOriginal, idOriginal]
    );
    await addHistoryEntry(client, idOriginal, "troca_saida", "status", original.status, novoStatusOriginal, observacao);
    await addHistoryEntry(client, idOriginal, "troca_saida", "matricula", original.matricula, "", "Troca realizada");
    await addHistoryEntry(client, idOriginal, "troca_saida", "nome_operador", original.nome_operador, "", "Troca realizada");

    // 4. Atualiza o novo (recebe a matrícula do operador e muda status para o mesmo do original antes da troca)
    const novoStatusNovo = original.status === 'emprestimo' ? 'emprestimo' : 'em_uso';

    await client.query(
      `UPDATE headsets SET matricula = $1, nome_operador = $2, status = $3, data_devolucao = $4, updated_at = NOW() WHERE id = $5`,
      [matricula, nomeOperador, novoStatusNovo, original.data_devolucao, idNovo]
    );
    await addHistoryEntry(client, idNovo, "troca_entrada", "matricula", "", matricula, `Substituindo o lacre ${original.lacre}`);
    await addHistoryEntry(client, idNovo, "troca_entrada", "nome_operador", "", nomeOperador, "Troca realizada");
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

export async function desligamentoPorMatricula(matricula, observacao = "") {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Busca todos os headsets vinculados a essa matrícula
    const res = await client.query(
      `SELECT * FROM headsets WHERE matricula = $1`,
      [matricula]
    );
    
    if (res.rows.length === 0) {
      throw new Error(`Nenhum equipamento encontrado para a matrícula ${matricula}`);
    }

    const dataHora = new Date().toLocaleString("pt-BR");
    const logBase = `[DESLIGAMENTO] ${dataHora}: ${observacao}`.trim();

    for (const h of res.rows) {
      await client.query(
        `UPDATE headsets SET 
          status = 'estoque', 
          matricula = '', 
          nome_operador = '', 
          data_devolucao = NULL,
          data_envio_manutencao = NULL,
          updated_at = NOW() 
        WHERE id = $1`,
        [h.id]
      );

      await addHistoryEntry(client, h.id, "desligamento", "status", h.status, "estoque", logBase);
      await addHistoryEntry(client, h.id, "desligamento", "matricula", h.matricula, "", logBase);
      await addHistoryEntry(client, h.id, "desligamento", "nome_operador", h.nome_operador, "", logBase);
    }

    await client.query("COMMIT");
    return { count: res.rows.length };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
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

export async function getGlobalHistorico(limit = 10) {
  await ensureSchema();
  const result = await pool.query(
    `SELECT h.id, h.headset_id, h.acao, h.campo, h.valor_anterior, h.valor_novo, h.observacao, h.created_at, hs.lacre
     FROM headset_historico h
     JOIN headsets hs ON h.headset_id = hs.id
     ORDER BY h.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
}

/** Apaga uma linha de forma lógica; rowCount diz se algo foi removido. */
export async function deleteHeadset(id) {
  await ensureSchema();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    // 1. Pega o lacre para o log
    const hsRes = await client.query(`SELECT lacre FROM headsets WHERE id = $1`, [id]);
    const hs = hsRes.rows[0];
    
    if (hs) {
      // 2. Registra na auditoria ANTES de marcar como deletado
      await addHistoryEntry(client, id, "exclusao", "headset", hs.lacre, null, "Registro excluído (soft-delete)");
      
      // 3. Soft delete (marca com a data atual)
      await client.query(`UPDATE headsets SET deleted_at = NOW() WHERE id = $1`, [id]);
    }

    await client.query("COMMIT");
    return !!hs;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateBatch(ids, data) {
  await ensureSchema();
  if (!Array.isArray(ids) || ids.length === 0) return { success: false, updated: 0 };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let count = 0;

    const status = data.status ? String(data.status).trim() : null;
    const statusSemOperador = ["estoque", "reserva", "defeito", "manutencao", "perdido", "furtado", "desligado"];
    const isClearingOperador = status && statusSemOperador.includes(status);
    const isSendingToMaint = status === "manutencao";
    const isReturningToStock = status === "estoque" || status === "reserva";
    const observacoesAdd = data.observacoes ? String(data.observacoes).trim() : "";

    function deriveCategoriaFromStatus(s) {
      if (s === "em_uso") return "operacao";
      if (s === "emprestimo") return "emprestimo";
      if (s === "entrega") return "entrega";
      if (s === "defeito" || s === "manutencao") return "manutencao";
      return "operacao";
    }

    for (const id of ids) {
      const currentRes = await client.query(`SELECT * FROM headsets WHERE id = $1`, [id]);
      if (currentRes.rowCount === 0) continue;
      const current = currentRes.rows[0];

      const nextStatus = status || current.status;
      const nextMatricula = isClearingOperador ? "" : current.matricula;
      const nextNomeOperador = isClearingOperador ? "" : current.nome_operador;
      const nextCategoria = status ? deriveCategoriaFromStatus(nextStatus) : current.categoria;
      const nextMaintDate = isSendingToMaint
        ? (current.data_envio_manutencao || new Date())
        : (isReturningToStock ? null : current.data_envio_manutencao);
      const nextLoanDate = isReturningToStock || isClearingOperador ? null : current.data_devolucao;

      const nextObs = observacoesAdd
        ? (current.observacoes ? `${current.observacoes}\n${observacoesAdd}` : observacoesAdd)
        : current.observacoes;

      await client.query(
        `UPDATE headsets SET status = $1, categoria = $2, observacoes = $3, matricula = $4, nome_operador = $5, data_envio_manutencao = $6, data_devolucao = $7, updated_at = NOW() WHERE id = $8`,
        [nextStatus, nextCategoria, nextObs, nextMatricula, nextNomeOperador, nextMaintDate, nextLoanDate, id]
      );

      if (status && status !== current.status) {
        await addHistoryEntry(client, id, "atualizacao_lote", "status", current.status, status, "Atualização em lote");
      }
      if (nextMatricula !== current.matricula) {
        await addHistoryEntry(client, id, "atualizacao_lote", "matricula", current.matricula, nextMatricula, "Atualização em lote");
      }
      if (nextNomeOperador !== current.nome_operador) {
        await addHistoryEntry(client, id, "atualizacao_lote", "nome_operador", current.nome_operador, nextNomeOperador, "Atualização em lote");
      }

      count++;
    }

    await client.query("COMMIT");
    return { success: true, updated: count };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
