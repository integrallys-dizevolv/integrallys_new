# scripts/ — Guard de drift código ⇄ banco

Garante que o uso do Supabase em `src/` continue batendo com o schema real do
banco (tabelas, colunas, embeds, RPCs, enums). Pega bugs como "coluna que não
existe" **antes** de virarem 500 em produção.

## Arquivos

| Arquivo | O que faz |
|---------|-----------|
| `db-contract.json` | Snapshot do schema (tabelas/colunas/enums/funções/FKs). Commitado. |
| `validate-db.mjs` | **O guard.** Cruza `src/` contra o snapshot. Sem dependências, não acessa o banco. Sai `1` em divergência. |
| `refresh-db-contract.mjs` | Regenera o snapshot a partir do banco. Requer `pg` + conexão. |

## Uso

```bash
# checar o código contra o snapshot (CI / pre-push / local)
npm run validate:db

# após aplicar uma migration que muda o schema, atualizar o snapshot:
DATABASE_URL="postgresql://postgres:SENHA@HOST:5432/postgres" npm run db:contract
```

> Conexão do `db:contract`: use `DATABASE_URL` ou as variáveis
> `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`. Prefira a **Session pooler** do
> Supabase (a Direct connection é IPv6-only).

## O que o validador detecta

- `.from("t")` → tabela inexistente
- `.select("col,…")` → coluna inexistente (na tabela e em embeds aninhados)
- embed `t(…)` ambíguo → mais de uma FK p/ a mesma tabela sem hint `!` (PGRST201)
- `.rpc("fn", {args})` → função inexistente / args que não batem
- `.insert/.update/.upsert({…})` → chave que não é coluna
- valor de enum em insert/update → literal fora dos valores válidos

É uma heurística (parser de regex), não um type-checker — cobre os padrões
comuns do `@supabase/supabase-js`. Atualize `db-contract.json` quando o schema
mudar para evitar falso-positivo/negativo.
