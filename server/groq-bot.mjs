import { readObservation } from '../strategy.js';
import { botObservation, chooseBotAction } from '../ai.js';
import { updateStored } from './cloud-state.mjs';

export const GROQ_MODEL = 'openai/gpt-oss-20b';
const DAILY_LIMIT = 100;

// Called inside the snapshot transaction. Reserve quota and this turn before
// any network I/O, so concurrent polls cannot spend twice on the same decision.
export function claimBotJob(service, response) {
  const table = service.rooms.get(response.room)?.table;
  const now = service.now();
  if (!table?.apiBots || table.game.done || !table.members[table.game.turn]?.bot ||
      now < table.deadline - 45000 + 1200 || table.apiSkipDeadline === table.deadline) return null;
  if (table.apiPending?.deadline === table.deadline) return null;
  const day = Math.floor(now / 86400000);
  const budget = service.aiBudget ||= { day, count: 0, nextAt: 0 };
  if (budget.day !== day) { budget.day = day; budget.count = 0; }
  if (budget.count >= DAILY_LIMIT || now < budget.nextAt) {
    table.apiSkipDeadline = table.deadline;
    return null;
  }
  budget.count++;
  budget.nextAt = now + 10000;
  const job = { id: crypto.randomUUID(), room: response.room, hand: table.game.hand,
    seat: table.game.turn, deadline: table.deadline, observation: readObservation(table.game) };
  table.apiPending = { id: job.id, deadline: job.deadline };
  return job;
}

export function validDecision(value, observation) {
  if (!value || !['fold', 'call', 'raise', 'allin'].includes(value.action)) return null;
  const o = observation.options;
  if (value.action === 'raise' && (!o.canRaise || !Number.isInteger(value.amount) ||
      value.amount < o.min || value.amount > o.max)) return null;
  if (value.action === 'allin' && o.owed < observation.stack && !o.canRaise) return null;
  return value.action === 'raise' ? { action: value.action, amount: value.amount } : { action: value.action };
}

export async function askGroq(observation, key, fetcher = fetch) {
  if (!key) return null;
  try {
    const response = await fetcher('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(6000),
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: GROQ_MODEL, max_completion_tokens: 1024, reasoning_effort: 'low',
        messages: [
          { role: 'system', content: 'Play no-limit Texas Holdem with play chips. Use only the observation. Cards use ranks 2-14 and suit numbers 0-3. Consider pot odds, position, and inferred opponent ranges. call means check when nothing is owed; raise amount is the total street bet, not additional chips. Respect options.min, max and canRaise. Return one legal move; amount must be 0 unless raising.' },
          { role: 'user', content: JSON.stringify(observation) },
        ],
        response_format: { type: 'json_schema', json_schema: { name: 'poker_move', strict: true,
          schema: { type: 'object', properties: { action: { type: 'string', enum: ['fold', 'call', 'raise', 'allin'] },
            amount: { type: 'integer' } }, required: ['action', 'amount'], additionalProperties: false } } },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return validDecision(JSON.parse(data.choices?.[0]?.message?.content), observation);
  } catch { return null; }
}

export async function completeBotJob(database, job, decision, now = Date.now) {
  return updateStored(database, service => {
    const table = service.rooms.get(job.room)?.table;
    if (!table || table.apiPending?.id !== job.id) return false;
    delete table.apiPending;
    if (table.game.done || table.game.hand !== job.hand || table.game.turn !== job.seat ||
        table.deadline !== job.deadline || service.now() >= job.deadline - 45000 + 9000) return false;
    const move = validDecision(decision, readObservation(table.game)) ||
      chooseBotAction(botObservation(table.game, table.memory), 'medium');
    table.act(job.seat, { ...move, version: table.version }, service.now());
    return true;
  }, now);
}

export async function runBotJob(database, job, key, fetcher = fetch) {
  const decision = await askGroq(job.observation, key, fetcher);
  await completeBotJob(database, job, decision);
}
