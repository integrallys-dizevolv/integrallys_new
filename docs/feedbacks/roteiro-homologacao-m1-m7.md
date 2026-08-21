# Roteiro de homologação — Módulos 1 a 7 + cláusula 4

> **Passo a passo completo (QA):** ver [`qa-homologacao-m1-m7.md`](./qa-homologacao-m1-m7.md)  
> Este arquivo é só a checklist rápida. Marque após executar o QA.

## Pré-requisitos

- [ ] Migrations `095`, `096`, `097`, `098` aplicadas
- [ ] Pelo menos 1 centro de custo criado (`POST /api/centros-custo`)
- [ ] Campo personalizado de anamnese criado
- [ ] `chatbot.webhook_token` configurado (se for testar Módulo 6)
- [ ] Perfis: recepção, especialista, gestor/admin

## Módulo 1 — Agenda e Prontuário

- [ ] Gerar/usar agenda a partir da grade do profissional
- [ ] Abrir atendimento e **Tela Grande** (`?hardware=1`)
- [ ] Anamnese com campos fixos + campos personalizados
- [ ] Finalizar atendimento e **editar** prontuário depois (auditoria)
- [ ] Tela grande ao vivo: digitar no atendimento atualiza viewer sem reload (mesmo PC + outro device)

## Módulo 2 — Prescrição + estoque

- [ ] Especialista prescreve **sem** ver preços (lista + histórico do atendimento)
- [ ] Recepção vende com desconto/vendedor e vê valores
- [ ] Prescrição Convertida: não edita/exclui
- [ ] Baixa de estoque ao converter

## Módulo 3 — Estoque inteligente

- [ ] Cadastro com lote, validade, mínimo, UoM, preços
- [ ] **Edição** altera lote/validade/mínimo/preços
- [ ] Alerta de mínimo = quantidade ≤ estoque mínimo

## Módulo 4 — Financeiro + DRE

- [ ] DRE períodos: diário, **semanal**, mensal, trimestral, anual
- [ ] Centro de custo no filtro do DRE
- [ ] (Opcional) Lançamento com `centroCustoId` via API

## Módulo 5 — CRM

- [ ] Funil CRM / estágios
- [ ] Aba **Inadimplência** em Pacientes
- [ ] Link para financeiro vencido (se houver dados)

## Módulo 6 — Disparos e assistente

- [ ] Disparos (lembrete, pós-consulta, aniversário, campanha)
- [ ] Chatbot: webhook com token; fail-closed sem token
- [ ] Aceitar como **assistente por regras** (não LLM)

## Módulo 7 — Governança

- [ ] Relatório **Ranking** (mais vendidos / lucrativos)
- [ ] Relatório **Comparativo** entre unidades + CSV
- [ ] Isolamento: usuário de unidade A não lista pacientes de B

## Cláusula 4 — Regras críticas

- [ ] Especialista sem preços (atendimento, estoque, relatório)
- [ ] Só recepção/gestão com valores na venda
- [ ] Prescrição imutável após Convertida
- [ ] DRE refletindo lançamentos reais
- [ ] Multiunidade auditável
- [ ] Visual/tema clínica confirmado visualmente

## Chatbot staging (ops)

- [ ] Token em Configurações
- [ ] Cron de disparos
- [ ] Evolution apontando para `/api/whatsapp/webhook`

Ver também: [`checklist-golive-depara.md`](./checklist-golive-depara.md)
