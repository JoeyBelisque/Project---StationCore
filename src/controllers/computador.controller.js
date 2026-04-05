/**
 * Controller = liga HTTP (req/res) ao model.
 * req.body vem do express.json(); res.json() envia resposta com Content-Type JSON.
 */
import * as Computador from "../models/computador.model.js";

export const listar = async (req, res) => {
  const data = await Computador.getComputadores();
  res.json(data);
};

export const criar = async (req, res) => {
  const novo = await Computador.createComputador(req.body);
  res.json(novo);
};