/**
 * Controller = liga HTTP (req/res) ao model.
 * req.body vem do express.json(); res.json() envia resposta com Content-Type JSON.
 */
import * as Computador from "../models/computador.model.js";

export const listar = async (req, res, next) => {
  try {
    const data = await Computador.getComputadores();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const criar = async (req, res, next) => {
  try {
    const novo = await Computador.createComputador(req.body);
    res.status(201).json(novo);
  } catch (e) {
    next(e);
  }
};

export const atualizar = async (req, res, next) => {
  try {
    const { id } = req.params;
    const atualizado = await Computador.updateComputador(id, req.body);
    if (!atualizado) {
      return res.status(404).json({ error: "Computador não encontrado" });
    }
    res.json(atualizado);
  } catch (e) {
    next(e);
  }
};

export const trocar = async (req, res, next) => {
  try {
    const { id } = req.params; // ID do que está saindo
    const { id_novo, status_novo_original, observacao } = req.body ?? {};

    if (!id_novo) {
      return res.status(400).json({ error: "id_novo é obrigatório" });
    }
    if (!status_novo_original) {
      return res.status(400).json({ error: "status_novo_original é obrigatório" });
    }

    const result = await Computador.swapComputador(
      id,
      id_novo,
      status_novo_original,
      observacao ?? ""
    );
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};

export const historico = async (req, res, next) => {
  try {
    const data = await Computador.getComputadorHistorico(req.params.id);
    res.json(data);
  } catch (e) {
    next(e);
  }
};

export const excluir = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Computador.deleteComputador(id);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
};
