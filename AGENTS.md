# AGENTS.md - Plano mestre de refatoracao (Integrallys v2)

Este arquivo fixa as regras obrigatorias para qualquer agente/IA atuando neste repositorio.

## Contexto

- Repositorio novo (alvo): `C:\Developer\integrallys\integrallys-v2`
- Repositorio original de referencia (somente copia de UI, tipagens e configs):
  `C:\Developer\integrallys\Integrallys_next`
- Estrategia: reconstruir em um repo limpo, prompt a prompt, sem herdar arquitetura antiga baseada em perfil no frontend.

## Objetivo arquitetural (nao negociavel)

- Frontend burro + backend centralizado.
- Nenhuma logica de perfil no frontend.
- Sidebar sempre vem do backend (`/api/auth/me`).
- Nenhum mock em qualquer arquivo.
- Login manual com JWT (sem Supabase Auth no client).
- Um unico layout autenticado: `src/app/(app)/layout.tsx`.

## Regras obrigatorias

1. O termo "projeto original" refere-se ESTRITAMENTE a:
   `C:\Developer\integrallys\Integrallys_next`.
2. Zero mocks: se nao houver backend final, API retorna estrutura vazia real (`[]`, `null`) com loading/erro no frontend.
3. Zero logica de role/perfil nas views client.
4. Zero import de supabase em componentes client.
5. API routes leem identidade/perfil via headers (`x-user-id`, `x-user-role`) ou JWT no servidor; nunca confiar em role vindo do body/query.
6. Erros de API padronizados em formato consistente:
   `{ error: string, code: string }`.
7. Hooks sempre tipados (nunca `any` para contratos centrais).
8. Nao criar estrutura por perfil no App Router (`/admin`, `/gestor`, etc).

## Stack alvo

- Next.js 15 (App Router)
- TypeScript strict
- Tailwind CSS (config e tokens iguais ao original)
- shadcn/ui (components.json igual ao original)
- Zustand
- jose (JWT)
- lucide-react

## Estrutura alvo (resumo)

- `src/app/login/page.tsx`
- `src/app/(app)/layout.tsx` + rotas por dominio (`/agenda`, `/pacientes`, `/financeiro`, ...)
- `src/app/api/auth/{login,logout,me}/route.ts`
- `src/app/api/[dominio]/route.ts`
- `src/components/global/{shell-layout,sidebar,header}.tsx`
- `src/hooks/{use-auth,use-api}.ts`
- `src/lib/{auth,api-client,sidebar-builder}.ts`
- `src/types/{auth,api}.ts`

## Sequencia oficial de execucao (prompts)

### Prompt 0 - Base

- Inicializar repo e fundacao completa.
- JWT + middleware + auth store + sidebar server-side por role.
- Preservar UI de login/sidebar/header/loading conforme original.
- Criar placeholders de dominio.

### Prompt 1 - Recepcao

- Implementar views de recepcao por dominio com hooks tipados consumindo `/api/[dominio]`.
- Criar stubs de API por dominio lendo headers.

### Prompt 2 - Especialista

- Implementar views e hooks clinicos.
- Migrar componentes compartilhados (anatomy-3d, cid-search, signature-pad, read-only-banner).

### Prompt 3 - Admin

- Implementar views administrativas e dashboard universal.
- Criar APIs de usuarios/permissoes/unidades/financeiro/repasse/auditoria etc.

### Prompt 4 - Master e Gestor (unificacao)

- Reuso das mesmas views de dominio.
- Backend filtra dados/menu.
- Consolidar `sidebar-builder.ts` para todos os perfis.

### Prompt 5 - Paciente

- Implementar portal paciente em rotas de dominio compartilhadas.
- Sidebar e permissoes vindas do backend.

### Prompt 6 - Media + limpeza final

- Migrar media e shared restantes.
- Remover legados/mocks/supabase client indevido.
- Rodar build final e corrigir TS.

## Checklist de proibicoes (auditoria continua)

- Nao usar `SIDEBAR_BY_ROLE` fora de `src/lib/sidebar-builder.ts`.
- Nao usar comparacoes de perfil em views (`role === ...`, `perfil === ...`).
- Nao importar de `@/mocks`.
- Nao importar Supabase em componente client.

## Ambiente

`.env.example` deve conter:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
```

## Seguranca

- Nao commitar credenciais.
- Nao commitar `opencode.json` com tokens/chaves hardcoded.

## Pendências de Go-Live

### Sicredi Pix — mTLS obrigatório em produção

A integração Sicredi (`src/lib/gateways/sicredi.service.ts`) funciona em sandbox mas
requer proxy mTLS para produção. Ver comentário no arquivo para opções de implementação.
**Ação necessária antes do go-live:** Definir com o cliente qual opção de proxy adotar.

### Webhook token WhatsApp

Configurar `chatbot.webhook_token` em Configurações → Sistema antes de ativar o chatbot.
Sem esse token, o endpoint do chatbot fica desabilitado por segurança.

## Convencao de commits

- Usar commits semanticos por etapa: `feat:`, `fix:`, `chore:`, `refactor:`.
- Idealmente um commit por prompt concluido.
