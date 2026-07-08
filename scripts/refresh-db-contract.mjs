#!/usr/bin/env node
/**
 * refresh-db-contract.mjs — regenera scripts/db-contract.json a partir do banco.
 *
 * Rode SEMPRE que o schema mudar (nova migration aplicada), para o guard
 * `validate-db.mjs` continuar batendo com a realidade.
 *
 * Conexão (escolha uma):
 *   - DATABASE_URL="postgresql://postgres:SENHA@host:5432/postgres"
 *   - ou variáveis PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE
 *
 * Requer o driver `pg` (devDependency). Uso:
 *   DATABASE_URL=... node scripts/refresh-db-contract.mjs
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let pg;
try {
  pg = (await import("pg")).default;
} catch {
  console.error("✗ Driver 'pg' não encontrado. Instale com:  pnpm add -D pg");
  process.exit(1);
}

const OUT = join(dirname(fileURLToPath(import.meta.url)), "db-contract.json");
const clientCfg = process.env.DATABASE_URL
  ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
  : { ssl: { rejectUnauthorized: false } }; // usa PGHOST/PGUSER/... do ambiente

const c = new pg.Client({ ...clientCfg, connectionTimeoutMillis: 20000 });
try {
  await c.connect();
} catch (e) {
  console.error(`✗ Falha ao conectar (${e.code || e.message}). Defina DATABASE_URL ou PG* no ambiente.`);
  process.exit(1);
}

const colsR = await c.query(
  `select table_name, column_name, data_type, udt_name
   from information_schema.columns where table_schema='public'
   order by table_name, ordinal_position;`);
const tables = {}, enumColumns = {};
for (const r of colsR.rows) {
  (tables[r.table_name] ??= []).push(r.column_name);
  if (r.data_type === "USER-DEFINED") (enumColumns[r.table_name] ??= {})[r.column_name] = r.udt_name;
}

const enumR = await c.query(
  `select t.typname, e.enumlabel from pg_type t
   join pg_enum e on e.enumtypid=t.oid
   join pg_namespace n on n.oid=t.typnamespace where n.nspname='public'
   order by t.typname, e.enumsortorder;`);
const enums = {};
for (const r of enumR.rows) (enums[r.typname] ??= []).push(r.enumlabel);
for (const t of Object.keys(enumColumns))
  for (const col of Object.keys(enumColumns[t]))
    if (!enums[enumColumns[t][col]]) delete enumColumns[t][col];

const funcR = await c.query(
  `select p.proname, pg_get_function_identity_arguments(p.oid) as args
   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
   where n.nspname='public' and p.prokind='f';`);
const functions = {};
for (const r of funcR.rows) {
  const names = (r.args || "").split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean);
  (functions[r.proname] ??= []).push(names);
}

const fkR = await c.query(
  `select conrelid::regclass::text src, confrelid::regclass::text tgt, count(*) n
   from pg_constraint where contype='f' and connamespace='public'::regnamespace group by 1,2;`);
const fkMultiplicity = {};
for (const r of fkR.rows) {
  const src = r.src.replace(/^public\./, ""), tgt = r.tgt.replace(/^public\./, "");
  (fkMultiplicity[src] ??= {})[tgt] = Number(r.n);
}

await c.end();
const contract = { generatedAt: new Date().toISOString(), schema: "public", tables, enums, enumColumns, functions, fkMultiplicity };
writeFileSync(OUT, JSON.stringify(contract, null, 2) + "\n");
console.log(`✔ db-contract.json atualizado: ${Object.keys(tables).length} tabelas, ${Object.keys(enums).length} enums, ${Object.keys(functions).length} funções.`);
