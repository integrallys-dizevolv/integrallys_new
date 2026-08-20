# Design: Revisão completa Report de Bugs Integrallys

**Date:** 2026-08-20  
**Status:** Draft for user review  
**Sources:** `[INTEGRALLYS] Report de Bugs.docx`, vídeos em `REPORT DE BUGS/`, depara canvas, code-reviewer

## Goal

Ter **certeza operacional** (não só “existe no repo”) de que cada item 1–16 do report está: (a) implementado corretamente, (b) alinhado ao pedido do cliente/vídeo, ou (c) explicitamente documentado como fora de escopo / não-bug / pendente.

## Approaches considered

| Approach | Pros | Cons |
|----------|------|------|
| A — Só re-ler código | Rápido | Não fecha “100%” (deploy/UX/cliente) |
| **B — Código + vídeo + QA manual por item** | Evidência tripla; detecta falso Done | Exige tempo de QA humano/agente com browser |
| C — Automatizar E2E Playwright de tudo | Regressão futura | Escopo grande; não substitui validação de vídeo 1–3 |

**Recommendation: B**, com automação só onde já houver testes (unit) e Playwright pontual nos gaps 11/16 se o time pedir na execução.

## Design

### Definition of “correto”

Um item só pode ser marcado **Confirmado** se passar os três gates:

1. **Código:** caminho de UI + API + (quando aplicável) migration/campo no banco existem e batem com o pedido.
2. **Referência:** texto do report (+ vídeo mapeado, se houver) não exige comportamento ausente.
3. **QA runtime:** checklist manual no ambiente alvo (local ou `integrallys.com.br`) com resultado pass/fail e evidência (print ou nota).

Sem o gate 3, o veredito máximo é **Provável (só código)** — insuficiente para a meta desta revisão.

### Escopo da revisão

| Faixa | Ação |
|-------|------|
| 1–10 (Finalizado no report) | Re-auditar; confirmar ou rebaixar |
| 11 (Partial) | Auditar gaps week view / badge; corrigir se confirmado |
| 12–15 (Done no código, Em andamento no report) | QA runtime; se pass → atualizar report; se fail → abrir correção |
| 16 (Missing) | Spec UX (vídeo 4 + Clínica Total) → implementar → QA |
| 17–20 | Confirmar vazios; sem trabalho |
| Vídeo 3 (procedimento/cobrança) | Extrair se há requisito **além** dos itens 8/11; se sim, registrar como item novo, não misturar |

### Fora de escopo (explícito)

- Wipe operacional do item 4 (seed/dados) — só documentar procedimento se o cliente ainda precisar.
- Planilha CLASP / outros produtos.
- Refatorações não ligadas aos itens.

### Entregáveis

1. Matriz de evidência item × código × vídeo × QA (`docs/superpowers/specs` ou atualização do canvas).
2. Lista de correções obrigatórias (mínimo esperado: 11 resto + 16; outros só se o audit falhar).
3. Status sugerido para o `.docx` do cliente.
4. Plano de implementação das correções confirmadas (arquivo em `docs/superpowers/plans/`).

### Riscos

- “Done no código” ≠ “visível no deploy do cliente” → gate 3 obrigatório.
- Item 7 reaberto pelo cliente via 12 → validar no ambiente **publicado**, não só no tree local.
- Vídeo 3 pode expandir escopo (vínculo procedimento no slot) → gating: só entra após extração explícita.

## Success criteria

- Cada item 1–16 tem status final: `Confirmado` | `Corrigir` | `N/A documentado`.
- Zero item `Finalizado` no report sem gate 3 passando (ou com falha registrada).
- Gaps Confirmados têm tarefa de correção no plano de execução.
