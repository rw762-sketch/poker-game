import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate } from '../engine.js';
import { rankHand, simulateEquity, seededRandom, validateScenario } from '../poker-math.js';
import { analyzeDecision, strategicAction } from '../strategy.js';
const cards = s => s.split(' ').map(c=>({r:'23456789TJQKA'.indexOf(c[0])+2,s:'shcd'.indexOf(c[1])}));
function reference(cs) { const a=evaluate(cs);let score=a[0];for(let i=1;i<=5;i++)score=score*15+(a[i]||0);return score; }
test('fast evaluator agrees with exhaustive best-five evaluation on 5,000 hands',()=>{
 const random=seededRandom(921),deck=[];for(let s=0;s<4;s++)for(let r=2;r<=14;r++)deck.push({r,s});
 for(let n=0;n<5000;n++){const pool=[...deck],hand=[];for(let i=0;i<5+n%3;i++)hand.push(pool.splice(Math.floor(random()*pool.length),1)[0]);assert.equal(rankHand(hand),reference(hand));}
});
test('wheel, full house with two trips, quads kickers, and board ties',()=>{
 for(const text of ['As 2h 3c 4d 5s Kh Qh','As Ah Ac Ks Kh Kd 2h','As Ah Ac Ad Ks 2h 3h','As Ks Qs Js Ts 2h 3h'])assert.equal(rankHand(cards(text)),reference(cards(text)));
 assert.equal(rankHand(cards('As Ah Ac Ad Ks 2h 3h')),rankHand(cards('As Ah Ac Ad Ks 8h 9h')));
 const r=simulateEquity({cards:cards('2h 3h'),board:cards('As Ks Qs Js Ts'),opponents:3},100,seededRandom());assert.equal(r.win,0);assert.equal(r.tie,1);assert.equal(r.equity,.25);
});
test('exact known hand has certain win/loss and unknown preflop is plausible',()=>{
 const input={cards:cards('As Ah'),board:cards('Ac 7h 5d 3s 2c'),knownOpponent:cards('Ks Kh'),opponents:1};
 assert.equal(simulateEquity(input,100).win,1);assert.equal(simulateEquity({...input,cards:input.knownOpponent,knownOpponent:input.cards},100).win,0);
 const r=simulateEquity({cards:cards('As Ah'),board:[],opponents:1},5000,seededRandom());assert.ok(r.equity>.82&&r.equity<.88);assert.ok(Math.abs(r.win+r.tie+r.loss-1)<1e-10);
});
test('duplicates, incomplete flop, invalid opponent counts and partial known hands rejected',()=>{
 assert.throws(()=>validateScenario({cards:cards('As As')}),/twice/);
 assert.throws(()=>validateScenario({cards:cards('As Kh'),board:cards('As 2h 3d')}),/twice/);
 assert.throws(()=>validateScenario({cards:cards('As Kh'),board:cards('2h')}),/flop/);
 assert.throws(()=>validateScenario({cards:cards('As Kh'),opponents:0}),/opponents/);
 assert.throws(()=>validateScenario({cards:cards('As Kh'),knownOpponent:cards('2h')}),/both/);
});
test('ranges and position are separate; raw equity ignores position',()=>{
 const input={cards:cards('As 7d'),board:[],opponents:1};
 const a=simulateEquity({...input,position:'early'},1000,seededRandom(9));
 const b=simulateEquity({...input,position:'late'},1000,seededRandom(9));assert.deepEqual(a,b);
 const tight=simulateEquity({...input,range:'tight'},2000,seededRandom(9));assert.ok(tight.equity<a.equity);
});
test('pot odds and call EV use the pot INCLUDING the bet, with legal bet totals',()=>{
 const input={cards:cards('As Ah'),board:cards('Ac 7h 5d 3s 2c'),opponents:1,pot:150,toCall:50,stack:1000,ownBet:20,bigBlind:20,lastRaise:50,position:'late'};
 const r=analyzeDecision(input,{equity:.4,margin95:.01});assert.equal(r.price,.25);assert.equal(r.callEV,30);
 const nuts=analyzeDecision(input,{equity:1,margin95:0});assert.equal(nuts.action,'Raise to');assert.ok(nuts.amount>=120);assert.ok(nuts.amount<=1020);assert.equal(nuts.additional,nuts.amount-20);
 const short=analyzeDecision({...input,stack:60},{equity:1,margin95:0});assert.equal(short.amount,80);assert.equal(short.allIn,true);
 assert.throws(()=>analyzeDecision({...input,toCall:2000},{equity:1}),/capped/);
});
test('strategy respects position for opening ranges without inspecting hidden data',()=>{
 const input={cards:cards('Qh 8h'),board:[],opponents:3,pot:30,current:20,bet:0,stack:1000,bigBlind:20,unopened:true,options:{owed:20,call:20,canRaise:true,min:40,max:1000}};
 assert.equal(strategicAction({...input,position:'late'},undefined,()=>.5).action,'raise');
 assert.equal(strategicAction({...input,position:'early'},undefined,()=>.5).action,'fold');
});
