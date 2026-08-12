import { pool } from "../config/db.js";

const STATUS_VALIDOS = new Set(["aguardando_devolucao", "devolvido", "cancelado"]);

function failValidation(message) {
  const error = new Error(message);
  error.code = "VALIDATION";
  return error;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizePayload(data = {}) {
  const status = normalizeText(data.status) || "aguardando_devolucao";
  if (!STATUS_VALIDOS.has(status)) throw failValidation("status de achado invalido");

  return {
    headset_id: normalizeText(data.headset_id) || null,
    lacre: normalizeText(data.lacre),
    numero_serie: normalizeText(data.numero_serie),
    marca: normalizeText(data.marca).toLowerCase(),
    status,
    localizacao: normalizeText(data.localizacao),
    encontrado_por: normalizeText(data.encontrado_por),
    chamado: normalizeText(data.chamado),
    encontrado_em: data.encontrado_em ? new Date(data.encontrado_em) : new Date(),
    devolvido_em: data.devolvido_em ? new Date(data.devolvido_em) : null,
    devolvido_para: normalizeText(data.devolvido_para),
    observacoes: normalizeText(data.observacoes),
  };
}

export async function listarAchados(status = "") {
  const values = [];
  const where = status && STATUS_VALIDOS.has(status) ? "WHERE a.status = $1" : "";
  if (where) values.push(status);

  const result = await pool.query(
    `SELECT a.*, h.nome AS headset_nome, h.status AS headset_status
     FROM headset_achados_perdidos a
     LEFT JOIN headsets h ON h.id = a.headset_id
     ${where}
     ORDER BY a.encontrado_em DESC`,
    values
  );
  return result.rows;
}

export async function listarAchadosPorLacre(lacre) {
  const result = await pool.query(
    `SELECT a.*, h.nome AS headset_nome, h.status AS headset_status
     FROM headset_achados_perdidos a
     LEFT JOIN headsets h ON h.id = a.headset_id
     WHERE lower(a.lacre) = lower($1)
     ORDER BY a.encontrado_em DESC`,
    [normalizeText(lacre)]
  );
  return result.rows;
}

export async function criarAchado(data) {
  const payload = normalizePayload(data);
  if (!payload.lacre && !payload.numero_serie) {
    throw failValidation("informe o lacre ou o numero de serie");
  }
  if (!payload.localizacao) throw failValidation("informe onde o headset esta guardado");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let headsetId = payload.headset_id;
    if (!headsetId && payload.lacre) {
      const found = await client.query(
        "SELECT id FROM headsets WHERE lower(lacre) = lower($1) AND deleted_at IS NULL LIMIT 1",
        [payload.lacre]
      );
      headsetId = found.rows[0]?.id || null;
    }

    const result = await client.query(
      `INSERT INTO headset_achados_perdidos
       (headset_id, lacre, numero_serie, marca, status, localizacao, encontrado_por, chamado, encontrado_em, devolvido_em, devolvido_para, observacoes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [headsetId, payload.lacre, payload.numero_serie, payload.marca, payload.status, payload.localizacao, payload.encontrado_por, payload.chamado, payload.encontrado_em, payload.devolvido_em, payload.devolvido_para, payload.observacoes]
    );
    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function atualizarAchado(id, data) {
  const payload = normalizePayload(data);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const currentResult = await client.query("SELECT * FROM headset_achados_perdidos WHERE id = $1 FOR UPDATE", [id]);
    const current = currentResult.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    let headsetId = payload.headset_id || current.headset_id;
    if (!headsetId && payload.lacre) {
      const found = await client.query(
        "SELECT id FROM headsets WHERE lower(lacre) = lower($1) AND deleted_at IS NULL LIMIT 1",
        [payload.lacre]
      );
      headsetId = found.rows[0]?.id || null;
    }

    const result = await client.query(
      `UPDATE headset_achados_perdidos SET
       headset_id = $2, lacre = $3, numero_serie = $4, marca = $5, status = $6,
       localizacao = $7, encontrado_por = $8, chamado = $9, encontrado_em = $10,
       devolvido_em = $11, devolvido_para = $12, observacoes = $13, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, headsetId, payload.lacre, payload.numero_serie, payload.marca, payload.status, payload.localizacao, payload.encontrado_por, payload.chamado, payload.encontrado_em, payload.devolvido_em, payload.devolvido_para, payload.observacoes]
    );

    if (payload.status === "devolvido" && headsetId) {
      const headset = await client.query("SELECT * FROM headsets WHERE id = $1 FOR UPDATE", [headsetId]);
      if (headset.rows[0]) {
        await client.query(
          `UPDATE headsets SET status = 'estoque', matricula = '', nome_operador = '', data_devolucao = NULL, updated_at = NOW() WHERE id = $1`,
          [headsetId]
        );
        await client.query(
          `INSERT INTO headset_historico (headset_id, acao, campo, valor_anterior, valor_novo, observacao)
           VALUES ($1, 'achado_devolvido', 'status', $2, 'estoque', $3)`,
          [headsetId, headset.rows[0].status, `Achado devolvido para ${payload.devolvido_para || "estoque"}`]
        );
      }
    }

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
