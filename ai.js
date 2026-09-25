import { evaluate } from './engine.js?v=93aeb1e0dca8';
import { simulateEquity } from './poker-math.js?v=93aeb1e0dca8';
import { readObservation, strategicAction, DEFAULT_POLICY } from './strategy.js?v=93aeb1e0dca8';
import { TRAINED_POLICY } from './trained-policy.js?v=93aeb1e0dca8';
export const DIFFICULTIES = {
  easy: { name:'Easy', description:'Relaxed play. More calls, smaller bets.' },
  medium: { name:'Medium', description:'Position-aware play with hand-range estimates.' },
  hard: { name:'Hard', description:'Sample-game tuned strategy, ranges, and value betting.' },
};
export const normalizeDifficulty = value => Object.hasOwn(DIFFICULTIES, value) ? value : 'medium';
export const botObservation = readObservation;
export function estimateEquity(observation, trials, random = Math.random) {
  return simulateEquity(observation, trials, random).equity;
}
export function chooseBotAction(obs, difficulty = 'medium', random = Math.random) {
  const level = normalizeDifficulty(difficulty);
  if (level !== 'easy') return strategicAction(obs, level === 'hard' ? TRAINED_POLICY : DEFAULT_POLICY, random, level === 'hard' ? 360 : 100);
  const o = obs.options, roll = random();
  const pair = obs.cards[0].r === obs.cards[1].r;
  const made = obs.board.length >= 3 ? evaluate([...obs.cards, ...obs.board])[0] : 0;
  if (o.owed && o.call > obs.pot * .8 && !pair && made < 2 && roll < .45) return { action:'fold' };
  if (o.canRaise && (pair || made >= 2) && roll > .85) return { action:'raise', amount:Math.min(o.max, Math.max(o.min, obs.current + Math.max(20, Math.round((obs.pot + o.call) * .3 / 10) * 10))) };
  return { action:'call' };
}
