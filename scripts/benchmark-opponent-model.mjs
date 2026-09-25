import {writeFileSync} from 'node:fs';
import {Poker} from '../engine.js';
import {PlayerMemory} from '../player-memory.js';
import {OpponentModel} from '../opponent-model.js';
import {seededRandom} from '../poker-math.js';
// Disjoint complete hands with known, context-sensitive synthetic opponents.
// Measures prediction, NOT poker win rate or strength against humans.
function collect(start,count){
 const rows=[[],[],[],[]],memory=new PlayerMemory();
 for(let h=0;h<count;h++){
  const g=new Poker(),rng=seededRandom(start+h);g.dealer=h%4-1;g.start(rng);let moves=0;
  while(!g.done&&moves++<200){
   const seat=g.turn,o=g.options(),price=o.call/Math.max(1,g.pot+o.call);
   const probability=[.05+1.7*price,.05+.15*price,.15+1.2*price+(g.stage>1?.2:0),.08+.7*price][seat];
   let action=o.owed&&rng()<probability?'fold':'call',amount;
   if(action==='call'&&o.canRaise&&rng()<.22){action='raise';amount=Math.min(o.max,Math.max(o.min,g.current+Math.round((g.pot+o.call)*[.33,.65,1][Math.floor(rng()*3)])));}
   const e=memory.capture(g,action,amount);
   if(!g.act(action,amount))throw Error('Illegal benchmark action');
   if(e.faced)rows[seat].push({context:e.context,fold:e.type==='fold'?1:0});
  }
  if(!g.done)throw Error('Unfinished benchmark hand');
 }
 return rows;
}
const train=collect(610000,2000),holdout=collect(910000,1000);
let modelLoss=0,baselineLoss=0,n=0;
const opponents=train.map((rows,i)=>{
 const model=new OpponentModel(rows),baseline=(rows.reduce((s,e)=>s+e.fold,0)+3.6)/(rows.length+8);
 let ml=0,bl=0;
 for(const e of holdout[i]){const p=model.predict(e.context).fold;ml+=(p-e.fold)**2;bl+=(baseline-e.fold)**2;}
 modelLoss+=ml;baselineLoss+=bl;n+=holdout[i].length;
 return {seat:i,trainingResponses:rows.length,heldoutResponses:holdout[i].length,modelBrier:ml/holdout[i].length,constantBaselineBrier:bl/holdout[i].length};
});
const report={method:'Logistic regression on public bet responses; frozen evaluation on disjoint complete simulated hands.',trainingHands:2000,holdoutHands:1000,trainingSeedStart:610000,holdoutSeedStart:910000,modelBrier:modelLoss/n,constantBaselineBrier:baselineLoss/n,opponents,limitations:['Synthetic context-sensitive opponents; no human performance claim.','Brier score measures prediction error, not poker profit.','Live model uses only the most recent 120 hands, requires familiar contexts, and does not use these benchmark weights.']};
writeFileSync('training/opponent-model-report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
