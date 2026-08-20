# Matriz de evidência — Report Bugs Integrallys (2026-08-20)

Ambiente QA: local — http://localhost:3000  
Branch/commit: feat/revisao-completa-report-bugs (working tree; QA 2026-08-20)  
Usuários teste: QA manual via canvas `qa-report-bugs-checklist`  
URL: http://localhost:3000

| # | Pedido (1 linha) | Vídeo | Gate código | Gate vídeo/ref | Gate QA | Status final | Evidência (path/nota) | Ação |
|---|------------------|-------|-------------|----------------|---------|--------------|------------------------|------|
| 1 | Agenda por período / gerar | v1 | PASS | PASS | PASS | Confirmado | `gerar-agenda-modal.tsx`; `api/agenda/gerar` — QA local PASS | — |
| 2 | Cadastros iniciais | v1 | PASS | PASS | PASS | Confirmado | Unidades/profissionais/procedimentos/pacientes/estoque/financeiro — QA PASS | — |
| 3 | Alerta sáb/dom gerar | — | N/A | N/A | N/A | N/A documentado | Não é bug — alerta informativo dias sem grade | — |
| 4 | Zerar dados seed | — | N/A | N/A | N/A | N/A documentado | Operacional; sem UI de wipe | — |
| 5 | Sem horários antes de gerar | v1 | PASS | PASS | PASS | Confirmado | Day empty sem grade fantasma — QA PASS | — |
| 6 | Unidade bairro/CEP/UF | — | PASS | N/A | PASS | Confirmado | Form + listagem endereço — QA PASS | — |
| 7 | Profissionais filiais/repasse/contrato/docs | — | PASS | N/A | PASS | Confirmado | Modal profissional completo — QA PASS | — |
| 8 | Procedimento valor/duração/retorno/código | v3 | PASS | PASS | PASS | Confirmado | Retorno + código auto — QA PASS | — |
| 9 | Financeiro/cartões/bancos | v2 | PASS | PASS | PASS | Confirmado | Formas/cartões/gestão bancária — QA PASS | — |
| 10 | Paciente origem/vínculo/NF | — | PASS | N/A | PASS | Confirmado | origemDetalhe / multi vínculo / precisaNf — QA PASS | — |
| 11 | Empty agenda + intervalo + excluir | v1/v3 | PASS | PASS | PASS | Confirmado | Week empty + duração dinâmica + excluir — fix Task 6 + QA PASS | — |
| 12 | Cidade/CEP + revisar 7 | — | PASS | N/A | PASS | Confirmado | useConsultaCep + cidade — QA PASS | — |
| 13 | Regenerar agenda com novo intervalo | — | PASS | N/A | PASS | Confirmado | Regeneração idempotente — QA PASS | — |
| 14 | Cadastro produtos estoque | — | PASS | N/A | PASS | Confirmado | Novo produto custo/venda/margem — QA PASS | — |
| 15 | Agenda especialista + senha user | — | PASS | N/A | PASS | Confirmado | Escopo especialista + senha — QA PASS | — |
| 16 | Cadastro rápido no + agenda | v4 | PASS | PASS | PASS | Confirmado | Autocomplete + cadastro rápido — fix Task 7 + QA PASS | — |
| 17-20 | Vazios | — | N/A | N/A | N/A | N/A documentado | | — |

Valores Gate: `PASS` | `FAIL` | `N/A` | `SKIP`  
Status final: `Confirmado` | `Corrigir` | `N/A documentado` | `Pendente QA`

## Checklist QA (por item — marcar no ambiente)

> **QA browser local concluído 2026-08-20** — canvas `qa-report-bugs-checklist`: **PASS 14 · FAIL 0 · N/A 2 (itens 3–4)**.

### Agenda / 1,5,11,13
- [x] Sem slots inventados quando não há agenda gerada (day view)
- [x] Week view: dia sem slots NÃO mostra "Disponível • Novo agendamento"
- [x] Gerar agenda respeita `duracao_min` da grade
- [x] Regenerar período limpa Disponíveis antigos e cria novos intervalos
- [x] Excluir agenda exige justificativa e cria notificação gestor/admin

### Cadastros / 2,6,7,8,10,12,14
- [x] Unidade: bairro, CEP, estado; listagem com endereço
- [x] Profissional: filiais, repasse, cidade, CEP lookup, senha, contrato
- [x] Procedimento: valor, duração, retorno, código auto
- [x] Paciente: origem detalhe, multi vínculo, precisa NF
- [x] Estoque: Novo produto com custo/venda/margem/unidade

### Financeiro / 9
- [x] Telas cartões / gestão bancária / formas pagamento acessíveis e salvam

### Especialista / 15
- [x] Login profissional vê só seus agendamentos
- [x] Criar/editar profissional define senha inicial

### Cadastro rápido / 16
- [x] Digitar nome no modal agenda → autocomplete
- [x] Nome inexistente → formulário rápido nome/tel/nasc/CPF → agenda com paciente novo

## EXTRA (não está como item numerado no report)

| ID | Descrição | Origem | Decisão |
|----|-----------|--------|--------|
| EXTRA-V3-1 | Vínculo de procedimento no slot/fluxo de agendamento | vídeo 3 | **Adiar** |
| EXTRA-V3-2 | Coluna/ícone Alertas no slot da agenda | vídeo 3 / CT | **Adiar** |

## Critério de pronto da revisão

- [x] Itens 1–16 todos `Confirmado` ou `N/A documentado`
- [x] Zero `Corrigir` aberto
- [x] EXTRA adiado por escrito

**Pronto para commit** na branch `feat/revisao-completa-report-bugs`.
