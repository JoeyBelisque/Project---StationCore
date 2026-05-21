import bcrypt from "bcryptjs";
import * as UsuarioModel from "../models/usuario.model.js";

export async function index(req, res) {
  try {
    const usuarios = await UsuarioModel.listarTodosUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao listar usuários." });
  }
}

export async function store(req, res) {
  const { nome, email, senha, role } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios." });
  }

  try {
    const existe = await UsuarioModel.findUsuarioByEmail(email);
    if (existe) return res.status(400).json({ erro: "E-mail já cadastrado." });

    const senha_hash = await bcrypt.hash(senha, 10);
    const novo = await UsuarioModel.criarNovoUsuario({ nome, email, senha_hash, role });
    res.status(201).json(novo);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao criar usuário." });
  }
}

export async function update(req, res) {
  const { id } = req.params;
  const { nome, email, role, ativo, senha } = req.body;

  try {
    const dados = { nome, email, role, ativo };
    if (senha) {
      dados.senha_hash = await bcrypt.hash(senha, 10);
    }

    const atualizado = await UsuarioModel.atualizarUsuario(id, dados);
    if (!atualizado) return res.status(404).json({ erro: "Usuário não encontrado." });

    res.json(atualizado);
  } catch (error) {
    res.status(500).json({ erro: "Erro ao atualizar usuário." });
  }
}

export async function destroy(req, res) {
  const { id } = req.params;
  try {
    await UsuarioModel.deletarUsuario(id);
    res.json({ mensagem: "Usuário removido com sucesso." });
  } catch (error) {
    res.status(500).json({ erro: "Erro ao remover usuário." });
  }
}
