/* eslint-disable @typescript-eslint/no-require-imports -- Node test runner with isolated CommonJS mocks. */
// Run: node --test tests/growth-application.test.cjs
// Transpile the real validators/route, replacing DB and Next.js boundaries in memory.
// These tests never connect to a database or send an application/email.
const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative, mocks) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, URL, require(id) { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error(`Unexpected import: ${id}`); },
  }, { filename: relative });
  return exports;
}
const validators = load('src/lib/launch-batch.ts', {
  crypto, './db': { sql() { throw new Error('Real DB access forbidden'); } },
  './session-secret': { sessionSecret: () => 'unit-test-only' },
});
const { validateInquiry, validateApplication } = validators;
const base = { brand: 'TEST application QA', email: 'qa@example.com', phone: '010-1234-5678', message: 'QA only', consent: true };

test('inquiry accepts canonical Korean name and normalizes fields', () => {
  const r = validateInquiry({ ...base, name: '  홍길동  ' });
  assert.equal(r.ok, true); assert.equal(r.data.name, '홍길동'); assert.equal(r.data.phone, '01012345678');
});
test('cached growth payload with manager remains compatible', () => {
  const r = validateInquiry({ ...base, manager: '홍길동' });
  assert.equal(r.ok, true); assert.equal(r.data.name, '홍길동');
  assert.equal(validateInquiry({ ...base, name: null, manager: '홍길동' }).data.name, '홍길동');
});
test('canonical name wins and blank canonical name is not overridden', () => {
  assert.equal(validateInquiry({ ...base, name: '정식 이름', manager: '이전 이름' }).data.name, '정식 이름');
  assert.equal(validateInquiry({ ...base, name: ' ', manager: '이전 이름' }).ok, false);
});
test('missing, whitespace and non-string legacy names are rejected', () => {
  for (const fields of [{}, { manager: '  ' }, { manager: ['홍길동'] }, { manager: 123 }, { manager: {} }]) {
    const r = validateInquiry({ ...base, ...fields });
    assert.equal(r.ok, false); assert.equal(r.error, '담당자 이름을 입력해 주세요.');
  }
});
test('email, phone and message validation remains enforced', () => {
  for (const fields of [{ email: 'invalid' }, { phone: 'abc' }, { phone: 1012345678 }, { message: ' ' }]) {
    assert.equal(validateInquiry({ ...base, name: '홍길동', ...fields }).ok, false);
  }
});
test('batch2/program apply contract and separate pricing remain unchanged', () => {
  const payload = { ...base, manager: '홍길동', regions: ['미국'], seaCountries: [] };
  const batch = validateApplication(payload, 'batch2');
  const program = validateApplication(payload, 'program');
  assert.equal(batch.ok, true); assert.equal(batch.data.manager, '홍길동'); assert.equal(batch.data.costSupply, 1500000);
  assert.equal(program.ok, true); assert.equal(program.data.costSupply, 3000000);
  assert.equal(validateApplication({ ...payload, manager: ' ' }, 'batch2').ok, false);
});
function mockRoute() {
  const rows = new Map(); const writes = [];
  const sql = async (parts, ...values) => {
    const query = parts.join('?');
    if (query.includes('SELECT COUNT')) return { rows: [{ c: 0 }] };
    if (query.includes('INSERT INTO launch_batch_inquiries')) {
      if (rows.has(values[0])) return { rows: [] };
      const row = { id: 42, payload_hash: values[1], source_site: values[7] };
      rows.set(values[0], row); writes.push(values); return { rows: [{ id: row.id }] };
    }
    if (query.includes('SELECT id, payload_hash')) return { rows: [rows.get(values[0])].filter(Boolean) };
    throw new Error(`Unexpected SQL: ${query}`);
  };
  const route = load('src/app/api/launch-batch/inquiry/route.ts', {
    'next/server': { NextResponse: { json(body, init = {}) { return { body, status: init.status || 200 }; } } },
    crypto, '@/lib/db': { sql, isConfigured: () => true },
    '@/lib/launch-batch': { ...validators, ensureInquiryTable: async () => {}, hashIp: () => 'test-ip' },
  });
  return { route, writes };
}
function request(body) {
  return new Request('https://growth.glovek.space/api/launch-batch/inquiry', {
    method: 'POST', headers: { host: 'growth.glovek.space', origin: 'https://growth.glovek.space', 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}
test('old and new name keys use the same receipt on retry; no duplicate insert', async () => {
  const { route, writes } = mockRoute();
  const body = { ...base, requestId: crypto.randomUUID() };
  const first = await route.POST(request({ ...body, manager: '홍길동' }));
  const retry = await route.POST(request({ ...body, name: '홍길동' }));
  assert.equal(first.status, 200); assert.equal(first.body.ok, true);
  assert.equal(retry.body.receipt, first.body.receipt); assert.equal(writes.length, 1);
  assert.equal(writes[0][2], '홍길동'); assert.equal(writes[0][7], 'growth');
});
test('missing name and missing consent cause no DB write', async () => {
  const { route, writes } = mockRoute();
  assert.equal((await route.POST(request(base))).status, 400);
  assert.equal((await route.POST(request({ ...base, name: '홍길동', consent: false }))).status, 400);
  assert.equal(writes.length, 0);
});
test('growth browser payload uses canonical name; script URL is refreshed', () => {
  const script = fs.readFileSync(path.join(root, 'public/growth/app.js'), 'utf8');
  const payload = script.match(/var payload = \{([\s\S]*?)\n      \};/)[1];
  assert.match(payload, /\bname: name\b/); assert.doesNotMatch(payload, /\bmanager:/);
  assert.match(script, /fetch\("\/api\/launch-batch\/inquiry"/);
  assert.match(fs.readFileSync(path.join(root, 'public/growth/index.html'), 'utf8'), /app\.js\?v=20261111-name-fix/);
});
