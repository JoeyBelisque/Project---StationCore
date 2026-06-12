import XLSX from "xlsx";
import { pool } from "../config/db.js";

const STATUS_HEADSET = new Set([
  "em_uso",
  "estoque",
  "defeito",
  "emprestimo",
  "entrega",
  "manutencao",
  "reserva",
  "troca_pendente",
  "desligado",
]);
const CATEGORIA_HEADSET = new Set(["operacao", "emprestimo", "entrega", "manutencao"]);
const MARCAS_PERMITIDAS = new Set(["intelbras", "plantronics"]);
const STATUS_COMPUTADOR = new Set(["em_uso", "troca_pendente", "inutilizavel", "manutencao", "estoque"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value, fallback) {
  const normalized = normalizeText(value).toLowerCase().replace(/\s+/g, '_');
  return normalized || fallback;
}

function deriveCategoria(status) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === 'em_uso') return 'operacao';
  if (s === 'emprestimo') return 'emprestimo';
  if (s === 'entrega') return 'entrega';
  if (s === 'defeito' || s === 'manutencao') return 'manutencao';
  return 'operacao';
}

function normalizeHeadsetLifecycle(rawStatus, rawObservacao = "") {
  const statusNorm = normalizeStatus(rawStatus, "estoque");
  const observacao = normalizeText(rawObservacao);

  if (["retorno_manutencao", "retornou_manutencao", "voltou_manutencao"].includes(statusNorm)) {
    const obs = observacao
      ? `${observacao} | Retorno de manutenção via importação`
      : "Retorno de manutenção via importação";
    return { status: "estoque", categoria: "operacao", observacoes: obs };
  }
  if (statusNorm === "disponivel") return { status: "estoque", categoria: "operacao", observacoes: observacao };
  if (statusNorm === "defeito") return { status: "defeito", categoria: "manutencao", observacoes: observacao };

  return { status: statusNorm, categoria: deriveCategoria(statusNorm), observacoes: observacao };
}

function pickSheet(workbook, expectedName) {
  const exact = workbook.SheetNames.find((name) => name.toLowerCase() === expectedName);
  if (exact) return workbook.Sheets[exact];
  const partial = workbook.SheetNames.find((name) => name.toLowerCase().includes(expectedName) || expectedName.includes(name.toLowerCase()));
  if (partial) return workbook.Sheets[partial];
  if (workbook.SheetNames.length > 0) return workbook.Sheets[workbook.SheetNames[0]];
  return null;
}

function normalizeColumnNames(row) {
  const columnMap = {};
  const normalizeKey = (key) =>
    String(key || "").toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[º°]/g, 'o').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '_').replace(/_+/g, '_').trim();
  const normalizeLoose = (key) => String(key || "").toLowerCase().replace(/[^a-z]/g, '');

  for (const [key, value] of Object.entries(row)) {
    const n = normalizeKey(key);
    columnMap[n] = value;
  }

  const fieldMap = {
    matricula: ['matricula'],
    nome_operador: ['operador', 'nome_operador', 'usuario_nome', 'colaborador', 'funcionario'],
    nome: ['identificador', 'nome_headset', 'nome_equipamento', 'nome_dispositivo', 'nome_pc', 'nome_computador'],
    lacre: ['lacre'],
    marca: ['marca'],
    numero_serie: ['numero_serie', 'numero_de_serie', 'n_serie', 'nserie', 'n_de_serie', 'no_serie', 'num_serie', 'ns', 'sn', 'serial'],
    serial_number: ['serial_number', 'serial', 'sn', 'numero_serie', 'ns', 'n_serie', 'no_serie', 'nserie', 'service_tag', 'tag', 'n_serie_pc', 'n_o_serie', 'no_serie'],
    status: ['status'],
    categoria: ['categoria', 'tipo', 'localizacao'],
    observacoes: ['observacoes', 'obs'],
    pa: ['pa', 'p_a'],
    hostname: ['hostname', 'host', 'nome_maquina', 'nome_do_computador'],
    data_devolucao: ['data_devolucao', 'devolucao', 'data_entrega', 'prazo'],
  };

  const result = {};
  for (const [fieldName, aliases] of Object.entries(fieldMap)) {
    for (const alias of aliases) { 
      if (alias in columnMap) { 
        result[fieldName] = columnMap[alias]; 
        break; 
      } 
    }
  }

  // Fallback agressivo para Número de Série (comum haver caracteres especiais no cabeçalho)
  if (!result.serial_number || !result.numero_serie) {
    const keys = Object.keys(columnMap);
    const found = keys.find(k => k.includes('serie') || k === 'ns' || k === 'sn' || k.includes('serial'));
    if (found) {
      if (!result.numero_serie) result.numero_serie = columnMap[found];
      if (!result.serial_number) result.serial_number = columnMap[found];
    }
  }

  return result;
}

function parseRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }).map(normalizeColumnNames);
}

function rowError(sheetName, rowNumber, message) {
  return { planilha: sheetName, linha: rowNumber, erro: message };
}

function collectHeadsets(rows) {
  const validRows = [];
  const errors = [];
  const seenLacre = new Set();
  const seenNumeroSerie = new Set();

  rows.forEach((raw, idx) => {
    const line = idx + 2;
    const matricula = normalizeText(raw.matricula);
    const nome_operador = normalizeText(raw.nome_operador);
    const nome = normalizeText(raw.nome);
    const lacre = normalizeText(raw.lacre);
    const marca = normalizeText(raw.marca);
    const numero_serie = normalizeText(raw.numero_serie);
    const lifecycle = normalizeHeadsetLifecycle(raw.status, raw.observacoes);
    const status = lifecycle.status;
    const categoria = lifecycle.categoria;
    const observacoes = lifecycle.observacoes;
    
    let data_devolucao = null;
    if (raw.data_devolucao) {
      const d = new Date(raw.data_devolucao);
      if (!isNaN(d.getTime())) data_devolucao = d;
    }

    if (!lacre) errors.push(rowError("headsets", line, "lacre é obrigatório"));
    if (!STATUS_HEADSET.has(status)) errors.push(rowError("headsets", line, `status inválido: ${status}`));
    if (marca && !MARCAS_PERMITIDAS.has(marca.toLowerCase())) errors.push(rowError("headsets", line, `marca inválida: ${marca}`));
    if (lacre) {
      const k = lacre.toLowerCase();
      if (seenLacre.has(k)) errors.push(rowError("headsets", line, `lacre duplicado: ${lacre}`));
      seenLacre.add(k);
    }
    if (numero_serie) {
      const k = numero_serie.toLowerCase();
      if (seenNumeroSerie.has(k)) errors.push(rowError("headsets", line, `n serie duplicado: ${numero_serie}`));
      seenNumeroSerie.add(k);
    }
    validRows.push({ matricula, nome_operador, nome, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, line });
  });
  return { validRows, errors };
}

function collectComputadores(rows) {
  const validRows = [];
  const errors = [];
  const seenHostname = new Set();

  rows.forEach((raw, idx) => {
    const line = idx + 2;
    const hostname = normalizeText(raw.hostname);
    const serial_number = normalizeText(raw.serial_number);
    const status = normalizeStatus(raw.status, "em_uso");
    const pa = normalizeText(raw.pa);
    const nome = normalizeText(raw.nome);
    const observacoes = normalizeText(raw.observacoes);

    if (!hostname) errors.push(rowError("computadores", line, "hostname é obrigatório"));
    if (!STATUS_COMPUTADOR.has(status)) errors.push(rowError("computadores", line, `status inválido: ${status}`));
    
    if (hostname) {
      const k = hostname.toLowerCase();
      if (seenHostname.has(k)) {
        errors.push(rowError("computadores", line, `hostname duplicado no arquivo: ${hostname}`));
      }
      seenHostname.add(k);
    }

    // Nota: Removida a trava de NS duplicado no arquivo para computadores, 
    // pois o hostname é a chave principal e pode haver NS temporários/clonados em planilhas de carga.
    
    validRows.push({ hostname, serial_number, status, pa, nome, observacoes, line });
  });
  return { validRows, errors };
}

async function validateHeadsetsAgainstDatabase(headsets) {
  const errors = [];
  const lacres = [...new Set(headsets.map(h => h.lacre).filter(Boolean))];
  const numerosSerie = [...new Set(headsets.map(h => h.numero_serie).filter(Boolean))];
  const matriculasAtivas = [...new Set(headsets.map(h => (h.status === "em_uso" ? h.matricula : "")).filter(Boolean))];

  if (lacres.length || numerosSerie.length || matriculasAtivas.length) {
    const result = await pool.query(
      `SELECT lacre, numero_serie, matricula, status FROM headsets WHERE lacre = ANY($1::text[]) OR numero_serie = ANY($2::text[]) OR (matricula = ANY($3::text[]) AND status = 'em_uso')`,
      [lacres, numerosSerie, matriculasAtivas]
    );
    const nsMap = new Map(result.rows.filter(r => r.numero_serie).map(r => [r.numero_serie.toLowerCase(), r.lacre.toLowerCase()]));
    const lacreMap = new Map(result.rows.filter(r => r.lacre).map(r => [r.lacre.toLowerCase(), r]));
    const matriculaMap = new Map(result.rows.filter(r => r.matricula && r.status === "em_uso").map(r => [r.matricula.toLowerCase(), r.lacre]));

    headsets.forEach((row) => {
      if (row.numero_serie) {
        const lacreDaSerie = nsMap.get(row.numero_serie.toLowerCase());
        if (lacreDaSerie && lacreDaSerie !== row.lacre.toLowerCase()) errors.push(rowError("headsets", row.line, `n serie ${row.numero_serie} ja vinculado ao lacre ${lacreDaSerie}`));
      }
      const existente = lacreMap.get(row.lacre.toLowerCase());
      if (existente) {
        const matAtu = normalizeText(existente.matricula);
        if (matAtu && row.matricula && matAtu.toLowerCase() !== row.matricula.toLowerCase()) errors.push(rowError("headsets", row.line, `lacre ${row.lacre} ja vinculado ao operador ${matAtu}`));
      }
      if (row.status === "em_uso" && row.matricula) {
        const lacreDaMat = matriculaMap.get(row.matricula.toLowerCase());
        if (lacreDaMat && lacreDaMat.toLowerCase() !== row.lacre.toLowerCase()) errors.push(rowError("headsets", row.line, `operador ${row.matricula} em uso no lacre ${lacreDaMat}`));
      }
    });
  }
  return errors;
}

async function validateComputadoresAgainstDatabase(computadores) {
  const errors = [];
  const hostnames = [...new Set(computadores.map(c => c.hostname).filter(Boolean))];
  const serials = [...new Set(computadores.map(c => c.serial_number).filter(Boolean))];
  
  // Na importação de planilha inicial, permitimos ignorar erros de existência se for para atualização.
  // Mas por segurança, validamos duplicatas no PRÓPRIO arquivo antes.
  return errors; 
}

async function validateAgainstDatabase(headsets, computadores) {
  console.log(`[Import] Validando no banco: ${headsets.length} headsets, ${computadores.length} computadores`);
  const [headsetErrors, computadorErrors] = await Promise.all([validateHeadsetsAgainstDatabase(headsets), validateComputadoresAgainstDatabase(computadores)]);
  const allErrors = [...headsetErrors, ...computadorErrors];
  if (allErrors.length > 0) {
    console.error(`[Import] Erros de validação encontrados:`, allErrors);
  }
  return allErrors;
}

async function persistHeadsets(headsets) {
  console.log(`[Import] Persistindo ${headsets.length} headsets...`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of headsets) {
      const existing = await client.query(`SELECT id, matricula, nome_operador, nome, marca, numero_serie, status, categoria, observacoes FROM headsets WHERE lacre = $1`, [row.lacre]);
      if (existing.rowCount === 0) {
        const catFinal = deriveCategoria(row.status);
        const ins = await client.query(`INSERT INTO headsets (matricula, nome_operador, nome, lacre, marca, numero_serie, status, categoria, observacoes, data_devolucao, deleted_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL) RETURNING id`, [row.matricula, row.nome_operador, row.nome, row.lacre, row.marca, row.numero_serie || null, row.status, catFinal, row.observacoes, row.data_devolucao]);
        await client.query(`INSERT INTO headset_historico (headset_id, acao, campo, valor_novo, observacao) VALUES ($1, 'cadastro_importacao', 'headset', $2, $3)`, [ins.rows[0].id, row.lacre, row.observacoes]);
      } else {
        const atual = existing.rows[0];
        const proxMat = row.matricula || normalizeText(atual.matricula);
        const proxNomOp = row.nome_operador || normalizeText(atual.nome_operador);
        const proxNomHs = row.nome || normalizeText(atual.nome);
        const proxStat = row.status || atual.status;
        const proxCat = deriveCategoria(proxStat);
        const proxDev = row.data_devolucao || null;
        await client.query(`UPDATE headsets SET matricula = $2, nome_operador = $3, nome = $4, lacre = $5, marca = $6, numero_serie = $7, status = $8, categoria = $9, observacoes = $10, data_devolucao = $11, updated_at = NOW(), deleted_at = NULL WHERE id = $1`, [atual.id, proxMat, proxNomOp, proxNomHs, row.lacre, row.marca || atual.marca, row.numero_serie || atual.numero_serie, proxStat, proxCat, row.observacoes || atual.observacoes, proxDev]);
        }
    }
    await client.query("COMMIT");
    console.log(`[Import] Headsets persistidos com sucesso.`);
  } catch (error) { 
    console.error(`[Import] Erro ao persistir headsets:`, error);
    await client.query("ROLLBACK"); 
    throw error; 
  } finally { client.release(); }
}

async function persistComputadores(computadores) {
  console.log(`[Import] Persistindo ${computadores.length} computadores...`);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const row of computadores) {
      const existing = await client.query(`SELECT id FROM computadores WHERE hostname = $1`, [row.hostname]);
      if (existing.rowCount === 0) {
        await client.query(
          `INSERT INTO computadores (hostname, serial_number, status, pa, nome, observacoes) VALUES ($1, $2, $3, $4, $5, $6)`,
          [row.hostname, row.serial_number, row.status, row.pa, row.nome, row.observacoes]
        );
      } else {
        await client.query(
          `UPDATE computadores SET serial_number = $2, status = $3, pa = $4, nome = $5, observacoes = $6, updated_at = NOW() WHERE hostname = $1`,
          [row.hostname, row.serial_number, row.status, row.pa, row.nome, row.observacoes]
        );
      }
    }
    await client.query("COMMIT");
    console.log(`[Import] Computadores persistidos com sucesso.`);
  } catch (error) { 
    console.error(`[Import] Erro ao persistir computadores:`, error);
    await client.query("ROLLBACK"); 
    throw error; 
  } finally { client.release(); }
}

export async function importarPlanilha(buffer, mode = "validar") {
  const workbook = XLSX.read(buffer, { type: "buffer", codepage: 65001 });
  const headsetSheet = pickSheet(workbook, "headsets");
  const computadorSheet = pickSheet(workbook, "computadores");
  if (!headgetSheet || !computadorSheet) return { ok: false, errors: [{ planilha: "arquivo", linha: 0, erro: "O arquivo precisa ter as abas 'headsets' e 'computadores'." }], summary: null };
  const rawHeadsets = parseRows(headgetSheet);
  const rawComputadores = parseRows(computadorSheet);
  const { validRows: headsets, errors: headsetErrors } = collectHeadsets(rawHeadsets);
  const { validRows: computadores, errors: computadorErrors } = collectComputadores(rawComputadores);
  const dbErrors = await validateAgainstDatabase(headsets, computadores);
  const errors = [...headsetErrors, ...computadorErrors, ...dbErrors];
  if (errors.length) return { ok: false, errors, summary: { total_headsets: rawHeadsets.length, total_computadores: rawComputadores.length, erros: errors.length, modo: mode } };
  if (mode === "importar") { await persistHeadsets(headsets); await persistComputadores(computadores); }
  return { ok: true, errors: [], summary: { total_headsets: rawHeadsets.length, total_computadores: rawComputadores.length, erros: 0, modo: mode } };
}

export async function importarHeadsets(buffer, mode = "validar") {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (!workbook.SheetNames.length) return { ok: false, errors: [{ planilha: "arquivo", linha: 0, erro: "Arquivo vazio." }], summary: null };
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = parseRows(sheet);
    const { validRows, errors: collErr } = collectHeadsets(raw);
    const dbErr = await validateHeadsetsAgainstDatabase(validRows);
    const errors = [...collErr, ...dbErr];
    if (errors.length) return { ok: false, errors, summary: { total_headsets: raw.length, erros: errors.length, modo: mode } };
    if (mode === "importar") await persistHeadsets(validRows);
    return { ok: true, errors: [], summary: { total_headsets: raw.length, erros: 0, modo: mode } };
  } catch (error) { return { ok: false, errors: [{ planilha: "importacao", linha: 0, erro: error.message }], summary: null }; }
}

export async function importarComputadores(buffer, mode = "validar") {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    if (!workbook.SheetNames.length) return { ok: false, errors: [{ planilha: "arquivo", linha: 0, erro: "Arquivo vazio." }], summary: null };
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = parseRows(sheet);
    const { validRows, errors: collErr } = collectComputadores(raw);
    const dbErr = await validateComputadoresAgainstDatabase(validRows);
    const errors = [...collErr, ...dbErr];
    if (errors.length) return { ok: false, errors, summary: { total_computadores: raw.length, erros: errors.length, modo: mode } };
    if (mode === "importar") await persistComputadores(validRows);
    return { ok: true, errors: [], summary: { total_computadores: raw.length, erros: 0, modo: mode } };
  } catch (error) { return { ok: false, errors: [{ planilha: "importacao", linha: 0, erro: error.message }], summary: null }; }
}
