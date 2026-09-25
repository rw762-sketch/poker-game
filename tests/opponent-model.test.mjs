import test from 'node:test';
import assert from 'node:assert/strict';
import { OpponentModel, learnBluffPolicy } from '../opponent-model.js';
import { PlayerMemory } from '../player-memory.js';
const small={street:1,price:.1,spr:3,opponents:1},large={...small,price:.45};
const examples=Array.from({length:120},(_,i)=>({context:i%2?small:large,fold:i%2?0:1}));
test('logistic model learns conditional fold responses rather than one global frequency',()=>{
 const m=new OpponentModel(examples);
 assert.ok(m.predict(large).fold>m.predict(small).fold+.4);
 assert.ok(m.predict(small).confidence>0);
 assert.equal(m.predict({...small,street:3}).confidence,0);
 assert.equal(new OpponentModel(examples.slice(0,10)).predict(small).confidence,0);
 assert.equal(new OpponentModel([{context:{price:NaN},fold:1}]).samples,0);
});
test('completed hands train model; save/reload reproduces predictions; reset clears learning',()=>{
 const m=new PlayerMemory();
 for(let i=0;i<40;i++){
  m.begin({players:[{folded:false}]});
  m.record({seat:0,street:1,type:i%2?'call':'fold',faced:true,size:0,chips:0,context:i%2?small:large});
  if(i===0)assert.equal(m.model(0).samples,0);
  m.finish();
 }
 assert.equal(m.model(0).samples,40);
 const restored=new PlayerMemory(JSON.parse(JSON.stringify(m.save())));
 assert.deepEqual(restored.predictFold(0,large),m.predictFold(0,large));
 assert.equal(new PlayerMemory().model(0).samples,0);
 const legacy=new PlayerMemory({version:1,history:[{seats:[0],actions:[{seat:0,street:1,type:'fold',faced:true,size:0,chips:0}]}]});
 assert.equal(legacy.history.length,1);assert.equal(legacy.model(0).samples,0);
});
test('learned adjustment is bounded and gated by familiar observations',()=>{
 const base={bluff:.04,size:.65};
 assert.deepEqual(learnBluffPolicy(base,{fold:.9,confidence:0},.65),base);
 const folder=learnBluffPolicy(base,{fold:.9,confidence:1},.65),caller=learnBluffPolicy(base,{fold:.1,confidence:1},.65);
 assert.ok(folder.bluff>base.bluff&&folder.bluff<=.16);
 assert.ok(caller.bluff<base.bluff&&caller.bluff>=0);
 assert.equal(folder.size,base.size);
});
