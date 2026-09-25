// Shared probability engine. Monte Carlo draws only from cards the player cannot see.
export function seededRandom(seed = 1) {
  return () => ((seed = Math.imul(seed, 1664525) + 1013904223 >>> 0) / 4294967296);
}
export function rankHand(cards) {
  const counts = new Uint8Array(15), suits = [[], [], [], []];
  for (const c of cards) { counts[c.r]++; suits[c.s].push(c.r); }
  const ranks = [], pairs = [], trips = [];
  let quad = 0;
  for (let r = 14; r >= 2; r--) {
    if (counts[r]) ranks.push(r);
    if (counts[r] === 4) quad = r;
    if (counts[r] >= 3) trips.push(r);
    if (counts[r] >= 2) pairs.push(r);
  }
  const straight = rs => {
    const set = new Set(rs); if (set.has(14)) set.add(1);
    for (let high = 14; high >= 5; high--) {
      let found = true; for (let k = 0; k < 5; k++) if (!set.has(high - k)) { found = false; break; }
      if (found) return high;
    }
    return 0;
  };
  const score = (category, kickers) => {
    let value = category;
    for (let i = 0; i < 5; i++) value = value * 15 + (kickers[i] || 0);
    return value;
  };
  const flush = suits.find(s => s.length >= 5);
  if (flush) { const high = straight(flush); if (high) return score(8, [high]); }
  if (quad) return score(7, [quad, ...ranks.filter(r => r !== quad).slice(0, 1)]);
  if (trips.length && pairs.some(r => r !== trips[0])) return score(6, [trips[0], pairs.find(r => r !== trips[0])]);
  if (flush) return score(5, flush.sort((a, b) => b - a).slice(0, 5));
  const high = straight(ranks); if (high) return score(4, [high]);
  if (trips.length) return score(3, [trips[0], ...ranks.filter(r => r !== trips[0]).slice(0, 2)]);
  if (pairs.length >= 2) return score(2, [...pairs.slice(0, 2), ranks.find(r => !pairs.slice(0, 2).includes(r))]);
  if (pairs.length) return score(1, [pairs[0], ...ranks.filter(r => r !== pairs[0]).slice(0, 3)]);
  return score(0, ranks.slice(0, 5));
}
export function preflopStrength(cards) {
  const [a, b] = cards.map(c => c.r).sort((x, y) => y - x);
  if (a === b) return Math.min(1, .52 + (a - 2) * .04);
  const suited = cards[0].s === cards[1].s;
  const gap = a - b;
  return Math.max(0, Math.min(.94,
    (a - 2) * .034 + (b - 2) * .021 + (suited ? .09 : 0) +
    (gap === 1 ? .06 : gap === 2 ? .025 : gap >= 5 ? -.045 : 0) +
    (a === 14 ? .08 : 0) + (a === 14 && b <= 5 && suited ? .045 : 0)));
}
export const RANGE_PROFILES = {
  random: { name:'Any two cards', cutoff:0 },
  loose: { name:'Loose range', cutoff:.31 },
  standard: { name:'Standard range', cutoff:.48 },
  tight: { name:'Tight range', cutoff:.64 },
};
export function validateScenario({ cards, board = [], opponents = 1, knownOpponent = [] }) {
  if (!Array.isArray(cards) || cards.length !== 2) throw Error('Choose both of your cards.');
  if (!Array.isArray(board) || ![0, 3, 4, 5].includes(board.length)) throw Error('Choose no board cards, a complete 3-card flop, or 4–5 community cards.');
  if (!Number.isInteger(opponents) || opponents < 1 || opponents > 5) throw Error('Choose between 1 and 5 opponents.');
  if (!Array.isArray(knownOpponent) || ![0, 2].includes(knownOpponent.length)) throw Error('Choose both opponent cards, or leave both unknown.');
  if (knownOpponent.length && opponents !== 1) throw Error('Exact opponent cards are supported for one opponent only.');
  const seen = new Set();
  for (const c of [...cards, ...board, ...knownOpponent]) {
    if (!c || !Number.isInteger(c.r) || c.r < 2 || c.r > 14 || !Number.isInteger(c.s) || c.s < 0 || c.s > 3) throw Error('One of the cards is invalid.');
    const key = c.s * 13 + c.r;
    if (seen.has(key)) throw Error('The same card cannot appear twice. Check your selections.');
    seen.add(key);
  }
}
export function simulateEquity(input, trials = 2000, random = Math.random) {
  const { cards, board = [], opponents = 1, knownOpponent = [], range = 'random', opponentRanges = [] } = input;
  validateScenario({ cards, board, opponents, knownOpponent });
  if (!Number.isInteger(trials) || trials < 1 || trials > 100000) throw Error('Invalid simulation size.');
  if (!RANGE_PROFILES[range] || opponentRanges.some(r => !RANGE_PROFILES[r])) throw Error('Unknown opponent range.');
  const used = new Set([...cards, ...board, ...knownOpponent].map(c => c.s * 13 + c.r));
  const unseen = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!used.has(s * 13 + r)) unseen.push({ r, s });
  const candidates = Array.from({ length:opponents }, (_, index) => {
    if (knownOpponent.length) return [];
    const cutoff = RANGE_PROFILES[opponentRanges[index] || range].cutoff;
    if (!cutoff) return null;
    const result = [];
    for (let a = 0; a < unseen.length - 1; a++) for (let b = a + 1; b < unseen.length; b++) {
      if (preflopStrength([unseen[a], unseen[b]]) >= cutoff) result.push([a, b]);
    }
    if (!result.length) throw Error('No opponent combinations remain in this range.');
    return result;
  });
  let wins = 0, ties = 0, sum = 0, squares = 0, completed = 0, attempts = 0;
  while (completed < trials) {
    if (++attempts > trials * 500) throw Error('These opponent ranges conflict with the known cards. Try a wider range.');
    const taken = new Set();
    const hands = []; let conflict = false;
    for (let i = 0; i < opponents; i++) {
      if (knownOpponent.length) { hands.push(knownOpponent); continue; }
      let a, b;
      if (candidates[i]) [a, b] = candidates[i][Math.floor(random() * candidates[i].length)];
      else { a = Math.floor(random() * unseen.length); b = Math.floor(random() * (unseen.length - 1)); if (b >= a) b++; }
      if (taken.has(a) || taken.has(b)) { conflict = true; break; }
      taken.add(a); taken.add(b); hands.push([unseen[a], unseen[b]]);
    }
    // Reject the whole assignment to sample uniformly over compatible range combinations.
    if (conflict) continue;
    const community = [...board];
    const remaining = unseen.filter((_, index) => !taken.has(index));
    while (community.length < 5) community.push(remaining.splice(Math.floor(random() * remaining.length), 1)[0]);
    const own = rankHand([...cards, ...community]);
    let lost = false, tied = 1;
    for (const hand of hands) {
      const other = rankHand([...hand, ...community]);
      if (other > own) lost = true;
      else if (other === own) tied++;
    }
    let share = 0;
    if (!lost) { share = 1 / tied; if (tied === 1) wins++; else ties++; }
    sum += share; squares += share * share; completed++;
  }
  const equity = sum / trials;
  const se = trials > 1 ? Math.sqrt(Math.max(0, squares / trials - equity * equity) / (trials - 1)) : .5;
  return { trials, win:wins / trials, tie:ties / trials, loss:1 - (wins + ties) / trials,
    equity, standardError:se, margin95:1.96 * se };
}
