/**
 * Rotas deste ficheiro são montadas em app.js com prefixo /computadores.
 * GET /computadores → listar | POST /computadores → criar
 */
import { Router } from "express";
import { 
  listar, 
  criar, 
  atualizar, 
  excluir, 
  historico, 
  trocar 
} from "../controllers/computador.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/", listar);
router.post("/", criar);
router.put("/:id", atualizar);
router.post("/:id/troca", trocar);
router.get("/:id/historico", historico);
router.delete("/:id", requireAdmin, excluir);

export default router;
