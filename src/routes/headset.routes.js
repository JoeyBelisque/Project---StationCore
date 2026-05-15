/**
 * CRUD REST básico sob /headsets (ver app.js).
 * :id = parâmetro dinâmico (UUID do headset).
 */
import { Router } from "express";
import {
  atualizar,
  atualizarLacre,
  criar,
  historico,
  listar,
  remover,
  trocar,
} from "../controllers/headset.controller.js";

const router = Router();

router.get("/", listar);
router.post("/", criar);
router.put("/:id", atualizar);
router.patch("/:id/lacre", atualizarLacre);
router.post("/:id/trocar", trocar);
router.get("/:id/historico", historico);
router.delete("/:id", remover);

export default router;
