# Confirmações do Roadmap — INTEGRALLYS / Natur & Vida

**Referência:** [Roadmap rev. 4 (21/08/2026)](https://docs.dizevolv.com/d/integrallys/roadmap-do-cliente--VrJCg_UJAQWO/)  
**Atualizado em:** 01/09/2026 (verificação automatizada + preparação homologação)

Este documento registra o resultado da verificação dos pontos marcados como **Confirmar** / **A verificar** no de-para contratual.

---

## Resumo

| Ponto | Verificação em código | Testes automatizados | Homologação manual |
|-------|----------------------|----------------------|-------------------|
| QA-1.5 · Latência prontuário ao vivo | OK | OK (`use-prontuario-live-sync.test.ts`) | Pendente (staging) |
| Gatilho imutabilidade prescrição | OK (Opção A provisória) | OK (`prescricao-immutability.test.ts`) | Decisão cliente (QA-2.4) |
| RN-06 · Visual Natur & Vida | OK (`theme-natur` + `ClinicaThemeProvider`) | N/A | Pendente (sessão visual) |

---

## 1. QA-1.5 — Prontuário ao vivo

### Verificado no código

- `useProntuarioLivePublish`: BroadcastChannel imediato + PUT throttled **350 ms**
- `useProntuarioLiveSubscribe`: poll **500 ms** + descarte de updates antigos
- Latência teórica máxima (sem RTT): **850 ms** (`PRONTUARIO_LIVE_MAX_SYNC_MS`)
- Viewer hardware: `/prontuarios?hardware=1&paciente_id=…` sem sidebar/header
- API `live-draft` com validação de escopo/unidade

### Testes automatizados (01/09/2026)

```bash
npm test -- src/hooks/use-prontuario-live-sync.test.ts src/lib/prescricao-immutability.test.ts
# 6 passed (6)
```

| Caso | Resultado |
|------|-----------|
| Constantes 350 ms / 500 ms | **OK** |
| Descarte de timestamp antigo | **OK** |
| Imutabilidade Convertida/Cancelada | **OK** |
| Ativa/Pendente editáveis (Opção A) | **OK** |

### Homologação manual (executar em staging)

| # | Cenário | Resultado esperado | Status |
|---|---------|-------------------|--------|
| 1.5.2 | Mesma estação (BC) | Texto quase instantâneo, sem toast de reload | ☐ |
| 1.5.3 | Aparelho separado (poll) | Atualização ≤ ~1 s | ☐ |
| 1.5.4 | Indicador | Só "Ao vivo", sem pedido de recarga | ☐ |

**Registro de latência observada (preencher na sessão):**

| Cenário | Latência medida | OK / FALHA | Observações |
|---------|-----------------|------------|-------------|
| Mesma estação | | ☐ | |
| Aparelho separado | | ☐ | |

---

## 2. Gatilho da imutabilidade da prescrição

### Comportamento implementado (Opção A — provisória)

| Status | Editável? | Motivo |
|--------|-----------|--------|
| `Convertida` | Não | Venda concluída — HTTP 409 |
| `Cancelada` | Não | Cancelada — HTTP 409 |
| `Ativa` | Sim | Assinada pelo especialista; recepção ainda pode ajustar antes da venda |
| `Pendente` | Sim | Prescrição complementar / fluxo portal |
| `Rascunho` | Sim | Rascunho do especialista |

**Fluxo real:** especialista grava `Ativa` (não `Pendente`). Botão da recepção sem pagamento: *"Salvar prescrição ativa"* → status `Ativa`.

### Decisão pendente — Natur & Vida

Pergunta para homologação:

> A prescrição deve ser **imutável após assinatura do especialista** (`Ativa`) ou **somente após venda** (`Convertida`)?

| Opção | Descrição | Impacto se escolhida |
|-------|-----------|---------------------|
| **A (atual)** | Imutável só em `Convertida`/`Cancelada` | Nenhuma alteração de código |
| **B** | Imutável também em `Ativa` (e possivelmente `Pendente`) | Incluir status em `IMMUTABLE_PRESCRIPTION_STATUSES` + ocultar editar na UI |

**Decisão registrada:** ☐ Opção A &nbsp; ☐ Opção B &nbsp; **Responsável:** _____________ **Data:** _____________

### QA-2.4 — Prescrição Ativa editável (novo)

| # | Passo | Resultado esperado | Status |
|---|--------|-------------------|--------|
| 2.4.1 | Especialista cria e assina prescrição | Status **Ativa** na lista | ☐ |
| 2.4.2 | Recepção abre **Editar** na mesma prescrição | Modal abre; alteração salva com sucesso | ☐ |
| 2.4.3 | Converter em venda (`Convertida`) | Editar/Excluir somem; API retorna 409 se forçado | ☐ |

---

## 3. RN-06 — Padrão visual Natur & Vida

### Implementado em código (01/09/2026)

1. Tema padrão **Integrallys azul** (`#0039A6`) — classe `theme-natur` **não** ativada por padrão (verde só se aplicada manualmente ou via config da clínica)
2. **`ClinicaThemeProvider`** aplica `cor_primaria` da unidade em `--app-primary` quando configurada em **Configurações → Identidade da Clínica**
3. Tela grande (`?hardware=1`): tipografia ampliada (`text-xl`–`text-4xl`) e navegação simplificada (sem sidebar/header)

### Homologação visual (sessão com cliente)

| # | Item | Referência Natur & Vida | Status |
|---|------|------------------------|--------|
| RN-06.1 | Cor primária verde no app | Comparar login + sidebar + botões | ☐ |
| RN-06.2 | Logo da clínica | Config → Identidade; documentos gerados | ☐ |
| RN-06.3 | Letras grandes | Modo hardware na consulta | ☐ |
| RN-06.4 | Navegação simplificada | Modo hardware vs. app normal | ☐ |

**Aprovação visual:** ☐ Aprovado &nbsp; ☐ Ajustes necessários — **Notas:** _____________

---

## Arquivos alterados nesta verificação

- `src/hooks/use-prontuario-live-sync.ts` — constantes exportadas + helper de timestamp
- `src/hooks/use-prontuario-live-sync.test.ts` — QA-1.5 automatizado
- `src/lib/prescricao-immutability.ts` — regra centralizada
- `src/lib/prescricao-immutability.test.ts` — QA-2.3/2.4
- `src/app/api/prescricoes/route.ts` — usa helper de imutabilidade
- `src/app/layout.tsx` — `theme-natur`
- `src/components/global/clinica-theme-provider.tsx` — RN-06 shell
- `src/app/providers.tsx` — integra theme provider
- `src/features/prescricoes/modals/nova-venda-modal.tsx` — label alinhado ao status `Ativa`
