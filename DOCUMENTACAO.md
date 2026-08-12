# StationCore 2.0 - Sistema de Inventário Premium

Sistema completo para gestão de inventário de TI (Computadores e Headsets), com foco em auditoria, controle de empréstimos, importação em lote e acompanhamento de achados e perdidos.

## 🚀 Como Rodar o Sistema

### Servidor (Backend)
1. Certifique-se de ter o **Node.js** e **PostgreSQL** instalados (Debian/Linux recomendado).
2. Crie/configure manualmente o arquivo `.env` na raiz. Este repositório não possui `.env.example`.
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

### 📦 Achados e Perdidos
*   **Ocorrência separada:** Achados ficam em `headset_achados_perdidos`; o registro original do headset não é alterado ao abrir uma ocorrência.
*   **Estados:** `Aguardando devolução`, `Devolvido` e `Cancelado`.
*   **Identificação:** O sistema tenta relacionar a ocorrência ao headset pelo lacre, mas também aceita item ainda não identificado.
*   **Devolução manual:** Ao marcar como devolvido, o headset identificado volta para `estoque` dentro de uma transação e o histórico é registrado.
*   **Integração:** Pendências aparecem nos alertas do Dashboard e no detalhe do headset relacionado.

---

## 🚀 Checklist de Subida no Debian

Na raiz do projeto:

```bash
npm install
npm run db:migrate
npm start
```

Em outro terminal, para servir o frontend durante desenvolvimento:

```bash
cd client
npm install
npm run build
```

Antes de iniciar o backend, confirme que `.env` contém `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` e `DB_NAME`. A migration `1777900000000_achados-perdidos.js` cria a tabela nova; as migrations legadas de categoria e `deleted_at` são compatíveis com bancos que já possuem essas alterações.

### Deploy completo com Nginx

Assumindo o projeto em `/var/www/Project---StationCore`:

```bash
cd /var/www/Project---StationCore
npm install

# ALTERE AQUI: crie o .env com os valores reais do servidor.
nano .env

npm run db:migrate
npm start
```

O `.env` deve usar os nomes consumidos pelo backend:

```env
PORT=3000
JWT_SECRET=ALTERE_AQUI
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=ALTERE_AQUI
DB_PASSWORD=ALTERE_AQUI
DB_NAME=ALTERE_AQUI
```

Valide o processo do Node:

```bash
sudo ss -tulpn | grep 3000
sudo lsof -i :3000
curl http://localhost:3000/usuarios/
```

O `curl` pode retornar erro de token. Isso confirma que a API está viva e protegida.

Gere o frontend em outro terminal:

```bash
cd /var/www/Project---StationCore/client
npm install
npm run build
```

Toda alteração em `client/src` exige novo `npm run build`.

Configuração sugerida em `/etc/nginx/sites-enabled/default`:

```nginx
server {
    listen 80;
    # ALTERE AQUI se houver domínio ou IP específico.
    server_name _;

    root /var/www/Project---StationCore/client/dist;
    index index.html;

    location / {
        try_files $uri /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Depois de alterar o Nginx:

```bash
sudo nginx -t
sudo systemctl restart nginx
sudo ss -tulpn | grep :80
curl http://localhost
```

Para descobrir o IP do servidor e testar de outra máquina:

```bash
ip a
# ALTERE AQUI: substitua pelo IP real do Debian.
```

No PowerShell do computador cliente:

```powershell
Test-NetConnection IP_DO_DEBIAN -Port 80
```

Logs úteis:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Manutenção após o deploy

- Alterou `src/`: reinicie o processo do backend (`npm start` ou o serviço usado pelo servidor).
- Alterou `client/src/`: execute `cd client && npm run build`.
- Alterou uma migration: execute `npm run db:migrate` na raiz antes de reiniciar o backend.
- Não use `npm run db:migrate:down` em produção sem backup e confirmação do rollback.
- O frontend deve consumir `/api`, nunca `http://localhost:3000` nem um IP fixo.

---

## 🛠️ Manutenção e Código Limpo

*   **Comentários:** Todo o código central (Models e Services) está comentado em português explicando o "porquê" de cada regra.
*   **Logs:** Logs redundantes foram removidos para garantir um console limpo no servidor.
*   **Segurança:** Todas as rotas sensíveis estão protegidas por middlewares de autenticação e cargo (Admin).

---
*Desenvolvido para StationCore v2.0 • Premium Access*
