import { importarPlanilha, importarHeadsets, importarComputadores, gerarTemplateHeadsets, gerarTemplateComputadores, gerarTemplateCompleto } from "../services/importacao.service.js";

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
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "Envie um arquivo .xlsx no campo 'arquivo'." });
    }
    
    const modo = String(req.query?.modo || "validar").toLowerCase();
    if (!["validar", "importar"].includes(modo)) {
      return res.status(400).json({ error: "Modo inválido. Use 'validar' ou 'importar'." });
    }

    // Mesmo endpoint atende "pré-validação" e "importação definitiva".
    const result = await importarHeadsets(req.file.buffer, modo);

    if (!result.ok) {
      return res.status(400).json(result);
    }

    return res.json({
      ...result,
      message:
        modo === "importar"
          ? "Importação de headsets concluída com sucesso."
          : "Validação de headsets concluída sem erros.",
    });
  } catch (error) {
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

export async function baixarTemplateHeadsets(req, res, next) {
  try {
    const buffer = gerarTemplateHeadsets();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="template_headsets.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function baixarTemplateComputadores(req, res, next) {
  try {
    const buffer = gerarTemplateComputadores();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="template_computadores.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function baixarTemplateCompleto(req, res, next) {
  try {
    const buffer = gerarTemplateCompleto();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", 'attachment; filename="template_importacao.xlsx"');
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}
