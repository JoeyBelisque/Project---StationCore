import * as AchadoPerdido from "../models/achado-perdido.model.js";

export async function listar(req, res, next) {
  try {
    if (req.query.lacre) {
      return res.json(await AchadoPerdido.listarAchadosPorLacre(req.query.lacre));
    }
    res.json(await AchadoPerdido.listarAchados(String(req.query.status || "")));
  } catch (error) {
    next(error);
  }
}

export async function criar(req, res, next) {
  try {
    res.status(201).json(await AchadoPerdido.criarAchado(req.body));
  } catch (error) {
    if (error?.code === "VALIDATION") return res.status(400).json({ error: error.message });
    next(error);
  }
}

export async function atualizar(req, res, next) {
  try {
    const result = await AchadoPerdido.atualizarAchado(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: "registro de achado nao encontrado" });
    res.json(result);
  } catch (error) {
    if (error?.code === "VALIDATION") return res.status(400).json({ error: error.message });
    next(error);
  }
}
