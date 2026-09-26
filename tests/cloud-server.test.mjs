import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { storedRequest, encode, decode } from '../server/cloud-state.mjs';
import { api } from '../server/cloud-handler.mjs';

function database() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../drizzle/0000_modern_screwball.sql', import.meta.url), 'utf8'));
  return { close: () => sql.close(), prepare(text) {
    let args = [];
    return { bind(...values) { args = values; return this; },
      async first() { return sql.prepare(text).get(...args) || null; },
      async run() { const r = sql.prepare(text).run(...args); return { meta: { changes: Number(r.changes) } }; } };
  } };
}

test('independent stored requests survive reloads, concurrent joins and a repeated move', async t => {
  const db = database(); t.after(() => db.close());
  let now = 100000;
  const run = (path, token, body = {}) => storedRequest(db, path, token, body, () => now);
  const players = await Promise.all(['Host', 'B', 'C', 'D'].map(name => run('/session', '', { name })));
  assert.equal((await run('/lobby', players[0].token)).players.length, 4);
  const created = await run('/create', players[0].token, { requestId: crypto.randomUUID() });
  await Promise.all(players.slice(1).map(p => run('/join', p.token, { code: created.room, requestId: crypto.randomUUID() })));
  now += 200;
  const poll = await run('/poll', players[0].token);
  assert.equal(poll.state.players.filter(p => p.occupied).length, 4);
  const dealt = await run('/deal', players[0].token, { version: poll.state.version, requestId: crypto.randomUUID() });
  for (const [i, p] of players.entries()) {
    const view = await run('/poll', p.token);
    view.state.players.forEach((seat, j) => assert.equal(seat.cards.filter(Boolean).length, i === j ? 2 : 0));
  }
  now += 200;
  const token = players[dealt.state.turn].token;
  const message = { action: 'call', version: dealt.state.version, requestId: crypto.randomUUID() };
  const [a, b] = await Promise.all([run('/action', token, message), run('/action', token, message)]);
  assert.equal(a.state.version, b.state.version);
  assert.equal(a.state.version, dealt.state.version + 1);
  const row = await db.prepare('SELECT payload FROM poker_state WHERE id=1').first();
  assert.equal(encode(decode(row.payload)), row.payload);
  now += 200;
  await assert.rejects(run('/action', token, { action: 'call', version: dealt.state.version, requestId: crypto.randomUUID() }), /not your turn|table changed/);
  const resumed = await run('/session', players[0].token, { name: 'Host' });
  assert.equal(resumed.room, created.room); assert.equal(resumed.state.me, 0);
});

test('cloud endpoint validates storage health, origins, identity, methods and body bounds', async t => {
  const db = database(); t.after(() => db.close());
  const req = (path, options = {}) => api(new Request('https://game.example/api' + path, options), { DB: db });
  assert.equal((await req('/health')).status, 200);
  assert.equal((await req('/poll')).status, 401);
  assert.equal((await req('/create')).status, 405);
  assert.equal((await req('/health', { headers: { Origin: 'https://evil.example' } })).status, 403);
  const cors = await req('/session', { method: 'OPTIONS', headers: { Origin: 'https://rw762-sketch.github.io' } });
  assert.equal(cors.headers.get('Access-Control-Allow-Origin'), 'https://rw762-sketch.github.io');
  assert.equal((await req('/session', { method: 'POST', body: 'x'.repeat(4097) })).status, 413);
  assert.equal((await req('/session', { method: 'POST', body: 'null' })).status, 400);
  assert.equal((await api(new Request('https://game.example/api/health'), {})).status, 503);
});
