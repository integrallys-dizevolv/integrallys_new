# Prontuário live sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Paciente na tela grande vê o texto digitado pelo especialista em ≤ ~1 s (mesma estação + aparelho separado), sem toast de reload.

**Architecture:** Hybrid BroadcastChannel + tabela `prontuario_live_drafts` + GET poll 500 ms. Auditoria formal permanece em `prontuario_versoes` no save real.

**Tech Stack:** Next.js App Router API, Supabase service role (server only), React hooks, BroadcastChannel.

## Global Constraints

- No `supabase` import in client components.
- JWT + `prontuarios:read` / `prontuarios:update` + unit scope.
- Draft PUT must not insert into `prontuario_versoes`.
- Channel name: `integrallys-prontuario-live`.

---

### Task 1: Migration + live-draft API

**Files:**
- Create: `sql/migrations/098_prontuario_live_drafts.sql`
- Create: `src/app/api/prontuarios/live-draft/route.ts`

- [x] Create table `prontuario_live_drafts` (PK `paciente_id`)
- [x] Implement GET + PUT with authz and unit scope
- [x] Smoke: PUT then GET returns same texto/updatedAt

### Task 2: Client hooks (publish + subscribe)

**Files:**
- Modify: `src/hooks/use-prontuario-live-sync.ts` (replace toast-only poll)

- [x] Export `useProntuarioLivePublish(pacienteId, texto)` — BC + throttle PUT
- [x] Export `useProntuarioLiveSubscribe(pacienteId)` — BC + poll 500 ms → `{ texto, updatedAt }`
- [x] Remove reload toast

### Task 3: Wire atendimento publisher

**Files:**
- Modify: `src/features/agenda/atendimento-view.tsx`
- Possibly: `src/contexts/atendimento-context.tsx` if publish must live inside provider

- [x] Call publish with `pacienteId` + `evolucaoAtual` (and optionally `observacoesFinais` if needed — v1: evolução only)
- [x] Remove old `useProntuarioLiveSync` toast call

### Task 4: Hardware viewer

**Files:**
- Modify: `src/features/prontuarios/prontuario-view.tsx`
- Create (optional): `src/features/prontuarios/prontuario-live-viewer.tsx`

- [x] If `hardware=1` and `paciente_id`, render live viewer instead of list
- [x] Subscribe hook; show patient name + live text + “ao vivo”
- [x] Empty state “Aguardando registro…”

### Task 5: Docs / QA touch-up

**Files:**
- Modify: `docs/feedbacks/qa-homologacao-m1-m7.md` (case 1.5)
- Modify canvas QA step 1.5 if needed

- [x] Update expected result: auto-update without reload/toast
