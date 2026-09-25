import { evaluate, compare } from '../engine.js';

export const DIFFICULTIES = {
  easy: { name:'Easy', description:'Relaxed play. More calls, smaller bets.' },
  medium: { name:'Medium', description:'Balanced play. Weighs hand strength and the pot.' },
  hard: { name:'Hard', description:'More careful odds. Varied bets and occasional bluffs.' },
};
export const normalizeDifficulty = value => Object.hasOwn(DIFFICULTIES, value) ? value : 'medium';

// A bot gets its own cards and public information, never the deck or other hands.
export function botObservation(game) {
  const player = game.players[game.turn];
  return {
    cards: player.cards.map(card => ({ ...card })),
    board: game.board.map(card => ({ ...card })),
    pot: game.pot,
    stack: player.stack,
    bet: player.bet,
    current: game.current,
    opponents: game.players.filter((p, i) => i !== game.turn && !p.folded).length,
    options: { ...game.options() },
  };
}

export function estimateEquity({ cards, board, opponents }, trials, random = Math.random) {
  const known = new Set([...cards, ...board].map(c => c.s * 13 + c.r - 2));
  const unseen = [];
  for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) if (!known.has(s * 13 + r - 2)) unseen.push({ r, s });
  let equity = 0;
  for (let trial = 0; trial < trials; trial++) {
    const deck = [...unseen];
    const draw = () => deck.splice(Math.floor(random() * deck.length), 1)[0];
    const community = [...board];
    while (community.length < 5) community.push(draw());
    const own = evaluate([...cards, ...community]);
    let ties = 1, lost = false;
    for (let opponent = 0; opponent < opponents; opponent++) {
      const other = evaluate([draw(), draw(), ...community]);
      const difference = compare(own, other);
      if (difference < 0) lost = true;
      else if (difference === 0) ties++;
    }
    if (!lost) equity += 1 / ties;
  }
  return equity / trials;
}

export function chooseBotAction(observation, difficulty = 'medium', random = Math.random) {
  const level = normalizeDifficulty(difficulty);
  const { options:o, pot, cards, board, opponents } = observation;
  const roll = random();
  const raise = fraction => ({
    action:'raise',
    amount:Math.min(o.max, Math.max(o.min, observation.current + Math.round(Math.max(20, (pot + o.call) * fraction) / 10) * 10)),
  });
  if (level === 'easy') {
    const pair = cards[0].r === cards[1].r;
    const made = board.length >= 3 ? evaluate([...cards, ...board])[0] : 0;
    if (o.owed && o.call > pot * .8 && !pair && made < 2 && roll < .45) return { action:'fold' };
    if (o.canRaise && (pair || made >= 2) && roll > .85) return raise(.3);
    return { action:'call' };
  }
  const equity = estimateEquity(observation, level === 'hard' ? 180 : 48, random);
  const price = o.call / Math.max(1, pot + o.call);
  const margin = level === 'hard' ? .035 : .085;
  // A free check never folds. Medium deliberately tolerates more marginal calls.
  if (o.owed && equity + margin < price && roll > (level === 'hard' ? .04 : .18)) return { action:'fold' };
  const baseline = 1 / (opponents + 1);
  const valueHand = equity > Math.max(.48, baseline + .17);
  const strongHand = equity > .74;
  const bluff = level === 'hard' && opponents === 1 && equity < .35 && o.call <= pot * .15 && roll < .07;
  if (o.canRaise && ((valueHand && roll < (level === 'hard' ? .8 : .48)) || bluff)) {
    return raise(level === 'hard' ? (strongHand ? .85 : .5 + random() * .2) : .45);
  }
  return { action:'call' };
}
