/**
 * Ponto de entrada do backend (API HTTP).
 * Fluxo típico: pedido → rota → controller → model (SQL) → resposta JSON.
 */
import express from "express";
import cors from "cors";
import computadorRoutes from "./routes/computador.routes.js";
import headsetRoutes from "./routes/headset.routes.js";

const app = express();

// Permite que o front (outra origem, ex. localhost:5173) chame esta API sem bloqueio do browser.
app.use(cors());
// Lê corpo JSON dos POST/PUT e coloca em req.body.
app.use(express.json());

// Prefixos de URL: tudo em computador.routes.js fica sob /computadores, etc.
app.use("/computadores", computadorRoutes);
app.use("/headsets", headsetRoutes);

// Middleware de erros do Express: 4 argumentos (err, req, res, next).
// Só corre se alguma rota/controller chamar next(erro) ou lançar erro não tratado.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "erro interno no servidor" });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000 🚀");
});