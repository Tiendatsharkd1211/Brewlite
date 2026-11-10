// Chạy toàn bộ collection Thunder Client (không giới hạn số request như bản miễn phí): node brewlite/thunder-client/chay-thunder.mjs
// Hỗ trợ biến môi trường, {{#guid}}, {{#email}}, bearer, test res-code / json-query / set-env-var. Cần API đang chạy ở cổng 3001.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
const c = JSON.parse(readFileSync(new URL('./thunder-collection_BrewLite.json', import.meta.url), 'utf8'));
const env = {};
const fill = (s) => s.replace(/\{\{(#?)([A-Za-z0-9_]+)\}\}/g, (_, sys, k) => (sys ? (k === 'guid' ? randomUUID() : k === 'email' ? `tc-${randomUUID().slice(0, 8)}@brewlite.test` : '') : (env[k] ?? '')));
const get = (o, p) => p.replace(/^json\.?/, '').split('.').filter(Boolean).reduce((a, k) => (a == null ? a : a[k]), o);
const folderName = Object.fromEntries(c.folders.map((f) => [f._id, f.name]));
const order = [...c.requests].sort((a, b) => (c.folders.find((f) => f._id === a.containerId)?.sortNum ?? 0) - (c.folders.find((f) => f._id === b.containerId)?.sortNum ?? 0) || a.sortNum - b.sortNum);
let pass = 0, fail = 0, last = '';
for (const r of order) {
  const f = folderName[r.containerId];
  if (f !== last) { console.log(`\n${f}`); last = f; }
  const headers = { ...(r.body ? { 'Content-Type': 'application/json' } : {}) };
  for (const h of r.headers ?? []) headers[h.name] = fill(h.value);
  if (r.auth?.type === 'bearer') headers.Authorization = `Bearer ${fill(r.auth.bearer)}`;
  const res = await fetch(fill(r.url), { method: r.method, headers, body: r.body ? fill(r.body.raw) : undefined });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  const bad = [];
  for (const t of r.tests ?? []) {
    if (t.type === 'res-code' && String(res.status) !== t.value) bad.push(`mã ${res.status} ≠ ${t.value}`);
    if (t.type === 'json-query' && String(get(json, t.custom)) !== t.value) bad.push(`${t.custom}=${get(json, t.custom)} ≠ ${t.value}`);
    if (t.type === 'set-env-var') env[t.value.replace(/[{}]/g, '')] = get(json, t.custom);
  }
  bad.length ? fail++ : pass++;
  const msg = json?.message ? ` — ${Array.isArray(json.message) ? json.message[0] : json.message}` : '';
  console.log(`  ${bad.length ? '✗' : '✓'} [${res.status}] ${r.name}${bad.length ? `  (${bad.join('; ')})` : ''}${bad.length || res.status >= 400 ? msg : ''}`);
}
console.log(`\n${pass} đạt, ${fail} không đạt / ${pass + fail}`);
