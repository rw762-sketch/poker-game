import { Poker } from './engine.js?v=644a9e3f5770';

export const MAX_PLAYERS = 4;
export const TURN_MS = 45000;
export const OFFLINE_MS = 15000;
export function cleanName(value) {
  if (typeof value !== 'string') throw Error('Enter a name.');
  const name = value.trim().replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, 18);
  if (!name) throw Error('Enter a name.');
  return name;
}

// The host owns the deck and validates actions. Never serialize this object.
export class HostTable {
  constructor(name, now = Date.now()) {
    this.game = new Poker();
    this.game.players.forEach(p => Object.assign(p, { name: 'Open seat', stack: 0, folded: true }));
    this.members = Array(4).fill(null);
    this.members[0] = { name: cleanName(name), online: true, seen: now, token: null };
    Object.assign(this.game.players[0], { name: this.members[0].name, stack: 1000 });
    this.version = 0;
    this.started = false;
    this.deadline = null;
  }
  changed(now = Date.now()) {
    this.version++;
    this.deadline = this.game.done ? null : now + TURN_MS;
  }
  join(name, token, now = Date.now()) {
    if (typeof token !== 'string' || !/^[a-zA-Z0-9-]{24,80}$/.test(token)) throw Error('Invalid session. Try joining again.');
    let seat = this.members.findIndex((m, i) => i > 0 && m?.token === token);
    if (seat < 0) {
      if (this.started) throw Error('This table has started. Ask the host to create a new room.');
      seat = this.members.findIndex(m => !m);
      if (seat < 0) throw Error('This room is full.');
      this.members[seat] = { name: cleanName(name), token, online: true, seen: now };
      Object.assign(this.game.players[seat], { name: this.members[seat].name, stack: 1000 });
    } else Object.assign(this.members[seat], { online: true, seen: now });
    this.version++;
    return seat;
  }
  touch(seat, now = Date.now()) {
    const member = this.members[seat];
    if (!member) return false;
    const changed = !member.online;
    member.online = true;
    member.seen = now;
    if (changed) this.version++;
    return changed;
  }
  disconnect(seat, now = Date.now(), leave = false) {
    if (seat < 1 || !this.members[seat]) return;
    this.members[seat].online = false;
    this.members[seat].seen = now - (leave ? OFFLINE_MS : 0);
    if (!this.started && leave) {
      this.members[seat] = null;
      Object.assign(this.game.players[seat], { name: 'Open seat', stack: 0, folded: true });
    }
    this.version++;
  }
  start(seat, version, now = Date.now()) {
    if (seat !== 0) throw Error('Only the host can deal.');
    if (version !== this.version) throw Error('The table changed. Try again.');
    if (!this.game.done) throw Error('Finish this hand first.');
    const ready = this.members.map((m, i) => !!m?.online && this.game.players[i].stack > 0);
    if (ready.filter(Boolean).length < 2) throw Error('You need two connected players with chips.');
    const stacks = this.game.players.map(p => p.stack);
    this.game.players.forEach((p, i) => { if (!ready[i]) p.stack = 0; });
    this.game.start();
    this.game.players.forEach((p, i) => { if (!ready[i]) p.stack = stacks[i]; });
    this.started = true;
    this.changed(now);
  }
  act(seat, message, now = Date.now()) {
    if (this.game.done || seat !== this.game.turn || !this.members[seat]?.online) throw Error('It is not your turn.');
    if (message.version !== this.version) throw Error('The table changed. Try your action again.');
    if (!this.game.act(message.action, message.amount)) throw Error('That bet is not allowed.');
    this.changed(now);
  }
  tick(now = Date.now()) {
    let changed = false;
    this.members.forEach((m, i) => {
      if (i > 0 && m?.online && now - m.seen > OFFLINE_MS) {
        m.online = false;
        this.version++;
        changed = true;
      }
    });
    if (!this.game.done) {
      const member = this.members[this.game.turn];
      if (now >= this.deadline || (!member?.online && now - (member?.seen || 0) >= OFFLINE_MS)) {
        const player = this.game.players[this.game.turn];
        this.game.log(`${player.name} timed out.`);
        this.game.act(this.game.options().owed ? 'fold' : 'call');
        this.changed(now);
        changed = true;
      }
    }
    return changed;
  }
  view(seat) {
    const g = this.game;
    // Whitelist fields. No deck, session tokens, or opponents' private cards.
    return {
      version: this.version, me: seat, host: seat === 0,
      started: this.started, deadline: this.deadline,
      hand: g.hand, board: g.board.map(c => ({ ...c })), done: g.done,
      stage: g.stage ?? 0, pot: g.pot, turn: g.turn ?? -1,
      dealer: g.dealer, result: g.result || '', logs: [...g.logs],
      options: !g.done && seat === g.turn ? { ...g.options() } : null,
      players: g.players.map((p, i) => ({
        name: this.members[i]?.name || 'Open seat',
        occupied: !!this.members[i], online: !!this.members[i]?.online,
        stack: p.stack, bet: p.bet, total: p.total, folded: p.folded, action: p.action,
        cards: p.cards.map(c => i === seat || (g.done && g.stage === 4 && !p.folded) ? { ...c } : null),
      })),
    };
  }
}
