import express from "express";
import cors from "cors";
import computadorRoutes from "./routes/computador.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/computadores", computadorRoutes);

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000 🚀");
});