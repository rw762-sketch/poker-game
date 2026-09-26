import { PokerService } from './poker-service.mjs';
import { HostTable } from '../room-state.js';
import { Poker } from '../engine.js';
import { TableGifts } from '../table-gifts.js';

export function encode(service) {
  return JSON.stringify({
    sessions: [...service.sessions].map(([token, s]) => [token, { ...s, requests: [...s.requests] }]),
    rooms: [...service.rooms].map(([code, r]) => [code, {
      ...r, gifts: [...r.gifts.last], table: { ...r.table, game: {
        ...r.table.game, acted: [...(r.table.game.acted || [])],
      } },
    }]),
  });
}
export function decode(payload, now = Date.now) {
  const service = new PokerService(now);
  if (!payload) return service;
  const data = JSON.parse(payload);
  service.sessions = new Map(data.sessions.map(([token, s]) => [token, { ...s, requests: new Map(s.requests) }]));
  service.rooms = new Map(data.rooms.map(([code, r]) => {
    const game = Object.assign(Object.create(Poker.prototype), r.table.game, { acted: new Set(r.table.game.acted) });
    const table = Object.assign(Object.create(HostTable.prototype), r.table, { game });
    const gifts = new TableGifts(); gifts.last = new Map(r.gifts);
    return [code, { ...r, table, gifts }];
  }));
  return service;
}

// A bounded friends lobby uses one atomic snapshot. Compare-and-swap prevents
// concurrent requests or separate Worker instances from overwriting each other.
export async function storedRequest(database, path, token, body, now = Date.now) {
  const db = database.withSession ? database.withSession('first-primary') : database;
  for (let attempt = 0; attempt < 8; attempt++) {
    const row = await db.prepare('SELECT revision, payload FROM poker_state WHERE id = 1').first();
    if (path === '/health') return { ok: true, protocol: 1, storage: 'shared' };
    const service = decode(row?.payload, now);
    service.sweep();
    if ((path === '/session' && !service.sessions.has(token) && service.sessions.size >= 64) ||
        (path === '/create' && service.rooms.size >= 16)) {
      throw Object.assign(Error('The lobby is full. Try again shortly.'), { status: 503 });
    }
    const result = service.handle(path, token, body);
    const payload = encode(service);
    if (new TextEncoder().encode(payload).length > 900000) throw Object.assign(Error('The lobby is busy. Try again shortly.'), { status: 503 });
    const write = row
      ? await db.prepare('UPDATE poker_state SET revision = revision + 1, payload = ? WHERE id = 1 AND revision = ?').bind(payload, row.revision).run()
      : await db.prepare('INSERT OR IGNORE INTO poker_state (id, revision, payload) VALUES (1, 1, ?)').bind(payload).run();
    if (write.meta.changes === 1) return result;
    // Retry from fresh state; no response or side effect escapes until committed.
  }
  throw Object.assign(Error('The table is busy. Your request can be retried safely.'), { status: 503 });
}
