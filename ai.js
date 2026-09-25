import { adaptStrategy } from './player-memory.js?v=fa87388093f7';
import { evaluate } from './engine.js?v=fa87388093f7';
import { simulateEquity } from './poker-math.js?v=fa87388093f7';
import { readObservation, strategicAction, DEFAULT_POLICY } from './strategy.js?v=fa87388093f7';
import { TRAINED_POLICY } from './trained-policy.js?v=fa87388093f7';
export const DIFFICULTIES = {
  easy: { name:'Easy', description:'Relaxed play. More calls, smaller bets.' },
  medium: { name:'Medium', description:'Position-aware play with gradual player reads.' },
  hard: { name:'Hard', description:'Adapts to betting patterns across hands.' },
};
export const normalizeDifficulty = value => Object.hasOwn(DIFFICULTIES, value) ? value : 'medium';
export function botObservation(game, memory) {
  const obs=readObservation(game);
  if (!memory) return obs;
  const seats=game.players.flatMap((p,i)=>i!==game.turn&&!p.folded?[i]:[]);
  return {...obs,seat:game.turn,opponentProfiles:seats.map(i=>memory.profile(i)),opponentLines:seats.map(i=>memory.line(i))};
}
export function estimateEquity(observation, trials, random = Math.random) {
  return simulateEquity(observation, trials, random).equity;
}
export function chooseBotAction(obs, difficulty = 'medium', random = Math.random) {
  const level = normalizeDifficulty(difficulty);
  if (level !== 'easy') {
    const base={...(level==='hard'?TRAINED_POLICY:DEFAULT_POLICY)};
    // Distinct tendencies remain small; every bot responds to the same public evidence.
    if(level==='hard'&&obs.seat===1){base.defend+=.01;base.size-=.05;}
    if(level==='hard'&&obs.seat===2){base.openLate-=.02;base.size+=.05;}
    const adapted=adaptStrategy(obs,base,level==='hard'?1:.5);
    return strategicAction(adapted.observation,adapted.policy,random,level==='hard'?360:100);
  }
  const o = obs.options, roll = random();
  const pair = obs.cards[0].r === obs.cards[1].r;
  const made = obs.board.length >= 3 ? evaluate([...obs.cards, ...obs.board])[0] : 0;
  if (o.owed && o.call > obs.pot * .8 && !pair && made < 2 && roll < .45) return { action:'fold' };
  if (o.canRaise && (pair || made >= 2) && roll > .85) return { action:'raise', amount:Math.min(o.max, Math.max(o.min, obs.current + Math.max(20, Math.round((obs.pot + o.call) * .3 / 10) * 10))) };
  return { action:'call' };
}
