import test from 'node:test';
import assert from 'node:assert/strict';
import { Poker } from '../engine.js';
import { compareHandsText } from '../hand-description.js';
const c = (r,s) => ({r,s});
function showdown(board, hands, totals = hands.map(()=>100)) {
  const g=new Poker();g.board=board;g.dealer=0;g.pot=totals.reduce((a,b)=>a+b,0);
  g.players.forEach((p,i)=>Object.assign(p,{name:['Ryan','Alex','Morgan','Hidden'][i],cards:hands[i]||[],folded:!hands[i],total:totals[i]||0,stack:0}));
  g.showdown(); return g;
}
test('winner result compares a flush against ace-high without including folded hands',()=>{
  const g=showdown([c(2,1),c(5,1),c(9,1),c(13,0),c(3,3)],[[c(10,1),c(8,1)],[c(14,2),c(12,0)]]);
  assert.match(g.result,/Ryan wins the pot \(200 chips\): a ten-high flush beats ace-high \(Alex\)/);
  assert.ok(!g.result.includes('Hidden'));
  assert.equal(g.players[0].stack,200);
});
test('same category names include the deciding kicker and exact ties explain a split',()=>{
  const g=showdown([c(13,0),c(13,1),c(9,2),c(6,3),c(2,0)],[[c(14,1),c(3,2)],[c(12,1),c(11,0)]]);
  assert.match(g.result,/ace beats queen as the kicker/);
  const tied=showdown([c(10,1),c(11,1),c(12,1),c(13,1),c(14,1)],[[c(2,0),c(3,0)],[c(4,0),c(5,0)]]);
  assert.match(tied.result,/Alex and Ryan split the pot/);
  assert.match(tied.result,/same best five-card hand, a royal flush/);
  assert.equal(tied.players[0].stack,100);assert.equal(tied.players[1].stack,100);
});
test('each side pot compares only eligible hands and uncalled chips are refunds',()=>{
  const g=showdown([c(2,1),c(5,1),c(9,1),c(13,0),c(3,3)],[[c(10,1),c(8,1)],[c(13,2),c(13,3)],[c(14,2),c(12,0)]],[100,200,300]);
  assert.match(g.result,/Ryan wins the main pot \(300 chips\)/);
  assert.match(g.result,/Alex wins side pot 1 \(200 chips\): three kings beats ace-high \(Morgan\)/);
  assert.match(g.result,/Morgan gets 100 uncalled chips back/);
  assert.equal(g.players.reduce((sum,p)=>sum+p.stack,0),600);
});
test('flush tie breakers compare the first differing card, not suits',()=>{
  assert.match(compareHandsText([5,14,13,10,7,2],[5,14,12,10,7,2]),/king beats queen as the next differing card/);
});
