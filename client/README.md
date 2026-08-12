# StationCore Client

Frontend React/Vite do StationCore. O cliente consome a API Express pela rota `/api` durante o desenvolvimento.

## Comandos

```bash
npm install
npm run dev
```

Para validar a compilação de produção:

```bash
npm run build
```

O backend deve estar rodando na porta `3000` para que o proxy do Vite resolva `/api/computadores`, `/api/headsets`, `/api/achados-perdidos` e as demais rotas.

## Módulos principais

- Inventário de headsets e computadores.
- Empréstimos, substituições e histórico de uso.
- Importação e exportação de planilhas.
- Auditoria de alterações.
- Achados e Perdidos, com pendências integradas ao Dashboard.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
