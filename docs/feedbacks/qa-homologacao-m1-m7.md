# QA Homologação — INTEGRALLYS / Natur & Vida

**Versão:** 21/08/2026  
**Escopo:** De-para cláusula 3 (Módulos 1–7) + cláusula 4 (RNs críticas)  
**Critério de passe:** cada caso tem *Resultado esperado* objetivo. Marque `OK` / `FALHA` / `N/A`.  
**Referência:** `docs/feedbacks/depara-integrallys-210826.html`

---

## 0. Preparação (fazer uma vez)

### 0.1 Ambiente

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 0.1.1 | Confirmar URL do ambiente de teste (staging/homolog) | App abre login | ☐ |
| 0.1.2 | Aplicar no Supabase as migrations `095`, `096`, `097`, `098` | Sem erro SQL; tabelas `centros_custo`, `prontuario_live_drafts`, colunas `campos_extras` / versões de prontuário existem | ☐ |
| 0.1.3 | Ter 2 unidades cadastradas (ex.: Unidade A e Unidade B) | Visíveis em `/unidades` | ☐ |
| 0.1.4 | Ter produtos no estoque com lote, validade e estoque mínimo | Listados em `/estoque` | ☐ |

### 0.2 Contas de teste

| Perfil | Uso neste QA | Login preparado |
|--------|----------------|-----------------|
| **Recepção** | Agenda, venda, caixa | ☐ |
| **Especialista** | Atendimento, anamnese, prontuário, prescrição | ☐ |
| **Gestor / Admin** | DRE, relatórios, CRM, centros de custo, multiunidade | ☐ |
| **2º Especialista / 2º aparelho** (opcional) | QA-1.5 tela grande em aparelho separado (poll draft) | ☐ |

### 0.3 Seed rápido — centro de custo

Não há tela dedicada de cadastro. Criar via API (logado como gestor/admin no DevTools → Network, ou `curl` com cookie/JWT):

```http
POST /api/centros-custo
Content-Type: application/json

{ "nome": "Consultório 1" }
```

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 0.3.1 | Criar ao menos 1 centro de custo (API ou SQL) | GET `/api/centros-custo?ativos=1` retorna o nome | ☐ |

### 0.4 Seed — campo personalizado de anamnese

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 0.4.1 | Login **especialista** → menu **Anamnese** (`/anamnese`) | Página carrega; bloco **Campos personalizados** visível | ☐ |
| 0.4.2 | Adicionar campo (ex.: rótulo `Alergias`, tipo texto) e salvar | Toast de sucesso; campo permanece na lista após refresh | ☐ |

---

## Módulo 1 — Agenda e Prontuário Digital

**Perfis:** recepção + especialista  
**Rotas:** `/agenda`, `/anamnese`, `/prontuarios`

### QA-1.1 — Gerar / usar agenda

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 1.1.1 | Login **recepção** → **Agenda** | Grade do dia carrega | ☐ |
| 1.1.2 | Abrir/confirmar horário com paciente e profissional | Slot aparece com paciente | ☐ |
| 1.1.3 | (Se aplicável) Gerar grade a partir do profissional em **Profissionais** | Horários livres gerados para a semana | ☐ |

### QA-1.2 — Tela grande

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 1.2.1 | Na agenda, abrir o modal da consulta | Modal com ações | ☐ |
| 1.2.2 | Clicar **Tela Grande** | Nova aba/janela em `/prontuarios?paciente_id=…&hardware=1` **sem** sidebar/header | ☐ |
| 1.2.3 | Conferir URL | Contém `hardware=1` | ☐ |

### QA-1.3 — Anamnese com campos personalizados

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 1.3.1 | Login **especialista** → **Anamnese** → **Nova anamnese** | Modal abre | ☐ |
| 1.3.2 | Preencher paciente + campos fixos (peso, IMC, queixa, etc.) | Campos aceitam valores | ☐ |
| 1.3.3 | Preencher o campo personalizado criado em 0.4 | Campo aparece no formulário | ☐ |
| 1.3.4 | Salvar e reabrir a anamnese | Dados fixos + extras gravados | ☐ |

### QA-1.4 — Atendimento + edição pós-finalização

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 1.4.1 | Especialista na **Agenda** → **Iniciar atendimento** | Fluxo de atendimento abre | ☐ |
| 1.4.2 | Preencher prontuário / evolução e **finalizar** | Toast de sucesso; atendimento concluído | ☐ |
| 1.4.3 | Reabrir o mesmo paciente (prontuário ou atendimento) | Banner indica que o prontuário **permanece editável**; campos **não** estão travados | ☐ |
| 1.4.4 | Alterar um texto clínico e salvar | Salva sem erro | ☐ |
| 1.4.5 | (Opcional) Conferir no banco `prontuario_versoes` / auditoria | Snapshot da versão anterior existe | ☐ |

### QA-1.5 — Tela grande ao vivo (mesmo PC + outro aparelho)

> Verificação automatizada: `npm test -- src/hooks/use-prontuario-live-sync.test.ts`  
> Registro de latência manual: [`homologacao-confirmacoes-roadmap.md`](homologacao-confirmacoes-roadmap.md)

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 1.5.1 | Especialista inicia atendimento; abre **Tela Grande** (`?hardware=1&paciente_id=…`) | Viewer “ao vivo”, não a lista | ☐ |
| 1.5.2 | Digitar evolução no atendimento (mesma estação) | Texto aparece na tela grande **quase na hora** (BroadcastChannel), sem reload/toast | ☐ |
| 1.5.3 | Em outro aparelho/login, abrir a mesma URL hardware | Texto atualiza em **≤ ~1 s** via draft/poll | ☐ |
| 1.5.4 | Confirmar: **não** aparece toast pedindo recarregar | Só indicador “Ao vivo” | ☐ |

---

## Módulo 2 — Prescrição integrada ao estoque

**Perfis:** especialista + recepção  
**Rotas:** `/prescricoes`, atendimento (histórico), `/estoque`

### QA-2.1 — Especialista sem preços

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 2.1.1 | Login **especialista** → **Prescrição/Vendas** | Lista **sem** coluna de valor/R$ | ☐ |
| 2.1.2 | No atendimento, abrir histórico de itens/prescrições do paciente | **Não** aparece `valor unitário` / BRL nos itens | ☐ |
| 2.1.3 | (DevTools) Inspecionar resposta de `/api/atendimento/historico` | `valorUnitario` null/omitido; `meta.valoresVisiveis` = false (ou equivalente) | ☐ |

### QA-2.2 — Recepção vê valores e vende

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 2.2.1 | Login **recepção** → **Prescrição/Vendas** | Valores visíveis na venda | ☐ |
| 2.2.2 | Converter/vender prescrição com desconto e vendedor | Fluxo completa; total com desconto correto | ☐ |
| 2.2.3 | Conferir estoque do produto | Quantidade baixou | ☐ |

### QA-2.3 — Imutabilidade após Convertida

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 2.3.1 | Localizar prescrição com status **Convertida** | Status visível | ☐ |
| 2.3.2 | Conferir ações na linha | Botões **Editar** / **Excluir** ocultos; mensagem de imutável (se houver) | ☐ |
| 2.3.3 | (Opcional) Forçar PUT/DELETE na API | HTTP 409 `PRESCRIPTION_IMMUTABLE` | ☐ |

### QA-2.4 — Prescrição Ativa editável (decisão de negócio)

> Ver [`homologacao-confirmacoes-roadmap.md`](homologacao-confirmacoes-roadmap.md) — Opção A (atual) vs. Opção B (congelar após assinatura).

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 2.4.1 | Especialista cria e assina prescrição | Status **Ativa** (não `Pendente`) | ☐ |
| 2.4.2 | Recepção edita prescrição **Ativa** antes da venda | Salva sem erro | ☐ |
| 2.4.3 | Após converter para **Convertida** | Editar/Excluir bloqueados (QA-2.3) | ☐ |

---

## Módulo 3 — Estoque inteligente

**Perfil:** recepção ou gestor  
**Rota:** `/estoque`

### QA-3.1 — Cadastro e edição

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 3.1.1 | Abrir **Estoque** → novo produto (ou editar existente) | Modal com lote, validade, mínimo, preços, UoM | ☐ |
| 3.1.2 | Preencher lote, validade, estoque mínimo e preços → salvar | Persiste após refresh | ☐ |
| 3.1.3 | **Editar produto** → alterar lote/mínimo/preço → salvar | Valores atualizados na lista | ☐ |

### QA-3.2 — Alerta de mínimo

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 3.2.1 | Ajustar produto para `quantidade ≤ estoque mínimo` | Item entra em alerta / destaque de mínimo | ☐ |
| 3.2.2 | Subir quantidade acima do mínimo | Alerta de mínimo some | ☐ |

---

## Módulo 4 — Financeiro + DRE

**Perfil:** gestor / admin  
**Rotas:** `/dre`, `/financeiro`

### QA-4.1 — Períodos do DRE (inclui semanal)

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 4.1.1 | Abrir **DRE** (`/dre`) | Filtros de período visíveis | ☐ |
| 4.1.2 | Selecionar **Semanal** e um intervalo/data | DRE carrega (não erro); totais coerentes | ☐ |
| 4.1.3 | Repetir para Diário, Mensal, Trimestral, Anual | Todos carregam | ☐ |

### QA-4.2 — Centro de custo

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 4.2.1 | No DRE, abrir filtro **Centro de custo** | Lista inclui o centro criado em 0.3 | ☐ |
| 4.2.2 | Filtrar por esse centro | Resultado muda ou zera se não houver lançamentos vinculados | ☐ |
| 4.2.3 | (Opcional) Via API, criar lançamento com `centroCustoId` e filtrar de novo | Lançamento aparece só no centro correto | ☐ |

> **Nota:** o filtro no DRE está na UI; o cadastro do centro é via API/SQL. Lançamento com centro na tela de Financeiro pode exigir API se o modal ainda não expuser o campo.

---

## Módulo 5 — CRM de pacientes

**Perfil:** gestor / recepção  
**Rota:** `/pacientes`

### QA-5.1 — Funil CRM

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 5.1.1 | **Pacientes** → aba **CRM / Relacionamento** | Funil/estágios carregam | ☐ |
| 5.1.2 | Alterar estágio / observação / próxima ação de um paciente | Persiste após refresh | ☐ |

### QA-5.2 — Inadimplência

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 5.2.1 | Aba **Inadimplência** | Lista (ou vazia) sem erro de API | ☐ |
| 5.2.2 | Se houver linhas, abrir vínculo ao financeiro/paciente | Navegação coerente | ☐ |

---

## Módulo 6 — Disparos e assistente

**Perfil:** gestor / admin  
**Rota:** `/comunicacao`  
**Ops:** ver também `checklist-golive-depara.md`

### QA-6.1 — Disparos

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 6.1.1 | Abrir **Comunicação** | Tipos de disparo / campanhas visíveis | ☐ |
| 6.1.2 | Validar configuração de lembrete / pós-consulta / aniversário / campanha | Registros ou templates existem | ☐ |

### QA-6.2 — Webhook WhatsApp

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 6.2.1 | Em **Configurações**, definir `chatbot.webhook_token` | Token salvo; GET não devolve o valor em claro (mascarado) | ☐ |
| 6.2.2 | Chamar webhook **sem** token | Recusado (fail-closed) | ☐ |
| 6.2.3 | Chamar com token (header `x-webhook-token` ou query) | Aceito / processado | ☐ |
| 6.2.4 | Registrar com o cliente: assistente = **regras**, não LLM | Aceite explícito anotado | ☐ |

---

## Módulo 7 — Governança multiunidade

**Perfil:** gestor / admin  
**Rotas:** `/relatorios`, `/pacientes`

### QA-7.1 — Ranking

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 7.1.1 | **Relatórios** → aba **Ranking** | Tabelas mais vendidos e mais lucrativos | ☐ |
| 7.1.2 | Login **especialista** na mesma aba (se tiver acesso) | Colunas de receita/margem ocultas ou zeradas conforme sanitize | ☐ |

### QA-7.2 — Comparativo entre unidades

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 7.2.1 | Aba **Comparativo** | Linhas por unidade (agendamentos / receita / ticket) | ☐ |
| 7.2.2 | **Exportar CSV** | Arquivo baixa com dados do comparativo | ☐ |

### QA-7.3 — Isolamento por unidade

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 7.3.1 | Usuário vinculado só à Unidade A → **Pacientes** | Só pacientes da A (ou sem unidade cruzada) | ☐ |
| 7.3.2 | Tentar histórico de paciente da Unidade B (URL/API) | 403 / negado (exceto master/admin) | ☐ |

---

## Cláusula 4 — Regras críticas (checklist final)

| # | Regra | Como validar (resumo) | Status |
|---|--------|------------------------|--------|
| RN-01 | Especialista sem valores na prescrição | QA-2.1 | ☐ |
| RN-02 | Só recepção/gestão com valores na venda | QA-2.2 | ☐ |
| RN-03 | Prescrição imutável após Convertida | QA-2.3 + QA-2.4 | ☐ |
| RN-04 | DRE reflete fluxo real | QA-4.1 + lançamento recente aparece | ☐ |
| RN-05 | Unidade independente / auditável | QA-7.3 | ☐ |
| RN-06 | Visual Natur & Vida | Conferir logo/cores/fonte em Config. clínica (cor customizável por unidade) — ver [`homologacao-confirmacoes-roadmap.md`](homologacao-confirmacoes-roadmap.md) | ☐ |

---

## Ordem sugerida de execução (1 sessão)

1. **0.** Preparação + seeds (30–45 min)  
2. **M2** preços + **M3** estoque (críticos, rápidos)  
3. **M1** atendimento completo (mais longo)  
4. **M4** DRE + **M7** relatórios  
5. **M5** CRM  
6. **M6** + ops go-live  
7. **RN-06** visual com o cliente  

Tempo estimado total: **3–5 h** com 2 perfis + dados mínimos.

---

## Registro da sessão

| Campo | Preencher |
|-------|-----------|
| Data | |
| Ambiente / URL | |
| Executor (Dizevolv) | |
| Executor (Natur & Vida) | |
| Migrations aplicadas | 095 ☐ 096 ☐ 097 ☐ |
| Bloqueios encontrados | |
| Decisão / aceite parcial | |

### Contagem rápida

| Módulo | Casos | OK | FALHA | N/A |
|--------|-------|----|-------|-----|
| Prep 0 | | | | |
| M1 | | | | |
| M2 | | | | |
| M3 | | | | |
| M4 | | | | |
| M5 | | | | |
| M6 | | | | |
| M7 | | | | |
| RN | | | | |

---

## Anexos

- Checklist ops: `docs/feedbacks/checklist-golive-depara.md`  
- De-para atualizado: `docs/feedbacks/depara-integrallys-210826.html`  
- Checklist curto (só marcadores): `docs/feedbacks/roteiro-homologacao-m1-m7.md`
