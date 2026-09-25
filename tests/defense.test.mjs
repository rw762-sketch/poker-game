import test from 'node:test';
import assert from 'node:assert/strict';
import {Poker} from '../engine.js';
import {readObservation,strategicAction} from '../strategy.js';
import {chooseBotAction} from '../ai.js';
import {TRAINED_POLICY} from '../trained-policy.js';
import {seededRandom} from '../poker-math.js';
const cards=s=>s.split(' ').map(c=>({r:'23456789TJQKA'.indexOf(c[0])+2,s:'shcd'.indexOf(c[1])}));
const obs={cards:cards('7h 6h'),board:cards('Ac 9s 2d'),opponents:2,opponentRanges:['standard','standard'],position:'early',pot:190,stack:1000,current:10,bet:0,bigBlind:20,options:{call:10,owed:10,min:30,max:1000,canRaise:false}};
test('Hard defends a cheap call with sufficient equity instead of adding a fixed 8-point margin',()=>{
 assert.equal(strategicAction(obs,TRAINED_POLICY,seededRandom(),360,.12).action,'call');
 assert.equal(strategicAction(obs,TRAINED_POLICY,seededRandom(),360,.03).action,'fold');
});
test('river and all-in calls use showdown pot odds without a future betting penalty',()=>{
 const river={...obs,board:cards('Ac 9s 2d 3h 8c'),pot:150,options:{...obs.options,call:50,owed:50}};
 assert.equal(strategicAction(river,TRAINED_POLICY,seededRandom(),360,.27).action,'call');
 assert.equal(strategicAction(river,TRAINED_POLICY,seededRandom(),360,.20).action,'fold');
 const allin={...obs,stack:50,pot:150,options:{...obs.options,call:50,owed:50}};
 assert.equal(strategicAction(allin,TRAINED_POLICY,seededRandom(),360,.27).action,'call');
});
test('large total preflop bet does not force a fold when only a tiny all-in call remains',()=>{
 const cheap={...obs,board:[],current:160,stack:5,bet:155,pot:600,options:{owed:5,call:5,min:160,max:160,canRaise:false}};
 assert.equal(chooseBotAction(cheap,'hard',seededRandom(53)).action,'call');
});
test('callers are not assigned a tight range merely for matching a large raise',()=>{
 const g=new Poker();g.start(seededRandom(21));g.turn=0;g.current=160;g.pot=600;
 g.players[0].bet=0;g.players[1].bet=160;g.players[1].action='Call 140';
 g.players[2].bet=160;g.players[2].action='Raise to 160';
 const o=readObservation(g);assert.equal(o.opponentRanges[0],'standard');assert.equal(o.opponentRanges[1],'tight');
});
test('cheap calls in a limped pot use equity instead of an unopened-pot fold cutoff',()=>{
 const limped={...obs,board:[],unopened:true,limped:true,current:20,pot:100,options:{...obs.options,call:10,owed:10}};
 assert.equal(strategicAction(limped,TRAINED_POLICY,seededRandom(),360,.3).action,'call');
});
