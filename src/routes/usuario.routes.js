import { Router } from "express";
import * as UsuarioController from "../controllers/usuario.controller.js";
import { requireAuth, requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas as rotas de usuários exigem autenticação
router.use(requireAuth);

router.get("/", UsuarioController.index);
router.post("/", requireAdmin, UsuarioController.store);
router.put("/:id", requireAdmin, UsuarioController.update);
router.delete("/:id", requireAdmin, UsuarioController.destroy);

export default router;
