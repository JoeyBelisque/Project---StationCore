import * as Computador from "../models/computador.model.js";

export const listar = async (req, res) => {
  const data = await Computador.getComputadores();
  res.json(data);
};

export const criar = async (req, res) => {
  const novo = await Computador.createComputador(req.body);
  res.json(novo);
};