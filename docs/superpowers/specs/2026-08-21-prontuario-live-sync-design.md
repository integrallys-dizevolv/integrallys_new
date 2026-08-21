# Design: Prontuário live sync (tela grande)

**Date:** 2026-08-21  
**Status:** Approved  
**Closes:** remaining 0.5 point on “prontuário editável em tempo real” (de-para Módulo 1)

## Problem

Editable post-finalize + `prontuario_versoes` audit is done. “Tempo real” today is an 8s poll that only toasts “reload”. Contract use case: patient sees large screen while specialist types. Large screen (`?hardware=1`) does not auto-update; `evolucaoAtual` is React-local until a real save.

## Goals

- Same workstation + separate device (C).
- Latency ≤ ~1 s (near live) (A).
- No toast asking to reload.
- No Supabase client in browser (`AGENTS.md`).
- Formal audit (`prontuario_versoes`) unchanged — only on real PUT save.

## Non-goals (v1)

- SSE/WebSocket.
- Sync of 3D anatomy / attachments / prescriptions.
- TTL cleanup job (optional later).

## Design

### UX — hardware viewer

`/prontuarios?paciente_id=…&hardware=1` shows a read-only live viewer (patient name + clinical text), not the list. Empty state: “Aguardando registro…”. Subtle live indicator (last update age).

### Transport

| Channel | Role |
|---------|------|
| `BroadcastChannel('integrallys-prontuario-live')` | Same-origin instant sync |
| `PUT/GET /api/prontuarios/live-draft` | Cross-device; poll every 500 ms on viewer |

Shared payload: `{ pacienteId, texto, updatedAt, authorId, source }`.

**Publish (atendimento):** on text change → BC always; throttled 300–400 ms PUT draft (no version row).

**Subscribe (viewer):** BC + poll; apply newer `updatedAt`; never ask reload.

### Schema

`098_prontuario_live_drafts.sql`:

- `prontuario_live_drafts(paciente_id PK, texto, author_id, unidade_id, updated_at)`

### Authz

- PUT: `prontuarios:update`
- GET: `prontuarios:read`
- Unit scope like atendimento historico (403 if patient outside unit; master/admin unrestricted)

### Client files

- Replace `use-prontuario-live-sync.ts` with publish + subscribe APIs.
- Wire publish from `evolucaoAtual` in atendimento.
- Branch `ProntuarioView` (or dedicated component) when `hardware=1` + `paciente_id`.

## Success criteria

- Typing in atendimento updates large screen ≤ ~1 s (local near-instant via BC).
- Second device logged in with same patient URL updates via poll.
- Saving formal prontuário still writes `prontuario_versoes`.
- No “recarregue se necessário” toast.
