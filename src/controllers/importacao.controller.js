import { importarPlanilha, importarHeadsets, importarComputadores } from "../services/importacao.service.js";

export async function importarInicial(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Envie um arquivo .xlsx no campo 'arquivo'." });
    }

    const modo = String(req.query?.modo || "validar").toLowerCase();
    if (!["validar", "importar"].includes(modo)) {
      return res.status(400).json({ error: "Modo inválido. Use 'validar' ou 'importar'." });
    }

    const result = await importarPlanilha(req.file.buffer, modo);
    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({
      ...result,
      message:
        modo === "importar"
          ? "Importação concluída com sucesso."
          : "Validação concluída sem erros.",
    });
  } catch (error) {
    next(error);
  }
}

export async function importarHeadsetsController(req, res, next) {
  try {
    console.log("[CONTROLLER] Recebido arquivo para importar headsets");
    
    if (!req.file?.buffer) {
      console.log("[CONTROLLER] Arquivo não foi enviado");
      return res.status(400).json({ error: "Envie um arquivo .xlsx no campo 'arquivo'." });
    }

    console.log(`[CONTROLLER] Tamanho do arquivo: ${req.file.buffer.length} bytes`);
    
    const modo = String(req.query?.modo || "validar").toLowerCase();
    if (!["validar", "importar"].includes(modo)) {
      console.log(`[CONTROLLER] Modo inválido: ${modo}`);
      return res.status(400).json({ error: "Modo inválido. Use 'validar' ou 'importar'." });
    }

    console.log(`[CONTROLLER] Chamando importarHeadsets com modo: ${modo}`);
    const result = await importarHeadsets(req.file.buffer, modo);
    
    console.log(`[CONTROLLER] Resultado:`, JSON.stringify(result, null, 2));
    
    if (!result.ok) {
      console.log("[CONTROLLER] Validação falhou, retornando 400");
      return res.status(400).json(result);
    }

    console.log("[CONTROLLER] Sucesso, retornando 200");
    return res.json({
      ...result,
      message:
        modo === "importar"
          ? "Importação de headsets concluída com sucesso."
          : "Validação de headsets concluída sem erros.",
    });
  } catch (error) {
    console.error("[CONTROLLER] ERRO CAPTURADO:", error);
    next(error);
  }
}

export async function importarComputadoresController(req, res, next) {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Envie um arquivo .xlsx no campo 'arquivo'." });
    }

    const modo = String(req.query?.modo || "validar").toLowerCase();
    if (!["validar", "importar"].includes(modo)) {
      return res.status(400).json({ error: "Modo inválido. Use 'validar' ou 'importar'." });
    }

    const result = await importarComputadores(req.file.buffer, modo);
    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({
      ...result,
      message:
        modo === "importar"
          ? "Importação de computadores concluída com sucesso."
          : "Validação de computadores concluída sem erros.",
    });
  } catch (error) {
    next(error);
  }
}
