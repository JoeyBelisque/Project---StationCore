import XLSX from "xlsx";
import { pool } from "../config/db.js";

const STATUS_HEADSET = new Set(["em_uso", "reserva", "troca_pendente", "desligado"]);
const STATUS_COMPUTADOR = new Set(["em_uso", "troca_pendente", "inutilizavel", "manutencao", "estoque"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value, fallback) {
  // Padroniza para o formato persistido no banco (ex.: "Em uso" -> "em_uso").
  const normalized = normalizeText(value).toLowerCase().replace(/\s+/g, '_');
  return normalized || fallback;
}

function pickSheet(workbook, expectedName) {
  // Primeiro tenta buscar exatamente
  const exact = workbook.SheetNames.find((name) => name.toLowerCase() === expectedName);
  if (exact) return workbook.Sheets[exact];
  
  // Se não encontrar, tenta buscar parcialmente (começa com o nome)
  const partial = workbook.SheetNames.find((name) => 
    name.toLowerCase().includes(expectedName) || expectedName.includes(name.toLowerCase())
  );
  if (partial) {
    console.log(`[IMPORT] Aba '${expectedName}' não encontrada, usando '${partial}' em seu lugar`);
    return workbook.Sheets[partial];
  }
  
  // Se ainda não encontrar, retorna a primeira aba
  if (workbook.SheetNames.length > 0) {
    const first = workbook.SheetNames[0];
    console.log(`[IMPORT] Aba '${expectedName}' não encontrada, usando primeira aba: '${first}'`);
    return workbook.Sheets[first];
  }
  
  return null;
}

function normalizeColumnNames(row) {
  // Cria um mapa de coluna original → valor, com chaves normalizadas
  const columnMap = {};
  
  for (const [key, value] of Object.entries(row)) {
    // Normaliza: lowercase, remove acentos, espaços extras
    const normalized = key
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s]/g, '') // Remove caracteres especiais (mantém apenas letras, números, underscores)
      .replace(/\s+/g, '_') // Espaços vira underline
      .replace(/_+/g, '_'); // Multiple underscores viram um
    
    columnMap[normalized] = value;
  }

  // Mapeia os nomes conhecidos para os campos esperados
  const fieldMap = {
    'matricula':     ['matricula', 'matricula'],
    'lacre':         ['lacre'],
    'marca':         ['marca'],
    'numero_serie':  ['numero_serie', 'n_serie', 'no_serie', 'num_serie', 'ns'],
    'serial_number': ['serial_number', 'serial', 'sn'],
    'status':        ['status'],
    'observacoes':   ['observacoes', 'obs'],
    'pa':            ['pa', 'p_a'],
    'hostname':      ['hostname', 'host'],
  };

  // Agrupa valores pelos campos esperados
  const result = {};
  for (const [fieldName, aliases] of Object.entries(fieldMap)) {
    for (const alias of aliases) {
      if (alias in columnMap) {
        result[fieldName] = columnMap[alias];
        break;
      }
    }
  }

  // Adiciona qualquer campo extra que não foi mapeado
  for (const [normalized, value] of Object.entries(columnMap)) {
    if (!Object.values(fieldMap).flat().includes(normalized)) {
      result[normalized] = value;
    }
  }

  return result;
}

function parseRows(sheet) {
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return rows.map(normalizeColumnNames);
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
    const lacre = normalizeText(raw.lacre);
    const marca = normalizeText(raw.marca);
    const numero_serie = normalizeText(raw.numero_serie);
    const status = normalizeStatus(raw.status, "em_uso");
    const observacoes = normalizeText(raw.observacoes);

    if (!matricula) errors.push(rowError("headsets", line, "matricula é obrigatória"));
    if (!lacre) errors.push(rowError("headsets", line, "lacre é obrigatório"));
    if (!STATUS_HEADSET.has(status)) {
      errors.push(rowError("headsets", line, `status inválido: ${status}`));
    }
    if (lacre) {
      const k = lacre.toLowerCase();
      if (seenLacre.has(k)) errors.push(rowError("headsets", line, `lacre duplicado no arquivo: ${lacre}`));
      seenLacre.add(k);
    }
    if (numero_serie) {
      const k = numero_serie.toLowerCase();
      if (seenNumeroSerie.has(k)) {
        errors.push(rowError("headsets", line, `numero_serie duplicado no arquivo: ${numero_serie}`));
      }
      seenNumeroSerie.add(k);
    }

    validRows.push({ matricula, lacre, marca, numero_serie, status, observacoes, line });
  });

  return { validRows, errors };
}

function collectComputadores(rows) {
  const validRows = [];
  const errors = [];
  const seenHostname = new Set();
  const seenSerial = new Set();

  rows.forEach((raw, idx) => {
    const line = idx + 2;
    const hostname = normalizeText(raw.hostname);
    const serial_number = normalizeText(raw.serial_number);
    const status = normalizeStatus(raw.status, "em_uso");
    const pa = normalizeText(raw.pa);

    if (!hostname) errors.push(rowError("computadores", line, "hostname é obrigatório"));
    if (!STATUS_COMPUTADOR.has(status)) {
      errors.push(rowError("computadores", line, `status inválido: ${status}`));
    }
    if (hostname) {
      const k = hostname.toLowerCase();
      if (seenHostname.has(k)) {
        errors.push(rowError("computadores", line, `hostname duplicado no arquivo: ${hostname}`));
      }
      seenHostname.add(k);
    }
    if (serial_number) {
      const k = serial_number.toLowerCase();
      if (seenSerial.has(k)) {
        errors.push(rowError("computadores", line, `serial_number duplicado no arquivo: ${serial_number}`));
      }
      seenSerial.add(k);
    }

    validRows.push({ hostname, serial_number, status, pa, line });
  });

  return { validRows, errors };
}

async function validateHeadsetsAgainstDatabase(headsets) {
  const errors = [];

  const lacres = [...new Set(headsets.map((h) => h.lacre).filter(Boolean))];
  const numerosSerie = [...new Set(headsets.map((h) => h.numero_serie).filter(Boolean))];

  if (lacres.length || numerosSerie.length) {
    const result = await pool.query(
      `
        SELECT lacre, numero_serie
        FROM headsets
        WHERE (cardinality($1::text[]) > 0 AND lacre = ANY($1::text[]))
           OR (cardinality($2::text[]) > 0 AND numero_serie = ANY($2::text[]))
      `,
      [lacres, numerosSerie]
    );
    const lacresDb = new Set(result.rows.map((r) => normalizeText(r.lacre).toLowerCase()).filter(Boolean));
    const nsDb = new Set(result.rows.map((r) => normalizeText(r.numero_serie).toLowerCase()).filter(Boolean));
    headsets.forEach((row) => {
      if (row.lacre && lacresDb.has(row.lacre.toLowerCase())) {
        errors.push(rowError("headsets", row.line, `lacre já existe no banco: ${row.lacre}`));
      }
      if (row.numero_serie && nsDb.has(row.numero_serie.toLowerCase())) {
        errors.push(rowError("headsets", row.line, `numero_serie já existe no banco: ${row.numero_serie}`));
      }
    });
  }

  return errors;
}

async function validateComputadoresAgainstDatabase(computadores) {
  const errors = [];

  const hostnames = [...new Set(computadores.map((c) => c.hostname).filter(Boolean))];
  const serials = [...new Set(computadores.map((c) => c.serial_number).filter(Boolean))];

  if (hostnames.length || serials.length) {
    const result = await pool.query(
      `
        SELECT hostname, serial_number
        FROM computadores
        WHERE (cardinality($1::text[]) > 0 AND hostname = ANY($1::text[]))
           OR (cardinality($2::text[]) > 0 AND serial_number = ANY($2::text[]))
      `,
      [hostnames, serials]
    );
    const hostDb = new Set(result.rows.map((r) => normalizeText(r.hostname).toLowerCase()).filter(Boolean));
    const serialDb = new Set(result.rows.map((r) => normalizeText(r.serial_number).toLowerCase()).filter(Boolean));
    computadores.forEach((row) => {
      if (row.hostname && hostDb.has(row.hostname.toLowerCase())) {
        errors.push(rowError("computadores", row.line, `hostname já existe no banco: ${row.hostname}`));
      }
      if (row.serial_number && serialDb.has(row.serial_number.toLowerCase())) {
        errors.push(rowError("computadores", row.line, `serial_number já existe no banco: ${row.serial_number}`));
      }
    });
  }

  return errors;
}

async function validateAgainstDatabase(headsets, computadores) {
  // Mantém o fluxo "importar planilha completa" consistente:
  // valida headsets e computadores antes de tentar persistir qualquer item.
  const [headsetErrors, computadorErrors] = await Promise.all([
    validateHeadsetsAgainstDatabase(headsets),
    validateComputadoresAgainstDatabase(computadores),
  ]);
  return [...headsetErrors, ...computadorErrors];
}

async function persistHeadsets(headsets) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of headsets) {
      await client.query(
        `
          INSERT INTO headsets (matricula, lacre, marca, numero_serie, status, observacoes)
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [row.matricula, row.lacre, row.marca, row.numero_serie, row.status, row.observacoes]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function persistComputadores(computadores) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of computadores) {
      await client.query(
        `
          INSERT INTO computadores (hostname, serial_number, status, pa)
          VALUES ($1, $2, $3, $4)
        `,
        [row.hostname, row.serial_number, row.status, row.pa]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function importarPlanilha(buffer, mode = "validar") {
  // Fluxo legado para arquivo completo com duas abas ("headsets" e "computadores").
  const workbook = XLSX.read(buffer, { type: "buffer" });

  const headsetSheet = pickSheet(workbook, "headsets");
  const computadorSheet = pickSheet(workbook, "computadores");
  if (!headsetSheet || !computadorSheet) {
    return {
      ok: false,
      errors: [
        {
          planilha: "arquivo",
          linha: 0,
          erro: "O arquivo precisa ter as abas 'headsets' e 'computadores'.",
        },
      ],
      summary: null,
    };
  }

  const rawHeadsets = parseRows(headsetSheet);
  const rawComputadores = parseRows(computadorSheet);

  const { validRows: headsets, errors: headsetErrors } = collectHeadsets(rawHeadsets);
  const { validRows: computadores, errors: computadorErrors } = collectComputadores(rawComputadores);

  const dbErrors = await validateAgainstDatabase(headsets, computadores);
  const errors = [...headsetErrors, ...computadorErrors, ...dbErrors];
  const summary = {
    total_headsets: rawHeadsets.length,
    total_computadores: rawComputadores.length,
    erros: errors.length,
    modo: mode,
  };

  if (errors.length) {
    return { ok: false, errors, summary };
  }

  if (mode === "importar") {
    await persistHeadsets(headsets);
    await persistComputadores(computadores);
  }

  return { ok: true, errors: [], summary };
}

export async function importarHeadsets(buffer, mode = "validar") {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    // Usa a primeira aba disponível
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        ok: false,
        errors: [
          {
            planilha: "arquivo",
            linha: 0,
            erro: "Arquivo Excel vazio ou inválido.",
          },
        ],
        summary: null,
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    console.log(`[IMPORT HEADSETS] Usando aba: '${firstSheetName}'`);
    
    const headsetSheet = workbook.Sheets[firstSheetName];

    const rawHeadsets = parseRows(headsetSheet);
    console.log(`[IMPORT HEADSETS] Lidos ${rawHeadsets.length} headsets da planilha`);
    
    if (rawHeadsets.length === 0) {
      return {
        ok: false,
        errors: [
          {
            planilha: firstSheetName,
            linha: 0,
            erro: "Nenhum dado encontrado na planilha.",
          },
        ],
        summary: null,
      };
    }
    
    // Logar apenas a primeira linha ajuda a diagnosticar cabeçalhos fora do padrão.
    console.log(`[IMPORT HEADSETS] Primeira linha:`, JSON.stringify(rawHeadsets[0], null, 2));

    const { validRows: headsets, errors: headsetErrors } = collectHeadsets(rawHeadsets);
    console.log(`[IMPORT HEADSETS] Após coleta: ${headsets.length} válidos, ${headsetErrors.length} erros`);

    const dbErrors = await validateHeadsetsAgainstDatabase(headsets);
    console.log(`[IMPORT HEADSETS] Após validação DB: ${dbErrors.length} novos erros`);

    const errors = [...headsetErrors, ...dbErrors];
    const summary = {
      total_headsets: rawHeadsets.length,
      erros: errors.length,
      modo: mode,
    };

    if (errors.length) {
      console.log(`[IMPORT HEADSETS] Errors encontrados:`, errors);
      return { ok: false, errors, summary };
    }

    if (mode === "importar") {
      await persistHeadsets(headsets);
      console.log(`[IMPORT HEADSETS] Importação concluída: ${headsets.length} registros`);
    }

    return { ok: true, errors: [], summary };
  } catch (error) {
    console.error("[IMPORT HEADSETS] ERRO:", error);
    return {
      ok: false,
      errors: [
        {
          planilha: "importacao",
          linha: 0,
          erro: `Erro ao processar: ${error.message}`,
        },
      ],
      summary: null,
    };
  }
}

export async function importarComputadores(buffer, mode = "validar") {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    
    // Usa a primeira aba disponível
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return {
        ok: false,
        errors: [
          {
            planilha: "arquivo",
            linha: 0,
            erro: "Arquivo Excel vazio ou inválido.",
          },
        ],
        summary: null,
      };
    }

    const firstSheetName = workbook.SheetNames[0];
    console.log(`[IMPORT COMPUTADORES] Usando aba: '${firstSheetName}'`);
    
    const computadorSheet = workbook.Sheets[firstSheetName];

    const rawComputadores = parseRows(computadorSheet);
    console.log(`[IMPORT COMPUTADORES] Lidos ${rawComputadores.length} computadores da planilha`);
    
    if (rawComputadores.length === 0) {
      return {
        ok: false,
        errors: [
          {
            planilha: firstSheetName,
            linha: 0,
            erro: "Nenhum dado encontrado na planilha.",
          },
        ],
        summary: null,
      };
    }
    
    // Logar apenas a primeira linha ajuda a diagnosticar cabeçalhos fora do padrão.
    console.log(`[IMPORT COMPUTADORES] Primeira linha:`, JSON.stringify(rawComputadores[0], null, 2));

    const { validRows: computadores, errors: computadorErrors } = collectComputadores(rawComputadores);
    console.log(`[IMPORT COMPUTADORES] Após coleta: ${computadores.length} válidos, ${computadorErrors.length} erros`);

    const dbErrors = await validateComputadoresAgainstDatabase(computadores);
    console.log(`[IMPORT COMPUTADORES] Após validação DB: ${dbErrors.length} novos erros`);

    const errors = [...computadorErrors, ...dbErrors];
    const summary = {
      total_computadores: rawComputadores.length,
      erros: errors.length,
      modo: mode,
    };

    if (errors.length) {
      console.log(`[IMPORT COMPUTADORES] Errors encontrados:`, errors);
      return { ok: false, errors, summary };
    }

    if (mode === "importar") {
      await persistComputadores(computadores);
      console.log(`[IMPORT COMPUTADORES] Importação concluída: ${computadores.length} registros`);
    }

    return { ok: true, errors: [], summary };
  } catch (error) {
    console.error("[IMPORT COMPUTADORES] ERRO:", error);
    return {
      ok: false,
      errors: [
        {
          planilha: "importacao",
          linha: 0,
          erro: `Erro ao processar: ${error.message}`,
        },
      ],
      summary: null,
    };
  }
}