# Integrallys

Sistema de gestão clínica multi-perfil (recepção, gestor, administrador, especialista e portal do paciente), construído em **Next.js (App Router)** com **Supabase (PostgreSQL)** como banco de dados.

> A fonte de verdade das tarefas do projeto é o `tasks_incremental.md`. Convenções e regras de trabalho estão em `CLAUDE.md` / `AGENTS.md`.

---

## Stack

| Camada            | Tecnologia                                             |
| ----------------- | ------------------------------------------------------ |
| Framework         | Next.js 16 (App Router) + React 19                     |
| Linguagem         | TypeScript                                             |
| Banco de dados    | Supabase / PostgreSQL                                  |
| Autenticação      | JWT de sessão próprio (`jose` + `JWT_SECRET`)          |
| Acesso ao banco   | `@supabase/supabase-js` com chave `service_role` (server-only) |
| UI                | Tailwind CSS + shadcn/ui (Radix UI) + lucide-react     |
| Formulários       | React Hook Form + Zod                                  |
| Dados / estado    | TanStack Query + Zustand                               |
| Gráficos          | Recharts                                               |
| PDF / documentos  | jsPDF + html2canvas                                    |
| Lint / format     | Biome                                                  |
| Testes            | Vitest + Testing Library                               |
| Gerenciador       | pnpm                                                   |

---

## Pré-requisitos

- **Node.js 20+**
- **pnpm** (`npm i -g pnpm`)
- Um projeto **Supabase** (URL + `service_role key`)

---

## Setup

```bash
# 1. Instalar dependências
pnpm install

# 2. Configurar variáveis de ambiente
cp .env.example .env.local   # depois preencha os valores em .env.local

# 3. Rodar em desenvolvimento
pnpm dev                     # http://localhost:3000
```

Veja [`.env.example`](./.env.example) para a lista completa de variáveis. As
chaves marcadas com 🔴 (`SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`) são sensíveis
e nunca devem ser commitadas.

---

## Scripts

| Comando             | Descrição                                        |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | Servidor de desenvolvimento                      |
| `pnpm build`        | Build de produção                                |
| `pnpm start`        | Servir o build de produção                       |
| `pnpm lint`         | Lint (Biome) em `src`                            |
| `pnpm format`       | Formatar `src` (Biome)                           |
| `pnpm check`        | Lint + format check (Biome)                      |
| `pnpm check:fix`    | Aplicar correções automáticas (Biome)            |
| `pnpm test`         | Rodar testes (Vitest)                            |
| `pnpm test:watch`   | Testes em watch mode                             |
| `pnpm validate:db`  | Validar o schema do banco (`scripts/validate-db.mjs`) |
| `pnpm db:contract`  | Atualizar o contrato do banco (`scripts/refresh-db-contract.mjs`) |

---

## Estrutura

```
src/
├── app/
│   ├── (app)/          # Módulos internos (staff): agenda, pacientes, financeiro,
│   │                   #   caixa, estoque, dre, documentação, evoluções, etc.
│   ├── portal/         # Portal do paciente (agenda, prescrições, documentos…)
│   ├── api/            # Route handlers (API)
│   └── login/          # Autenticação
├── components/         # Componentes de UI reutilizáveis
├── contexts/           # React contexts
├── features/           # Lógica por domínio/feature
├── hooks/              # Custom hooks
├── lib/                # Auth, authz, clients Supabase, mappers, helpers
├── services/           # Serviços de aplicação
└── types/              # Tipos globais

sql/
├── migrations/         # Migrations numeradas (001…074)
├── seeds/              # Seeds de dados de demonstração
└── *.sql               # Schema completo e scripts de manutenção
```

### Autenticação & autorização

- O `middleware.ts` protege as rotas: redireciona não autenticados para `/login`,
  injeta `x-user-id` / `x-user-role`, e segrega o namespace `/portal` (paciente)
  do restante (staff).
- A sessão é um JWT assinado com `JWT_SECRET` (`src/lib/auth.ts`).
- O acesso ao banco usa a chave `service_role` no servidor — a autorização por
  perfil/unidade é aplicada na camada de aplicação (`src/lib/authz.ts`).

### Perfis de usuário

Recepcionista · Especialista · Gestor · Administrador · Paciente (portal) · Master.

---

## Banco de dados

As migrations ficam em `sql/migrations/`, aplicadas em ordem numérica. Use
`pnpm validate:db` para checar o schema contra o contrato esperado.
