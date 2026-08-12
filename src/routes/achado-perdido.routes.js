import { Router } from "express";
import { listar, criar, atualizar } from "../controllers/achado-perdido.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", listar);
router.post("/", requireAdmin, criar);
router.put("/:id", requireAdmin, atualizar);

export default router;
