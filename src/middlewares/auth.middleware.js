import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "stationcore-dev-secret";

function extractToken(authHeader) {
  const raw = String(authHeader || "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim() || null;
}

export function requireAuth(req, res, next) {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: "Token de acesso ausente." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado." });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Acesso restrito a administradores." });
  }
  return next();
}
