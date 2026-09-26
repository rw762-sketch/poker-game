import {writeFileSync} from 'node:fs';
import {sampleRangeGame} from './train-ranges.mjs';
import {inferRange} from '../range-model.js';
import {readObservation} from '../strategy.js';
import {RANGE_PROFILES,preflopStrength} from '../poker-math.js';
const key=cards=>cards.map(c=>c.s*13+c.r).sort((a,b)=>a-b).join(',');
const rows=[],start=Date.now();let actions=0;
for(let h=0;h<10000;h++){
 const lines=[[],[],[],[]];let scored=false;
 const result=sampleRangeGame(8800000+h,({event})=>lines[event.seat].push(event),({game:g,event})=>{
  if(scored||h%3||g.done||g.stage!==1+Math.floor(h/3)%3||event.street!==g.stage||event.type==='fold'||event.seat===g.turn||g.players[event.seat].folded)return;
  const obs=readObservation(g),target=event.seat;
  const range=inferRange(obs.cards,obs.board,lines[target]),truth=key(g.players[target].cards),actual=range.find(c=>key(c.cards)===truth);
  if(!actual)throw Error('True holding excluded by visible-card filter');
  const seats=g.players.flatMap((p,i)=>i!==g.turn&&!p.folded?[i]:[]),coarse=obs.opponentRanges[seats.indexOf(target)],cutoff=RANGE_PROFILES[coarse].cutoff;
  const members=range.filter(c=>preflopStrength(c.cards)>=cutoff),inCoarse=preflopStrength(actual.cards)>=cutoff;
  const prior=.1/range.length+(inCoarse?.9/members.length:0),uniform=1/range.length;
  const better=range.filter(c=>c.weight>actual.weight+1e-12).length,equal=range.filter(c=>Math.abs(c.weight-actual.weight)<=1e-12).length;
  const coverage=Math.max(0,Math.min(1,(range.length*.2-better)/Math.max(1,equal)));
  rows.push({street:g.stage,actions:lines[target].length,learnedLoss:-Math.log(actual.weight),coarseLoss:-Math.log(prior),uniformLoss:-Math.log(uniform),top20Coverage:coverage});scored=true;
 });actions+=result.actions;
 if((h+1)%2000===0)console.log(JSON.stringify({heldoutHands:h+1,predictions:rows.length}));
}
function mean(xs){return xs.reduce((s,n)=>s+n,0)/xs.length;}
function delta(key){const xs=rows.map(r=>r.learnedLoss-r[key]),m=mean(xs),se=Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1)/xs.length);return {mean:m,interval95:[m-1.96*se,m+1.96*se]};}
const report={heldoutHands:10000,heldoutActions:actions,predictions:rows.length,seedStart:8800000,trainingSeedStart:6600000,seedSetsDisjoint:true,meanLearnedLogLoss:mean(rows.map(r=>r.learnedLoss)),meanCoarseLogLoss:mean(rows.map(r=>r.coarseLoss)),meanUniformLogLoss:mean(rows.map(r=>r.uniformLoss)),learnedMinusCoarse:delta('coarseLoss'),learnedMinusUniform:delta('uniformLoss'),top20Coverage:mean(rows.map(r=>r.top20Coverage)),byStreet:[1,2,3].map(street=>({street,predictions:rows.filter(r=>r.street===street).length})),elapsedSeconds:(Date.now()-start)/1000,limitations:['Synthetic styles used for training; disjoint deals, not unseen human behavior.','Offline hidden cards are used only as scoring labels; inference receives own cards and public events.','Holding prediction gains do not prove poker win-rate improvement or GTO optimality.','Coarse baseline retains 10% uniform uncertainty mass for a finite, fairer log-loss comparison.']};
writeFileSync('training/range-learning/holdout.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
