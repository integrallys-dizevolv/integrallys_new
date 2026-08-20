# Correções pós-auditoria — Report Bugs Integrallys (2026-08-20)

> **Backlog congelado na Task 5.** Somente os itens abaixo entram nas Tasks 6–8.  
> Fonte: `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md` (Status final Task 4).

**Branch:** feat/revisao-completa-report-bugs @ 7035431  
**Decisão controller:** EXTRA-V3-* → Adiar; Task 8 → N/A (sem FAILs 12–15)

---

## Backlog ordenado (Tasks 6–7)

| Ordem | Item | Status matriz | Task plano | Escopo |
|-------|------|---------------|------------|--------|
| 1 | **16** — Cadastro rápido no + agenda | Corrigir (código+vídeo+QA FAIL) | Task 7 | Autocomplete paciente + formulário rápido (nome/tel/nasc/CPF) em `novo-agendamento-modal.tsx` |
| 2 | **11** — Empty agenda + intervalo + excluir | Corrigir (código+vídeo+QA FAIL) | Task 6 | Week view sem CTA fantasma; badge duração real (não `30min` hardcoded); excluir já OK |

---

## Fora do backlog desta sprint

| ID / item | Motivo |
|-----------|--------|
| EXTRA-V3-1 (procedimento no slot) | **Adiar** — YAGNI até reabertura |
| EXTRA-V3-2 (Alertas no slot) | **Adiar** — YAGNI até reabertura |
| Itens 12–15 | Pendente QA (SKIP) — nenhum FAIL; Task 8 **N/A** |
| Itens 1–10, 17–20 | Pendente QA ou N/A documentado — sem correção neste ciclo |

---

## Critério de pronto (Tasks 6–7)

- [ ] Item 16: busca + cadastro rápido + QA vídeo 4 → matriz **Confirmado**
- [ ] Item 11: week empty + duração real + QA agenda → matriz **Confirmado**
- [ ] Zero `Corrigir` aberto nos itens 1–16 após Tasks 6–7
