## Status Atual (26/05/2026) - v1.3.0 Premium
- [x] **Categorias Restauradas**: Separação clara entre Operação e Empréstimo.
- [x] **Fluxo de Baixa Inteligente**: Pergunta a condição de retorno e limpa dados do operador.
- [x] **Automação de Histórico**: Observações automáticas gravadas no retorno de ativos.
- [x] **Bloqueio de Segurança**: Impede o vínculo de equipamentos com defeito.
- [x] **Responsividade**: Tabelas e Dashboards ajustados para mobile.

## 1. Recuperação do que foi perdido (Prioridade Alta)
- [ ] **Sistema de Logs/Atividades (Dashboard):** Implementar um componente no Dashboard que lista as últimas 10-15 ações do sistema (ex: "Fulano vinculou lacre X", "Lacre Y foi para manutenção").
- [ ] **Identificação por Nome:** Adicionar o campo `nome_equipamento` ou `identificador_personalizado` na tabela de Headsets e Computadores, permitindo buscas por apelidos além do Lacre/Série.
- [ ] **Sistema de Notificações (Toasts):** Refinar o provedor de Toast para suportar notificações persistentes e alertas de sistema (ex: aviso de estoque baixo).
- [ ] **Exportação Avançada:** Adicionar filtros de data e seleção de colunas específicas na página de Exportar.

## 2. Gestão de Usuários (Ajustes e Segurança)
- [ ] **Níveis de Permissão:** Garantir que apenas 'admins' possam excluir registros ou criar novos usuários.
- [ ] **Alteração de Perfil:** Permitir que o usuário logado altere sua própria senha e nome.
- [ ] **Log de Acessos:** Registrar quando e quem acessou o sistema.

## 3. Novas Funcionalidades Sugeridas
- [ ] **Alertas de Manutenção Preventiva:** Notificar automaticamente quando um headset atinge X meses de uso para revisão de espumas/cabos.
- [ ] **Vínculo por QR Code:** Gerar um QR Code para cada lacre que, ao ser lido pelo celular, abre a página de detalhes do equipamento.
- [ ] **Dashboard de Desempenho:** Gráficos que mostram a taxa de defeitos por marca (Intelbras vs Plantronics) para ajudar na decisão de compra.
- [ ] **Backup Automático:** Função para exportar e salvar o banco de dados via e-mail ou nuvem semanalmente.

## 4. Melhorias de Interface (UI/UX)
- [ ] **Modo Compacto:** Opção de visualização em lista reduzida para telas menores.
- [ ] **Filtros Inteligentes:** Salvar as preferências de filtro do usuário para que ele não precise filtrar toda vez que entrar na página.
- [ ] **Animações de Transição:** Melhorar o feedback visual ao salvar ou excluir itens.

---
*Este arquivo deve ser usado como guia nas próximas sessões para retomar o progresso de forma organizada.*
