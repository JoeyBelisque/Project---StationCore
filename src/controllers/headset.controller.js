/**
 * Aqui usamos try/catch + next(err) para erros inesperados (ex.: Postgres em baixo)
 * chegarem ao middleware de erros em app.js. Validações simples → 400; não encontrado → 404.
 */
import * as Headset from "../models/headset.model.js";

export const listar = async (req, res, next) => {
  try {
    const data = await Headset.getHeadsets();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const criar = async (req, res, next) => {
  try {
    const { matricula, lacre } = req.body ?? {};
    if (!matricula?.trim() || !lacre?.trim()) {
      res.status(400).json({ error: "matricula e lacre são obrigatórios" });
      return;
    }
    const row = await Headset.createHeadset(req.body);
    // 201 Created = recurso novo; corpo costuma ser o objeto criado (com id).
    res.status(201).json(row);
  } catch (e) {
    next(e);
  }
};

export const atualizar = async (req, res, next) => {
  try {
    // :id na rota vira req.params.id (ex.: PUT /headsets/uuid-aqui).
    const { id } = req.params;
    const { matricula, lacre } = req.body ?? {};
    if (!matricula?.trim() || !lacre?.trim()) {
      res.status(400).json({ error: "matricula e lacre são obrigatórios" });
      return;
    }
    const row = await Headset.updateHeadset(id, req.body);
    if (!row) {
      res.status(404).json({ error: "headset não encontrado" });
      return;
    }
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const remover = async (req, res, next) => {
  try {
    const ok = await Headset.deleteHeadset(req.params.id);
    if (!ok) {
      res.status(404).json({ error: "headset não encontrado" });
      return;
    }
    // 204 No Content = sucesso sem corpo (comum em DELETE).
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
