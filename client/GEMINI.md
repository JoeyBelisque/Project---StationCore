# Plano de Recuperação e Evolução - StationCore

Este documento serve como roteiro para as próximas etapas de desenvolvimento, focando em recuperar as funcionalidades perdidas e adicionar novas melhorias essenciais.

## 1. Recuperação do que foi perdido (Concluído)
- [x] **Sistema de Logs/Atividades (Dashboard):** Implementado componente ultra-resiliente com descoberta automática de endpoint (Tenta `/atividades`, `/logs`, `/historico`, etc.) e mapeamento dinâmico de campos.
- [x] **Identificação por Nome:** Adicionado campo `nome` em Headsets e Computadores, permitindo buscas por apelidos personalizados.
- [x] **Sistema de Notificações (Toasts):** Provedor refinado com suporte a notificações persistentes, durações customizáveis e badges de alerta.
- [x] **Exportação Avançada:** Adicionados filtros de período (data inicial/final) e seleção dinâmica de colunas para relatórios XLSX e CSV.

## 2. Gestão de Usuários (Concluído)
- [x] **Níveis de Permissão:** RBAC implementado; apenas administradores acessam a gestão de usuários e realizam exclusões de ativos.
- [x] **Alteração de Perfil:** Adicionado modal "Meu Perfil" acessível pelo header para alteração de nome e senha pelo próprio usuário.
- [x] **Log de Acessos:** Sistema preparado para registrar atividades via API global de atividades.

## 3. Funcionalidades Evolutivas (Sugestões de Inteligência)
- [x] **Dashboard de Desempenho:** Gráficos de barra por marca em tempo real.
- [x] **Filtros Inteligentes:** Persistência automática das preferências de filtro.
- [x] **Feed de Atividades (Sintético):** Logs gerados automaticamente a partir de mudanças no banco.
- [x] **Módulo de Auditoria Completo:** Página dedicada para buscar TODAS as mudanças históricas por data, usuário ou equipamento (Acessível via Sidebar).
- [x] **Painel de Alertas Automáticos:** Sistema que destaca:
    - Estoque de reserva abaixo do limite (ex: menos de 5 headsets).
    - Equipamentos em manutenção há mais de 15 dias.
- [x] **Módulo de Custos de Reparo:** Adicionado campos de "Custo" e "Peças" no fluxo de retorno da manutenção para headsets.
- [ ] **Visão Financeira (Dashboard):** Gráfico de gastos financeiros acumulados por marca.
- [ ] **Backup Rápido em 1 Clique:** Botão no Dashboard para baixar um backup total atualizado.

## 4. Melhorias de Interface (Concluído)
- [x] **Feedback Visual:** Implementados esqueletos de carregamento (skeletons) e badges dinâmicos.
- [x] **Animações de Transição:** Adicionadas classes `page-fade-in` para suavizar a navegação.

---
*Progresso atualizado em 24 de maio de 2026. Sistema operando em v1.2.5 Premium.*
