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
const CATEGORIA_HEADSET = new Set(["estoque", "emprestimo", "entrega", "manutencao", "operacao"]);
const MARCAS_PERMITIDAS = new Set(["intelbras", "plantronics"]);
const STATUS_COMPUTADOR = new Set(["em_uso", "troca_pendente", "inutilizavel", "manutencao", "estoque"]);

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeStatus(value, fallback) {
  // Padroniza para o formato persistido no banco (ex.: "Em uso" -> "em_uso").
  const normalized = normalizeText(value).toLowerCase().replace(/\s+/g, '_');
  return normalized || fallback;
}

function deriveCategoria(status) {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === 'em_uso') return 'operacao';
  if (s === 'emprestimo') return 'emprestimo';
  if (s === 'entrega') return 'entrega';
  if (s === 'defeito' || s === 'manutencao') return 'manutencao';
  return 'estoque';
}

function normalizeHeadsetLifecycle(rawStatus, rawObservacao = "") {
  const statusNorm = normalizeStatus(rawStatus, "estoque");
  const observacao = normalizeText(rawObservacao);

  if (["retorno_manutencao", "retornou_manutencao", "voltou_manutencao"].includes(statusNorm)) {
    const obs = observacao
      ? `${observacao} | Retorno de manutenção via importação`
      : "Retorno de manutenção via importação";
    return { status: "estoque", categoria: "estoque", observacoes: obs };
  }

  if (statusNorm === "disponivel") {
    return { status: "estoque", categoria: "estoque", observacoes: observacao };
  }

  if (statusNorm === "defeito") {
    return { status: "defeito", categoria: "manutencao", observacoes: observacao };
  }

  return {
    status: statusNorm,
    categoria: deriveCategoria(statusNorm),
    observacoes: observacao,
  };
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
  const columnMap = {};

  // Função auxiliar pra limpeza agressiva (anti-encoding zoado)
  const normalizeKey = (key) =>
    key
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove acento
      .replace(/[º°]/g, 'o') // 👈 resolve Nº / N°
      .replace(/[^a-z0-9\s]/g, '') // remove lixo estranho
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');

  // Versão ainda mais agressiva (fallback)
  const normalizeLoose = (key) =>
    key.toLowerCase().replace(/[^a-z]/g, '');

  // 🔍 Mapeia colunas normalizadas
  for (const [key, value] of Object.entries(row)) {
    const normalized = normalizeKey(key);
    columnMap[normalized] = value;
  }

  // 🧠 Debug útil (pode deixar)
  console.log("[IMPORT] Colunas detectadas:", Object.keys(columnMap));

  const fieldMap = {
    matricula: ['matricula'],
    lacre: ['lacre'],
    marca: ['marca'],
    numero_serie: [
      'numero_serie',
      'numero_de_serie',
      'n_serie',
      'nserie',
      'n_de_serie',
      'no_serie', // 👈 agora funciona por causa do replace
      'num_serie',
      'ns',
    ],
    serial_number: [
      'serial_number',
      'serial',
      'sn',
      'n_serie',
      'no_serie',
      'num_serie',
      'ns',
      'numero_serie',
    ],
    status: ['status'],
    categoria: ['categoria', 'tipo', 'localizacao'],
    observacoes: ['observacoes', 'obs'],
    pa: ['pa', 'p_a'],
    hostname: ['hostname', 'host'],
  };

  const result = {};

  // 🎯 Mapeamento normal
  for (const [fieldName, aliases] of Object.entries(fieldMap)) {
    for (const alias of aliases) {
      if (alias in columnMap) {
        result[fieldName] = columnMap[alias];
        break;
      }
    }
  }

  const keys = Object.keys(columnMap);

  // 🔥 FALLBACK FORTE (resolve Debian 100%)
  if (!result.numero_serie) {
    const found = keys.find((k) => {
      const clean = normalizeLoose(k);
      return (
        clean.includes("serie") &&
        (clean.includes("n") || clean.includes("num") || clean.includes("numero"))
      );
    });

    if (found) {
      console.log("[MAP] numero_serie detectado automaticamente:", found);
      result.numero_serie = columnMap[found];
    }
  }

  if (!result.serial_number) {
    const found = keys.find((k) => {
      const clean = normalizeLoose(k);
      return (
        (clean.includes("serial") || clean.includes("sn") || clean.includes("serie"))
      );
    });

    if (found) {
      console.log("[MAP] serial_number detectado automaticamente:", found);
      result.serial_number = columnMap[found];
    }
  }

  // mantém extras
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
    const lifecycle = normalizeHeadsetLifecycle(raw.status, raw.observacoes);
    const status = lifecycle.status;
    const categoria = lifecycle.categoria;
    const observacoes = lifecycle.observacoes;

    if (!lacre) errors.push(rowError("headsets", line, "lacre é obrigatório"));
    if (!STATUS_HEADSET.has(status)) {
      errors.push(rowError("headsets", line, `status inválido: ${status}`));
    }
    if (marca && !MARCAS_PERMITIDAS.has(marca.toLowerCase())) {
      errors.push(rowError("headsets", line, `marca inválida: ${marca}. Use Intelbras ou Plantronics`));
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

    validRows.push({ matricula, lacre, marca, numero_serie, status, categoria, observacoes, line });
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
  const matriculasAtivas = [
    ...new Set(headsets.map((h) => (h.status === "em_uso" ? h.matricula : "")).filter(Boolean)),
  ];

  if (lacres.length || numerosSerie.length || matriculasAtivas.length) {
    const result = await pool.query(
      `
        SELECT lacre, numero_serie, matricula, status
        FROM headsets
        WHERE (cardinality($1::text[]) > 0 AND lacre = ANY($1::text[]))
           OR (cardinality($2::text[]) > 0 AND numero_serie = ANY($2::text[]))
           OR (cardinality($3::text[]) > 0 AND matricula = ANY($3::text[]) AND status = 'em_uso')
      `,
      [lacres, numerosSerie, matriculasAtivas]
    );
    const nsMap = new Map(
      result.rows
        .filter((r) => normalizeText(r.numero_serie))
        .map((r) => [normalizeText(r.numero_serie).toLowerCase(), normalizeText(r.lacre).toLowerCase()])
    );
    const lacreMap = new Map(
      result.rows
        .filter((r) => normalizeText(r.lacre))
        .map((r) => [normalizeText(r.lacre).toLowerCase(), r])
    );
    const matriculaMap = new Map(
      result.rows
        .filter((r) => normalizeText(r.matricula) && normalizeText(r.status) === "em_uso")
        .map((r) => [normalizeText(r.matricula).toLowerCase(), normalizeText(r.lacre)])
    );
    headsets.forEach((row) => {
      if (row.numero_serie) {
        const lacreDaSerie = nsMap.get(row.numero_serie.toLowerCase());
        if (lacreDaSerie && lacreDaSerie !== row.lacre.toLowerCase()) {
          errors.push(
            rowError(
              "headsets",
              row.line,
              `numero_serie ${row.numero_serie} já está vinculado ao lacre ${lacreDaSerie}`
            )
          );
        }
      }

      const existente = lacreMap.get(row.lacre.toLowerCase());
      if (existente) {
        const matriculaAtual = normalizeText(existente.matricula);
        if (matriculaAtual && row.matricula && matriculaAtual.toLowerCase() !== row.matricula.toLowerCase()) {
          errors.push(
            rowError(
              "headsets",
              row.line,
              `lacre ${row.lacre} já está vinculado ao operador ${matriculaAtual}; faça baixa antes de novo vínculo`
            )
          );
        }
      }

      if (row.status === "em_uso" && row.matricula) {
        const lacreDaMatricula = matriculaMap.get(row.matricula.toLowerCase());
        if (lacreDaMatricula && lacreDaMatricula.toLowerCase() !== row.lacre.toLowerCase()) {
          errors.push(
            rowError(
              "headsets",
              row.line,
              `operador ${row.matricula} já está em uso no lacre ${lacreDaMatricula}`
            )
          );
        }
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
      const existing = await client.query(
        `SELECT id, matricula, lacre, marca, numero_serie, status, categoria, observacoes
         FROM headsets
         WHERE lacre = $1`,
        [row.lacre]
      );

      if (existing.rowCount === 0) {
        const categoriaFinal = deriveCategoria(row.status);
        const inserted = await client.query(
          `
            INSERT INTO headsets (matricula, lacre, marca, numero_serie, status, categoria, observacoes)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
          `,
          [row.matricula, row.lacre, row.marca, row.numero_serie || null, row.status, categoriaFinal, row.observacoes]
        );
        await client.query(
          `INSERT INTO headset_historico (headset_id, acao, campo, valor_novo, observacao)
           VALUES ($1, 'cadastro_importacao', 'headset', $2, $3)`,
          [inserted.rows[0].id, row.lacre, row.observacoes]
        );
      } else {
        const atual = existing.rows[0];
        const matriculaAtual = normalizeText(atual.matricula);
        if (matriculaAtual && row.matricula && matriculaAtual.toLowerCase() !== row.matricula.toLowerCase()) {
          throw new Error(
            `Conflito de vínculo: lacre ${row.lacre} já está associado ao operador ${matriculaAtual}.`
          );
        }

        const proximaMatricula = row.matricula || matriculaAtual;
        const proximoStatus = row.status || atual.status || "estoque";
        const proximaCategoria = deriveCategoria(proximoStatus);
        await client.query(
          `
            UPDATE headsets
            SET matricula = $2,
                marca = $3,
                numero_serie = $4,
                status = $5,
                categoria = $6,
                observacoes = $7,
                updated_at = NOW()
            WHERE id = $1
          `,
          [
            atual.id,
            proximaMatricula,
            row.marca || atual.marca,
            row.numero_serie || atual.numero_serie || null,
            proximoStatus,
            proximaCategoria,
            row.observacoes || atual.observacoes || "",
          ]
        );

        const campos = ["matricula", "marca", "numero_serie", "status", "categoria", "observacoes"];
        for (const campo of campos) {
          const novoValor =
            campo === "matricula"
              ? proximaMatricula
              : campo === "marca"
              ? row.marca || atual.marca
              : campo === "numero_serie"
              ? row.numero_serie || atual.numero_serie || null
              : campo === "status"
              ? proximoStatus
              : campo === "categoria"
              ? proximaCategoria
              : row.observacoes || atual.observacoes || "";
          if ((atual[campo] ?? null) !== (novoValor ?? null)) {
            await client.query(
              `INSERT INTO headset_historico (headset_id, acao, campo, valor_anterior, valor_novo, observacao)
               VALUES ($1, 'atualizacao_importacao', $2, $3, $4, $5)`,
              [atual.id, campo, atual[campo] ?? null, novoValor ?? null, row.observacoes]
            );
          }
        }
      }
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
  const workbook = XLSX.read(buffer, {
  type: "buffer",
  codepage: 65001 // 👈 força UTF-8
});

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