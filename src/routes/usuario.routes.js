import { Router } from "express";
import * as UsuarioController from "../controllers/usuario.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas as rotas de usuários exigem autenticação
router.use(requireAuth);

router.get("/", UsuarioController.index);
router.post("/", UsuarioController.store);
router.put("/:id", UsuarioController.update);
router.delete("/:id", UsuarioController.destroy);

export default router;
