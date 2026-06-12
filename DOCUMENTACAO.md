# StationCore - Sistema de Inventário Premium

Sistema completo para gestão de inventário de TI (Computadores e Headsets), com foco em auditoria, controle de empréstimos e importação em lote.

## 🚀 Como Rodar o Sistema

### Servidor (Backend)
1. Certifique-se de ter o **Node.js** e **PostgreSQL** instalados (Debian/Linux recomendado).
2. Configure o arquivo `.env` (use o `.env.example` como base).
3. Execute as migrações do banco: `npm run db:migrate`.
4. Inicie o servidor: `npm run start` (ou `npm run dev` para desenvolvimento).

### Cliente (Frontend)
1. Entre na pasta `client`.
2. Instale as dependências: `npm install`.
3. Inicie o Vite: `npm run dev`.

---

## 📖 Regras de Negócio Didáticas

### 🎧 Headsets (Arquitetura de Navegação Reativa)
O sistema foi atualizado para uma gestão baseada em contexto, reduzindo a complexidade visual:
*   **Filtros via Sidebar:** A navegação lateral agora controla a finalidade (`categoria`). Ao mudar na sidebar, a URL é atualizada e a página reage instantaneamente.
*   **Abas de Contexto (UX):**
    *   **Empréstimos:** Oferece atalhos rápidos para `Todos`, `Disponíveis` e `Emprestados`.
    *   **Operação:** Foca em `Todos`, `Em Uso` e `No Estoque`.
*   **Modal de Ações (Tiles):** As ações de gestão (3 pontos) foram agrupadas logicamente por *Vínculo*, *Condição Técnica* e *Sistema*, prevenindo confusões de fluxo.
*   **Destaque Estrito:** A sidebar utiliza uma lógica de comparação exata (Path + Query) para garantir que apenas o contexto atual esteja destacado visualmente.

### 💻 Computadores (Auditoria e Soft-Delete)
Para garantir que o histórico nunca seja perdido:
*   **Soft-Delete:** Ao "excluir" um computador, ele é marcado com uma data de deleção, mas permanece no banco. Isso evita que o histórico de auditoria fique com campos vazios.
*   **PA (Ponto de Atendimento):** Ao excluir um PC, a PA vinculada a ele é limpa automaticamente.
*   **Permissões:** Apenas perfis **Admin** podem excluir equipamentos ou gerenciar usuários.

### 📊 Importação de Planilhas
A importação foi desenhada para ser resiliente a erros humanos:
*   **Identificação Inteligente:** O sistema busca por apelidos nas colunas (ex: "NS", "Série", "Serial" -> todos mapeiam para o mesmo campo).
*   **Atualização Automática (UPSERT):** Se você importar um Hostname que já existe, o sistema **atualiza** os dados em vez de dar erro de duplicidade.
*   **Compatibilidade Debian:** Codificação UTF-8 forçada para evitar problemas de caracteres especiais em servidores Linux.

---

## 🛠️ Manutenção e Código Limpo

*   **Comentários:** Todo o código central (Models e Services) está comentado em português explicando o "porquê" de cada regra.
*   **Logs:** Logs redundantes foram removidos para garantir um console limpo no servidor.
*   **Segurança:** Todas as rotas sensíveis estão protegidas por middlewares de autenticação e cargo (Admin).

---
*Desenvolvido para StationCore v1.2.0 • Premium Access*
