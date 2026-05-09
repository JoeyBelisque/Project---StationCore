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
    const { lacre } = req.body ?? {};
    if (!lacre?.trim()) {
      res.status(400).json({ error: "lacre é obrigatório" });
      return;
    }
    const row = await Headset.createHeadset(req.body);
    // 201 Created = recurso novo; corpo costuma ser o objeto criado (com id).
    res.status(201).json(row);
  } catch (e) {
    if (e?.code === "VALIDATION") {
      res.status(400).json({ error: e.message });
      return;
    }
    if (e?.code === "23505") {
      res.status(409).json({ error: "lacre ou número de série já cadastrado" });
      return;
    }
    next(e);
  }
};

export const atualizar = async (req, res, next) => {
  try {
    // :id na rota vira req.params.id (ex.: PUT /headsets/uuid-aqui).
    const { id } = req.params;
    const { lacre } = req.body ?? {};
    if (!lacre?.trim()) {
      res.status(400).json({ error: "lacre é obrigatório" });
      return;
    }
    const row = await Headset.updateHeadset(id, req.body);
    if (!row) {
      res.status(404).json({ error: "headset não encontrado" });
      return;
    }
    res.json(row);
  } catch (e) {
    if (e?.code === "VALIDATION") {
      res.status(400).json({ error: e.message });
      return;
    }
    if (e?.code === "23505") {
      res.status(409).json({ error: "lacre ou número de série já cadastrado" });
      return;
    }
    next(e);
  }
};

export const atualizarLacre = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { novo_lacre, observacao } = req.body ?? {};
    if (!novo_lacre?.trim()) {
      res.status(400).json({ error: "novo_lacre é obrigatório" });
      return;
    }
    const row = await Headset.trocarLacre(id, novo_lacre, observacao ?? "");
    if (!row) {
      res.status(404).json({ error: "headset não encontrado" });
      return;
    }
    res.json(row);
  } catch (e) {
    if (e?.code === "VALIDATION") {
      res.status(400).json({ error: e.message });
      return;
    }
    if (e?.code === "23505") {
      res.status(409).json({ error: "já existe headset com esse lacre" });
      return;
    }
    next(e);
  }
};

export const historico = async (req, res, next) => {
  try {
    const data = await Headset.getHeadsetHistorico(req.params.id);
    res.json(data);
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
