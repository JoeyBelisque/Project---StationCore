import { Router } from "express";
import multer from "multer";
import {
  importarInicial,
  importarHeadsetsController,
  importarComputadoresController,
} from "../controllers/importacao.controller.js";
import { requireAdmin } from "../middlewares/auth.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.post("/inicial", requireAdmin, upload.single("arquivo"), importarInicial);
router.post("/headsets", requireAdmin, upload.single("arquivo"), importarHeadsetsController);
router.post("/computadores", requireAdmin, upload.single("arquivo"), importarComputadoresController);

export default router;
