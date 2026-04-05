/**
 * CRUD REST básico sob /headsets (ver app.js).
 * :id = parâmetro dinâmico (UUID do headset).
 */
import { Router } from "express";
import { atualizar, criar, listar, remover } from "../controllers/headset.controller.js";

const router = Router();

router.get("/", listar);
router.post("/", criar);
router.put("/:id", atualizar);
router.delete("/:id", remover);

export default router;
