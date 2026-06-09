# CLAUDE.md — Integrallys · Fonte Única de Verdade

> **Este arquivo é lido automaticamente pelo Claude Code em toda sessão.**
> Nenhuma tarefa, decisão de implementação ou mudança de escopo pode ser feita sem consultar este arquivo e o `tasks_incremental.md`.

> ⚠️ **Nota 2026-05-21**: `tasks.md` referenciado abaixo **não existe mais**
> no repositório. A fonte de verdade ativa é `tasks_incremental.md`. Várias
> menções a `tasks.md` no texto abaixo são históricas — leia como
> "`tasks_incremental.md`" até o doc ser reescrito. A arquitetura multi-agente
> aspiracional foi removida (specs `agents/agent-*.md` e `orchestrator.md`
> não estão mais em uso — coordenação é manual, uma sessão Claude Code por vez).

---

## 🔴 REGRAS ABSOLUTAS — LEIA ANTES DE QUALQUER COISA

1. **O arquivo `tasks.md` é a ÚNICA fonte de verdade deste projeto.** Nenhuma funcionalidade deve ser implementada, alterada ou removida sem que exista uma tarefa correspondente nele.

2. **Proibido trabalhar em tarefas não listadas.** Se você identificar algo que parece um bug ou melhoria mas não está no `tasks.md`, você PARA e pergunta antes de agir.

3. **Proibido assumir que uma tarefa está feita.** Só marque `[x]` após verificar no código que a implementação existe, está funcional e cobre todos os sub-itens do checklist.

4. **Proibido implementar pela metade.** Cada `- [ ]` dentro de uma tarefa é obrigatório. Se não conseguir completar todos os sub-itens, informe quais ficaram pendentes e o motivo — nunca marque a tarefa como concluída parcialmente sem avisar.

5. **Proibido alucinação de contexto.** Não invente nomes de componentes, rotas, tabelas do Supabase ou lógicas de negócio. Se não encontrar no código, diga "não encontrado" e pergunte.

6. **Uma tarefa por vez.** Nunca trabalhe em múltiplas tarefas simultaneamente. Conclua, registre e aguarde confirmação antes de avançar.

7. **Sem refatorações silenciosas.** Se precisar refatorar algo para implementar uma tarefa, sinalize antes de fazer. Mudanças estruturais não solicitadas são proibidas.

---

## 📁 Arquivos de Tarefas

| Arquivo | Conteúdo |
|---------|----------|
| `tasks.md` | Fonte principal — todos os feedbacks do documento + calls + vídeos |
| `tasks_incremental.md` | Tarefas incrementais das calls — **sempre validar `tasks.md` antes de iniciar** |
| `IMPL_DOCUMENTOS_EDITAVEIS.md` | Spec de implementação dos 9 modelos de documentos clínicos (templates, variáveis, tabelas, RLS, fluxos por perfil). **Consulta obrigatória** ao trabalhar em TAREFA-052, TAREFA-057, CR-M19-F e CR-REV-G. |

> Toda tarefa do `tasks_incremental.md` possui uma seção **"Valida:"** indicando quais tarefas do `tasks.md` devem estar concluídas antes de iniciar. Nunca ignore essa dependência.

---

## 📁 Estrutura do Projeto

```
/
├── app/                  # Rotas Next.js (App Router)
│   ├── (recep)/          # Módulo Recepção
│   ├── (gestor)/         # Módulo Gestor
│   ├── (admin)/          # Módulo Administrador
│   ├── (especialista)/   # Módulo Especialista
│   └── (paciente)/       # Portal do Paciente
├── components/           # Componentes reutilizáveis
├── lib/                  # Helpers, utils, clients
│   └── supabase/         # Cliente Supabase + queries
├── hooks/                # Custom hooks
├── types/                # Tipos TypeScript globais
├── tasks.md              # ← FONTE DE VERDADE DE TAREFAS
└── CLAUDE.md             # ← ESTE ARQUIVO
```

> Se a estrutura acima divergir do que você encontrar no repositório, **sinalize imediatamente** antes de continuar.

---

## 🗃️ Stack Técnico

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js (App Router) |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| ORM / Queries | Supabase JS Client |
| Estilização | (verificar no projeto) |
| Deploy | (verificar no projeto) |

---

## 🔄 Fluxo Obrigatório para Cada Tarefa

```
1. CONSULTAR   → Abrir tasks.md, localizar a tarefa pelo ID (ex: TAREFA-001)
2. ENTENDER    → Ler TODOS os sub-itens antes de escrever uma linha de código
3. MAPEAR      → Identificar quais arquivos do projeto são afetados
4. CONFIRMAR   → Se houver ambiguidade, perguntar antes de implementar
5. IMPLEMENTAR → Cobrir cada sub-item do checklist, um por vez
6. VERIFICAR   → Testar o fluxo completo (não só o componente isolado)
7. REGISTRAR   → Atualizar o tasks.md marcando [x] e anotando o(s) arquivo(s)
8. REPORTAR    → Informar o que foi feito, o que foi alterado e se há dependências
```

---

## 📋 Como Ler o tasks.md

```markdown
### TAREFA-001 · Título da tarefa (Item X · DD/MM/AA) [STATUS: Finalizado]
- [ ] Sub-item ainda não implementado
- [x] Sub-item já implementado
```

- **ID**: `TAREFA-NNN` (documento), `TAREFA-VNN` (vídeos), `TAREFA-CRNN` (change requests)
- **[STATUS]**: indica o que a equipe registrou — mas você deve **verificar no código**, pois o status pode estar desatualizado
- **Sub-itens**: cada `- [ ]` é um requisito independente e obrigatório

---

## 🗄️ Convenções Supabase

- **Nunca** escreva SQL raw sem verificar se já existe uma função/query em `lib/supabase/`
- **Sempre** use Row Level Security (RLS) — verifique se a tabela tem políticas antes de fazer queries
- **Nomenclatura de tabelas**: verificar no Supabase antes de assumir nomes
- Queries de leitura: usar `.select()` com campos explícitos, nunca `select('*')` em produção
- Mutations: sempre tratar o retorno `{ data, error }` — nunca ignore o `error`

---

## 👤 Perfis de Usuário (Módulos)

| Perfil | Identificador no código |
|--------|------------------------|
| Recepcionista | `user@recep` |
| Especialista | `d@especialista` |
| Gestor | `d@gestor` |
| Administrador | `d@admin` |
| Paciente | portal do paciente |
| Master | acesso total |

> Cada perfil tem permissões diferentes. **Nunca** implemente uma funcionalidade sem verificar em qual(is) perfil(is) ela deve aparecer — isso está descrito em cada tarefa no `tasks.md`.

---

## ⛔ O que Fazer Quando Travar

Se você encontrar qualquer uma das situações abaixo, **PARE e reporte** antes de continuar:

- A tarefa exige uma tabela no Supabase que não existe
- O componente de UI que deveria existir não foi encontrado
- A tarefa depende de outra tarefa que ainda não foi implementada
- O requisito está ambíguo ou contraditório com o que existe no código
- A implementação exigiria alterar mais de 3 arquivos não relacionados à tarefa
- Você encontrou um bug crítico que não está no `tasks.md`

**Formato do reporte:**
```
⚠️ BLOQUEIO em TAREFA-XXX
Motivo: [descrição clara]
Preciso de: [o que você precisa para continuar]
Sugestão: [opcional — sua proposta de solução]
```

---

## ✅ Formato do Registro de Conclusão

Ao finalizar uma tarefa, atualize o `tasks.md` e reporte no seguinte formato:

```
✅ TAREFA-XXX concluída
Arquivos alterados:
  - app/(modulo)/pagina.tsx
  - components/ComponenteX.tsx
  - lib/supabase/queryX.ts

Sub-itens implementados: 4/4
Observações: [se houver algo relevante]
Pendências: [se algum sub-item ficou para depois, explique por quê]
```

---

## 🚫 Comportamentos Proibidos (Resumo Rápido)

| Proibido | Por quê |
|----------|---------|
| Implementar sem tarefa no tasks.md | Gera escopo não rastreável |
| Marcar [x] sem verificar no código | Falsa sensação de progresso |
| Trabalhar em 2+ tarefas ao mesmo tempo | Dificulta revisão e rollback |
| Assumir nome de tabela/coluna do Supabase | Causa bugs silenciosos |
| Refatorar silenciosamente | Quebra o que está funcionando |
| Ignorar sub-itens de uma tarefa | Entrega incompleta |
| Criar componentes sem verificar se já existe | Duplicação de código |
| Inventar lógica de negócio não descrita | Contradiz o produto real |