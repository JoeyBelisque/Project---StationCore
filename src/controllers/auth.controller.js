import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUsuarioByEmail } from "../models/usuario.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "stationcore-dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

function sanitizeUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
  };
}

export async function login(req, res) {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const senha = String(req.body?.senha || "");

  if (!email || !senha) {
    return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
  }

  const usuario = await findUsuarioByEmail(email);
  if (!usuario || !usuario.ativo) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }

  const ok = await bcrypt.compare(senha, usuario.senha_hash);
  if (!ok) {
    return res.status(401).json({ erro: "Credenciais inválidas." });
  }

  const userPayload = sanitizeUser(usuario);
  const token = jwt.sign(userPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  return res.json({
    usuario: userPayload,
    token,
    token_type: "Bearer",
    expires_in: JWT_EXPIRES_IN,
  });
}
