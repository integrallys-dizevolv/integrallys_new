#!/usr/bin/env node
/**
 * validate-db.mjs — Guard de drift código ⇄ banco (sem dependências).
 *
 * Cruza o uso do Supabase em src/ contra o snapshot do schema em
 * scripts/db-contract.json (gerado por refresh-db-contract.mjs). NÃO acessa o
 * banco — roda em qualquer lugar (CI, pre-push, local).
 *
 * Detecta:
 *   - .from("t")                    → tabela inexistente
 *   - .select("col,...")            → coluna inexistente (na tabela e em embeds)
 *   - embed t(...) ambíguo          → >1 FK p/ a mesma tabela sem hint "!" (PGRST201)
 *   - .rpc("fn", {args})            → função inexistente / args que não batem
 *   - .insert/.update/.upsert({...})→ chave que não é coluna da tabela
 *   - valor de enum em insert/update→ literal fora dos valores válidos do enum
 *
 * Uso:  node scripts/validate-db.mjs        (sai 1 se achar divergência)
 * Atualizar o snapshot após mudar o schema:  node scripts/refresh-db-contract.mjs
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "..", "src");
const NOT_POSTGREST = /(?:storage|Buffer)$/; // .from() que não é query do PostgREST
const contract = JSON.parse(readFileSync(join(HERE, "db-contract.json"), "utf8"));
const tables = new Map(Object.entries(contract.tables).map(([t, cols]) => [t, new Set(cols)]));
const enums = contract.enums;
const enumColumns = contract.enumColumns; // {table: {col: enumType}}
const funcs = contract.functions; // {name: [[arg,...], ...overloads]}
const fk = contract.fkMultiplicity; // {src: {tgt: n}}

// ---------- helpers de parsing ----------
function walk(d) {
  let out = [];
  for (const f of readdirSync(d)) {
    const p = join(d, f);
    const s = statSync(p);
    if (s.isDirectory()) out = out.concat(walk(p));
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

// divide por vírgulas de nível 0 — ignora vírgulas dentro de () [] {} e dentro
// de strings ('...', "...", `...`), para não quebrar em vírgulas de template.
function splitTop(s) {
  const out = [];
  let depth = 0, cur = "", q = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      cur += ch;
      if (ch === "\\") { cur += s[++i] ?? ""; }
      else if (ch === q) q = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") { q = ch; cur += ch; continue; }
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out;
}

// payload de insert/update/upsert: SÓ quando o 1º argumento é um objeto literal.
// (evita pegar o objeto de options `{ onConflict }` quando o payload é variável,
//  ex.: .upsert(rows, { onConflict: 'x' }) → retorna null e ignora.)
function objectAfter(src, openParenIdx) {
  let i = openParenIdx + 1;
  while (i < src.length && /\s/.test(src[i])) i++;
  if (src[i] !== "{") return null; // 1º arg não é objeto literal → não validável
  let depth = 0, q = null;
  const start = i;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === "`") { q = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return src.slice(start + 1, i); }
  }
  return null;
}

// extrai pares chave/valor de nível 0 de um corpo de objeto literal
function objectEntries(body) {
  const entries = [];
  for (const part of splitTop(body)) {
    const t = part.trim();
    if (!t || t.startsWith("...")) continue; // spread: não dá pra validar
    const colon = t.indexOf(":");
    if (colon === -1) {
      // shorthand { foo }
      const id = t.replace(/^['"`]|['"`]$/g, "");
      if (/^[a-z_]\w*$/i.test(id)) entries.push({ key: id, value: null });
    } else {
      let key = t.slice(0, colon).trim().replace(/^['"`]|['"`]$/g, "");
      const value = t.slice(colon + 1).trim();
      if (/^[a-z_]\w*$/i.test(key)) entries.push({ key, value });
    }
  }
  return entries;
}

// se a expressão é um literal string, devolve o conteúdo; senão null
function stringLiteral(expr) {
  const m = expr.match(/^(['"`])([^'"`]*)\1$/);
  return m ? m[2] : null;
}

function parseSelect(sel) {
  const cols = [], embeds = [];
  for (let tok of splitTop(sel)) {
    tok = tok.trim();
    if (!tok || tok === "*") continue;
    const p = tok.indexOf("(");
    if (p >= 0) {
      let head = tok.slice(0, p);
      if (head.includes(":")) head = head.split(":").slice(1).join(":");
      const hasHint = head.includes("!");
      const tgt = head.split("!")[0].trim();
      if (/^[a-z_]\w*$/i.test(tgt)) embeds.push({ tgt, hasHint, inner: tok.slice(p + 1, tok.lastIndexOf(")")) });
    } else {
      let col = tok;
      if (col.includes(":")) col = col.split(":").slice(1).join(":");
      col = col.split("::")[0].split("->")[0].split(".")[0].split("!")[0].trim();
      if (/^[a-z_]\w*$/i.test(col) && col !== "count") cols.push(col);
    }
  }
  return { cols, embeds };
}

// ---------- validação ----------
const problems = [];
const add = (file, kind, msg) => problems.push({ file, kind, msg });

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const rel = "src/" + file.slice(SRC.length + 1).replace(/\\/g, "/");

  // localiza TODOS os .from(...) (inclusive em linha própria), pulando
  // storage.from()/Buffer.from() que não são queries do PostgREST.
  const froms = [];
  for (const m of src.matchAll(/\.from\(\s*(["'`])([^"'`]+)\1\s*\)/g)) {
    // olha o token antes do .from (ignorando espaços/quebras de linha):
    // pula supabase.storage.from() e Buffer.from(), mesmo multi-linha.
    const before = src.slice(Math.max(0, m.index - 40), m.index).replace(/\s+/g, "");
    if (NOT_POSTGREST.test(before)) continue;
    froms.push({ table: m[2], index: m.index });
  }

  for (const m of froms) {
    if (!tables.has(m.table)) { add(rel, "FROM", `.from("${m.table}") — tabela inexistente`); continue; }
  }

  for (let i = 0; i < froms.length; i++) {
    const t = froms[i].table;
    if (!tables.has(t)) continue;
    const cols = tables.get(t);
    const start = froms[i].index;
    const end = i + 1 < froms.length ? froms[i + 1].index : Math.min(src.length, start + 1200);
    const seg = src.slice(start, end);

    // .select(...)
    const sm = seg.match(/\.select\(\s*(["'`])([\s\S]*?)\1/);
    if (sm && !(sm[1] === "`" && sm[2].includes("${"))) {
      const { cols: selCols, embeds } = parseSelect(sm[2]);
      for (const col of selCols)
        if (!cols.has(col)) add(rel, "SELECT", `${t}.select → coluna "${col}" inexistente`);
      for (const e of embeds) {
        if (!tables.has(e.tgt)) { add(rel, "EMBED", `${t}.select embed → tabela "${e.tgt}" inexistente`); continue; }
        const n = fk[t]?.[e.tgt];
        if (n && n > 1 && !e.hasHint)
          add(rel, "EMBED-AMBIG", `${t}.select embed "${e.tgt}" AMBÍGUO: ${n} FKs ${t}→${e.tgt}, falta hint "!" (PGRST201)`);
        const inner = parseSelect(e.inner);
        for (const col of inner.cols)
          if (!tables.get(e.tgt).has(col)) add(rel, "EMBED-COL", `embed ${e.tgt}(...) → coluna "${col}" inexistente`);
      }
    }

    // .insert / .update / .upsert ({...})
    for (const wm of seg.matchAll(/\.(insert|update|upsert)\(/g)) {
      const body = objectAfter(seg, wm.index + wm[0].length - 1);
      if (body == null) continue; // payload via variável — não dá pra validar
      for (const { key, value } of objectEntries(body)) {
        if (!cols.has(key)) { add(rel, "WRITE", `${t}.${wm[1]} → chave "${key}" não é coluna`); continue; }
        const enumType = enumColumns[t]?.[key];
        if (enumType && value != null) {
          const lit = stringLiteral(value);
          if (lit != null && !enums[enumType].includes(lit))
            add(rel, "ENUM", `${t}.${wm[1]} → "${key}"='${lit}' fora do enum ${enumType} (${enums[enumType].join("|")})`);
        }
      }
    }
  }

  // .rpc("fn", {keys})
  for (const m of src.matchAll(/\.rpc\(\s*(["'`])(\w+)\1\s*(?:,\s*(\{[\s\S]*?\}))?\)/g)) {
    const fn = m[2];
    if (!funcs[fn]) { add(rel, "RPC", `.rpc("${fn}") — função inexistente`); continue; }
    if (m[3]) {
      const keys = objectEntries(m[3].slice(1, -1)).map((e) => e.key);
      const ok = funcs[fn].some((argset) => keys.every((k) => argset.includes(k)));
      if (keys.length && !ok)
        add(rel, "RPC-ARG", `.rpc("${fn}", {${keys.join(",")}}) — args não batem (${funcs[fn].map((a) => a.join(",")).join(" | ")})`);
    }
  }
}

// ---------- relatório ----------
const dedup = [...new Map(problems.map((p) => [p.kind + p.file + p.msg, p])).values()];
if (!dedup.length) {
  console.log("✔ validate-db: nenhuma divergência código ⇄ banco.");
  process.exit(0);
}
const byKind = {};
for (const p of dedup) (byKind[p.kind] ??= []).push(p);
console.log(`✗ validate-db: ${dedup.length} divergência(s) código ⇄ banco:\n`);
for (const k of Object.keys(byKind)) {
  console.log(`## ${k} (${byKind[k].length})`);
  for (const p of byKind[k]) console.log(`   ${p.file}\n      ${p.msg}`);
  console.log("");
}
process.exit(1);
