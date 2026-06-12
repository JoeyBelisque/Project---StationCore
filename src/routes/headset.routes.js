/**
 * CRUD REST básico sob /headsets (ver app.js).
 * :id = parâmetro dinâmico (UUID do headset).
 */
import { Router } from "express";
import {
  atualizar,
  atualizarLacre,
  criar,
  desligamento,
  historico,
  listar,
  remover,
  trocar,
} from "../controllers/headset.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", listar);
router.get("/historico-recente", (req, res, next) => {
  // Chamada direta para simplificar dado o limite baixo
  import("../models/headset.model.js").then(m => m.getGlobalHistorico()).then(h => res.json(h)).catch(next);
});
router.post("/batch", requireAdmin, async (req, res, next) => {
  try {
    const { ids, data } = req.body;
    const { updateBatch } = await import("../models/headset.model.js");
    const results = await updateBatch(ids, data);
    res.json(results);
  } catch (e) {
    next(e);
  }
});
router.post("/desligamento/:matricula", requireAdmin, desligamento);
router.post("/", criar);
router.put("/:id", atualizar);
router.patch("/:id/lacre", atualizarLacre);
router.post("/:id/trocar", trocar);
router.get("/:id/historico", historico);
router.delete("/:id", requireAdmin, remover);

export default router;
