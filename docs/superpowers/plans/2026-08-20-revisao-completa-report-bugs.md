# Revisão Completa Report de Bugs — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auditar 100% dos itens 1–16 do Report de Bugs Integrallys (código + vídeo + QA runtime) e corrigir tudo que falhar nos gates, começando pelos gaps já conhecidos (11 resto, 16).

**Architecture:** Três fases sequenciais — (1) matriz de evidência por item, (2) correções confirmadas, (3) sincronização do report/cliente. Nenhuma correção de “Done suspeito” começa antes do gate QA da Fase 1 naquele item.

**Tech Stack:** Next.js App Router, Supabase, Vitest, Playwright (opcional pontual), vídeos/frames em `.video-frames/`, report `.docx`.

## Global Constraints

- Fonte do pedido: `[INTEGRALLYS] Report de Bugs.docx` + vídeos em `Downloads/REPORT DE BUGS-…/REPORT DE BUGS/`.
- Veredito “Confirmado” exige os 3 gates do spec `docs/superpowers/specs/2026-08-20-revisao-completa-report-bugs-design.md`.
- Zero lógica de perfil no frontend (AGENTS.md); APIs leem identidade no servidor.
- Não misturar CLASP.
- Commits semânticos por tarefa; só commitar se o usuário pedir.
- Item 4 (wipe) não vira feature sem pedido explícito — só documentar.

**Arquivos-chave (mapa):**

| Área | Paths |
|------|--------|
| Agenda day/week | `src/features/agenda/components/agenda-day-view.tsx`, `agenda-week-view.tsx` |
| Gerar/excluir | `src/app/api/agenda/gerar/`, `src/app/api/agenda/excluir/`, modals em `src/features/agenda/modals/` |
| Novo agendamento | `src/features/agenda/modals/novo-agendamento-modal.tsx` |
| Pacientes | `src/features/pacientes/`, `src/app/api/pacientes/` |
| Profissionais | `src/features/profissionais/modals/profissional-modal.tsx` |
| Procedimentos | `src/features/procedimentos/`, `src/app/api/procedimentos/` |
| Estoque | `src/features/estoque/modals/novo-produto-modal.tsx` |
| Frames vídeo | `.video-frames/REFERENCE.md`, `v1`…`v4` |
| Matriz evidência | `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md` (criar na Task 1) |

---

### Task 1: Criar matriz de evidência vazia + checklist QA

**Files:**
- Create: `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md`
- Modify: (none)

**Interfaces:**
- Consumes: itens 1–16 do report; mapping de vídeos em `.video-frames/REFERENCE.md`
- Produces: tabela markdown com colunas fixas usadas nas Tasks 2–4

- [ ] **Step 1: Criar o arquivo da matriz**

Conteúdo mínimo (preencher Status Final só depois dos gates):

```markdown
# Matriz de evidência — Report Bugs Integrallys (2026-08-20)

Ambiente QA: _________________ (local / staging / produção)
Branch/commit: _________________

| # | Pedido (1 linha) | Vídeo | Gate código | Gate vídeo/ref | Gate QA | Status final | Evidência (path/nota) | Ação |
|---|------------------|-------|-------------|----------------|---------|--------------|------------------------|------|
| 1 | Agenda por período / gerar | v1 | | | | | | |
| 2 | Cadastros iniciais | v1 | | | | | | |
| 3 | Alerta sáb/dom gerar | — | | | | | | |
| 4 | Zerar dados seed | — | | | | | | |
| 5 | Sem horários antes de gerar | v1 | | | | | | |
| 6 | Unidade bairro/CEP/UF | — | | | | | | |
| 7 | Profissionais filiais/repasse/contrato/docs | — | | | | | | |
| 8 | Procedimento valor/duração/retorno/código | v3 | | | | | | |
| 9 | Financeiro/cartões/bancos | v2 | | | | | | |
| 10 | Paciente origem/vínculo/NF | — | | | | | | |
| 11 | Empty agenda + intervalo + excluir | v1/v3 | | | | | | |
| 12 | Cidade/CEP + revisar 7 | — | | | | | | |
| 13 | Regenerar agenda com novo intervalo | — | | | | | | |
| 14 | Cadastro produtos estoque | — | | | | | | |
| 15 | Agenda especialista + senha user | — | | | | | | |
| 16 | Cadastro rápido no + agenda | v4 | | | | | | |
| 17-20 | Vazios | — | N/A | N/A | N/A | N/A | | — |

Valores Gate: `PASS` | `FAIL` | `N/A` | `SKIP`
Status final: `Confirmado` | `Corrigir` | `N/A documentado`
```

- [ ] **Step 2: Colar checklist QA runtime (anexo no mesmo arquivo)**

```markdown
## Checklist QA (por item — marcar no ambiente)

### Agenda / 1,5,11,13
- [ ] Sem slots inventados quando não há agenda gerada (day view)
- [ ] Week view: dia sem slots NÃO mostra "Disponível • Novo agendamento" como se houvesse grade
- [ ] Gerar agenda respeita `duracao_min` da grade (ex.: 40 min)
- [ ] Regenerar período limpa Disponíveis antigos e cria novos intervalos
- [ ] Excluir agenda exige justificativa e cria notificação gestor/admin

### Cadastros / 2,6,7,8,10,12,14
- [ ] Unidade: bairro, CEP, estado; listagem com endereço
- [ ] Profissional: filiais, repasse, cidade, CEP lookup, senha, contrato
- [ ] Procedimento: valor, duração, retorno, código auto
- [ ] Paciente: origem detalhe, multi vínculo, precisa NF
- [ ] Estoque: Novo produto com custo/venda/margem/unidade

### Financeiro / 9
- [ ] Telas cartões / gestão bancária / formas pagamento acessíveis e salvam

### Especialista / 15
- [ ] Login profissional vê só seus agendamentos
- [ ] Criar/editar profissional define senha inicial

### Cadastro rápido / 16
- [ ] Digitar nome no modal agenda → autocomplete
- [ ] Nome inexistente → formulário rápido nome/tel/nasc/CPF → agenda com paciente novo
```

- [ ] **Step 3: Conferir que o arquivo existe e as 16 linhas estão presentes**

Expected: arquivo no path acima com tabela 1–16 + checklist.

---

### Task 2: Gate código — revalidar itens 1–16 no tree

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md`
- Read (não editar salvo evidência): paths da tabela Global Constraints

**Interfaces:**
- Consumes: matriz Task 1
- Produces: coluna `Gate código` preenchida + notas em Evidência

- [ ] **Step 1: Para cada item 1–16, localizar evidência com ripgrep e anotar path**

Comandos base (ajustar por item):

```bash
rg -n "gerar-agenda|GerarAgenda|dataInicio|dataFim" src/app/api/agenda/gerar src/features/agenda
rg -n "bairro|cep|estado|format-endereco" src/features/unidades src/lib
rg -n "cidade|useConsultaCep|senha|repasse|gerar-contrato" src/features/profissionais
rg -n "prazo_retorno|tem_retorno|PROC-" src/app/api/procedimentos src/features/procedimentos
rg -n "origemDetalhe|vinculoTipos|precisaNf" src/features/pacientes src/app/api/pacientes
rg -n "excluir-agenda|justificativa|notificacoes" src/features/agenda src/app/api/agenda/excluir
rg -n "Disponível • Novo|30min" src/features/agenda/components
rg -n "Novo produto|margem" src/features/estoque
rg -n "Selecione o paciente|pacienteId" src/features/agenda/modals/novo-agendamento-modal.tsx
rg -n "especialista|profissional_id" src/app/api/agenda/route.ts
```

- [ ] **Step 2: Preencher Gate código**

Regras:
- Item 3 → `N/A` (não-bug) se `gerar-slots` só alerta dias sem grade.
- Item 4 → `N/A` (operacional) se não houver UI de wipe.
- Item 11 → `FAIL` se `agenda-week-view.tsx` ainda tiver CTA “Disponível • Novo agendamento” em `day.items.length === 0` **ou** badge literal `30min`.
- Item 16 → `FAIL` se modal só tiver `Select` de pacientes sem busca/criação rápida.
- Demais: `PASS` só com path concreto na coluna Evidência; senão `FAIL`.

- [ ] **Step 3: Atualizar canvas depara (opcional mas recomendado)**

Arquivo: `C:\Users\tcamp\.cursor\projects\c-Desenvolvimento-Dizevolv-integrallys-new-main\canvases\integrallys-depara-bugs.canvas.tsx`  
Sincronizar vereditos com a matriz após o gate código.

---

### Task 3: Gate vídeo/referência — cruzar v1–v4

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md`
- Read: `.video-frames/REFERENCE.md`, frames `v1`…`v4`, paths originais dos `.mp4`

**Interfaces:**
- Consumes: mapping vídeo→itens
- Produces: coluna `Gate vídeo/ref` + possíveis **requisitos extras** do vídeo 3

- [ ] **Step 1: Revisar REFERENCE + amostras de frames**

| Vídeo | Itens | O que validar na ref |
|-------|-------|----------------------|
| v1 | 1,2,5 | Gerar período; cadastros; sem grade fantasma |
| v2 | 9 | Fluxo financeiro/cartões/bancos pedido |
| v3 | 8,11 + ? | Procedimento retorno; se pede vínculo/cobrança **no slot** da agenda → anotar como EXTRA |
| v4 | 16 | Clínica Total: busca/cadastro rápido vs modal Integrallys select-only |

- [ ] **Step 2: Preencher Gate vídeo/ref**

- `PASS` se o código/comportamento esperado cobre o vídeo.
- `FAIL` se o vídeo exige UX ausente (ex.: 16).
- Se vídeo 3 exigir vínculo de procedimento/cobrança no agendamento **além** do item 8: criar seção no final da matriz:

```markdown
## EXTRA (não está como item numerado no report)
| ID | Descrição | Origem | Decisão |
|----|-----------|--------|--------|
| EXTRA-V3-1 | … | vídeo 3 | Incluir nesta sprint / Adiar / Fora de escopo |
```

Não implementar EXTRA sem decisão explícita do usuário na Task 5.

---

### Task 4: Gate QA runtime — executar checklist no ambiente alvo

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md`

**Interfaces:**
- Consumes: checklist Task 1
- Produces: coluna `Gate QA` + Status final preliminar

- [ ] **Step 1: Definir ambiente**

Preencher no topo da matriz: URL, usuário recepção/gestor/especialista de teste, commit/deploy.

- [ ] **Step 2: Rodar checklist marcando PASS/FAIL por item**

Usar browser (Playwright MCP ou manual). Para cada FAIL, anexar nota curta (ex.: “week view 24/08 ainda mostra Disponível”).

- [ ] **Step 3: Fechar Status final**

```
Confirmado     = código PASS + (vídeo PASS ou N/A) + QA PASS
Corrigir       = qualquer FAIL material
N/A documentado = 3,4,17-20 (com nota)
```

Itens 12–15: se QA PASS, Status `Confirmado` e ação “atualizar report para Finalizado”.  
Se QA FAIL, Status `Corrigir` mesmo com código aparentemente Done.

---

### Task 5: Decisão de escopo EXTRA + lista de correções

**Files:**
- Modify: `docs/superpowers/specs/2026-08-20-matriz-evidencia-report-bugs.md`
- Create: `docs/superpowers/plans/2026-08-20-correcoes-pos-auditoria.md` (se houver EXTRA ou fails novos)

**Interfaces:**
- Consumes: Status final Task 4
- Produces: backlog ordenado para Tasks 6+

- [ ] **Step 1: Listar todos os `Corrigir`**

Ordem padrão sugerida:
1. Item 16 (Missing / vídeo 4) — se ainda FAIL
2. Item 11 week view + badge duração — se ainda FAIL
3. Qualquer 12–15 que falhou QA
4. EXTRA-V3-* somente se usuário aprovou

- [ ] **Step 2: Pedir confirmação do usuário se EXTRA-V3 existir**

Não avançar EXTRA sem “sim”.

- [ ] **Step 3: Congelar backlog**

Só os itens `Corrigir` aprovados entram nas Tasks 6–8.

---

### Task 6: Corrigir item 11 — week view sem grade fantasma + duração real

**Files:**
- Modify: `src/features/agenda/components/agenda-week-view.tsx`
- Modify: `src/features/agenda/components/agenda-day-view.tsx` (se badge `30min` hardcoded também lá — linhas ~152)
- Test: preferir teste de componente se já houver padrão; senão checklist QA reexecutado

**Interfaces:**
- Consumes: `weekAgendaGroups` / `AgendaSlot` (ver `agenda.types`)
- Produces: day vazio = empty state (“Nenhuma agenda gerada” / sem CTA Disponível); duração = `item.duracao` ou equivalente se existir no tipo

- [ ] **Step 1: Inspecionar tipo `AgendaSlot` para campo de duração**

Arquivo: `src/features/agenda/agenda.types.ts`  
Se não houver duração no slot, usar omitir badge ou calcular de horário fim-início; **não** hardcodar `30min`.

- [ ] **Step 2: Alterar empty state da week view**

Substituir o botão “Disponível • Novo agendamento” quando `day.items.length === 0` por empty state alinhado ao day view (mensagem de nenhuma agenda / sem CTA que finja slot gerado). Manter navegação de data se necessário via click no header do dia, não via fake “Disponível”.

- [ ] **Step 3: Remover/substituir badge `30min` hardcoded**

Em `agenda-week-view.tsx` e `agenda-day-view.tsx` onde houver literal `30min`.

- [ ] **Step 4: Re-rodar QA dos checks Agenda / 1,5,11,13**

Expected: week vazia sem “Disponível”; badge não mente 30min.

- [ ] **Step 5: Atualizar matriz item 11 → Confirmado se PASS**

---

### Task 7: Corrigir item 16 — autocomplete + cadastro rápido no modal de agendamento

**Files:**
- Modify: `src/features/agenda/modals/novo-agendamento-modal.tsx`
- Create (se necessário): `src/features/agenda/modals/cadastro-rapido-paciente.tsx` (ou seção no mesmo modal)
- Modify: caller que passa `patients` / `onSave` em `src/features/agenda/agenda-view.tsx` (ou equivalente)
- Modify: `src/app/api/pacientes/route.ts` se POST mínimo já existir — reutilizar
- Test: `src/features/agenda/modals/novo-agendamento-modal.test.tsx` (criar se não existir)

**Interfaces:**
- Consumes: lista de pacientes `{ id, nome }`; API POST pacientes com campos mínimos
- Produces: `pacienteId` válido após select ou após create rápido; payload `onSave` inalterado em shape

Requisito (vídeo 4 / report):
- Digitar nome → filtrar cadastrados
- Se não existir → UI de cadastro rápido: nome completo, telefone, data nascimento, CPF
- Após criar, selecionar o novo paciente e seguir agendamento

- [ ] **Step 1: Escrever teste falhando (comportamento)**

Exemplo Vitest + Testing Library:

```tsx
it('mostra opção de cadastro rápido quando a busca não acha paciente', async () => {
  // render NovoAgendamentoModal with patients=[{id:'1',nome:'Ana'}]
  // type 'João Inexistente' in patient search
  // expect screen.getByText(/cadastro rápido/i)
})
```

- [ ] **Step 2: Rodar teste — expect FAIL**

```bash
pnpm vitest run src/features/agenda/modals/novo-agendamento-modal.test.tsx
```

- [ ] **Step 3: Implementar busca + formulário rápido + POST paciente**

- Trocar `Select` puro por combobox/input filtrável.
- Botão/link “Cadastrar paciente rápido”.
- Validar CPF/telefone com helpers já usados em pacientes (não inventar máscara nova se já existir).
- Chamar API existente de criação; em sucesso setar `pacienteId`.

- [ ] **Step 4: Rodar teste — expect PASS**

- [ ] **Step 5: QA manual roteiro vídeo 4**

Expected: fluxo completo recepção cria paciente novo no modal e agenda.

- [ ] **Step 6: Matriz item 16 → Confirmado**

---

### Task 8: Corrigir demais `Corrigir` (12–15 / EXTRA) se a Task 4 falhou

**Files:**
- Depende da matriz — só tocar arquivos listados na evidência do FAIL

**Interfaces:**
- Consumes: backlog Task 5
- Produces: cada item revalidado Confirmado

- [ ] **Step 1: Para cada FAIL restante, reproduzir + corrigir o menor diff**

Não refatorar módulos vizinhos.

- [ ] **Step 2: Re-QA só daquele item**

- [ ] **Step 3: Atualizar matriz**

Se a Task 4 não gerou nenhum FAIL além de 11/16, marcar esta Task como **N/A** na matriz e pular.

---

### Task 9: Sincronizar report do cliente + fechar depara

**Files:**
- Modify: (opcional export) cópia local do status sugerido em `docs/superpowers/specs/2026-08-20-status-sugerido-report.md`
- Modify: canvas `integrallys-depara-bugs.canvas.tsx`

**Interfaces:**
- Consumes: Status final Confirmado/Corrigir
- Produces: texto para colar no `.docx` / planilha do cliente

- [ ] **Step 1: Gerar tabela status sugerido**

```markdown
| # | Status atual no doc | Status sugerido | Comentário Dizevolv |
|---|---------------------|-----------------|---------------------|
| 12 | Em andamento | Finalizado | QA PASS em … |
…
```

- [ ] **Step 2: Atualizar canvas depara com status pós-auditoria**

- [ ] **Step 3: Entregar ao usuário a lista do que colar no report + o que ainda está Corrigir (deve ser zero se meta 100% atingida)**

Critério de pronto da revisão completa:
- Itens 1–16 todos `Confirmado` ou `N/A documentado`
- Zero `Corrigir` aberto
- EXTRA ou adiado por escrito

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| 3 gates (código/vídeo/QA) | 2, 3, 4 |
| Matriz de evidência | 1 |
| Correções 11 e 16 | 6, 7 |
| Fails inesperados 12–15 | 8 |
| EXTRA vídeo 3 com gating | 3, 5 |
| Sync report | 9 |
| Item 4 sem feature wipe | Global Constraints |

Sem placeholders TBD de implementação nas Tasks 6–7; Task 8 é condicional por design.
