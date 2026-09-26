import test from 'node:test';
import assert from 'node:assert/strict';
import { HostTable, TURN_MS } from '../room-state.js';
import { PokerService } from '../server/poker-service.mjs';
import { encode, decode } from '../server/cloud-state.mjs';
import { botObservation } from '../ai.js';
import { saveRoomMemory } from '../room-memory.js';
import { playerOutcome } from '../player-outcome.js';
import { celebrationEvent } from '../celebration.js';
import { Poker } from '../engine.js';
const c=(r,s)=>({r,s});
function showdown(hands,totals,board=[c(2,1),c(5,1),c(9,1),c(13,0),c(3,3)]) {
  const g=new Poker();g.hand=1;g.board=board;g.dealer=0;g.pot=totals.reduce((a,b)=>a+b,0);
  g.players.forEach((p,i)=>Object.assign(p,{name:['Ryan','Alex','Morgan','Hidden'][i],cards:hands[i]||[],folded:!hands[i],total:totals[i]||0,stack:0}));
  g.showdown();return g;
}
test('winner and loser receive opposite personal comparisons; only winner celebrates',()=>{
  const g=showdown([[c(10,1),c(8,1)],[c(14,2),c(12,0)]],[100,100]);
  const before={hand:1,done:false};
  const host=playerOutcome(g,0),guest=playerOutcome(g,1);
  assert.equal(host.kind,'win');assert.match(host.detail,/Your ten-high flush beat Alex’s ace-high/);
  assert.equal(guest.kind,'loss');assert.match(guest.detail,/Your ace-high lost to Ryan’s ten-high flush/);
  assert.equal(celebrationEvent(before,{hand:1,done:true,outcome:host}).kind,'win');
  assert.equal(celebrationEvent(before,{hand:1,done:true,outcome:guest}).kind,'loss');
  g.awards[0].allIn=true;
  assert.equal(playerOutcome(g,0).kind,'all-in-win');assert.equal(playerOutcome(g,1).kind,'loss');
  const t=new HostTable('Ryan');t.game=g;
  assert.equal(t.view(0).outcome.kind,'all-in-win');assert.equal(t.view(1).outcome.kind,'loss');
});
test('split pots, side-pot-only returns and folded hands never display false victory',()=>{
  const royal=[10,11,12,13,14].map(r=>c(r,1));
  const tie=showdown([[c(2,0),c(3,0)],[c(4,0),c(5,0)]],[100,100],royal);
  assert.equal(playerOutcome(tie,0).kind,'split');assert.equal(playerOutcome(tie,1).kind,'split');
  const side=showdown([[c(10,1),c(8,1)],[c(13,2),c(13,3)],[c(14,2),c(12,0)]],[100,200,300]);
  assert.equal(playerOutcome(side,0).kind,'win');
  assert.equal(playerOutcome(side,1).kind,'partial'); // Won back contribution only.
  assert.equal(playerOutcome(side,2).kind,'loss'); // Uncalled refund is not a win.
  assert.match(playerOutcome(side,1).detail,/lost to Ryan/);
  assert.match(playerOutcome(side,1).detail,/beat Morgan/);
  side.players[2].folded=true;
  assert.equal(playerOutcome(side,2).kind,'fold');
  assert.ok(!playerOutcome(side,2).detail.includes('ace'));
});
test('room betting history survives a server reload mid-hand without leaking to players',()=>{
  let now=100000;let service=new PokerService(()=>now);
  const host=service.handle('/session','',{name:'Host'});
  const write=(path,body={})=>{now+=101;return service.handle(path,host.token,{requestId:crypto.randomUUID(),...body});};
  const created=write('/create');let state=write('/bots',{operation:'add',version:created.state.version}).state;
  state=write('/deal',{version:state.version}).state;
  const requestId=crypto.randomUUID();state=write('/action',{action:'call',version:state.version,requestId}).state;
  const table=service.rooms.get(created.room).table;
  assert.equal(table.memory.current.actions.length,1);
  write('/action',{action:'call',version:state.version-1,requestId});
  assert.equal(table.memory.current.actions.length,1); // Retry must not train twice.
  const serialized=encode(service);service=decode(serialized,()=>now);
  assert.equal(encode(service),serialized);
  const restored=service.rooms.get(created.room).table;
  assert.equal(restored.memory.current.actions.length,1);
  assert.equal(botObservation(restored.game,restored.memory).opponentLines[0][0].type,'call');
  const view=restored.view(0);
  assert.equal(view.memory,undefined);assert.equal(view.opponentProfiles,undefined);
  assert.ok(!JSON.stringify(saveRoomMemory(restored.memory)).includes('cards'));
  now+=1300;service.handle('/poll',host.token);
  assert.ok((restored.memory.current?.actions.length || restored.memory.history[0]?.actions.length)>=2);
});
test('completed hands build opponent reads; invalid actions and timeouts are not learned',()=>{
  const t=new HostTable('Host',1000);t.manageAI(0,'add',null,t.version,1000);
  for(let h=0;h<12;h++) {
    t.game.players[0].stack=t.game.players[1].stack=1000;
    t.start(0,t.version,1000);
    let steps=0;
    while(!t.game.done&&steps++<100) t.act(t.game.turn,{action:'call',version:t.version},1000);
  }
  assert.equal(t.memory.history.length,12);assert.ok(t.memory.profile(0).confidence>0);
  t.start(0,t.version,1000);
  const before=t.memory.current.actions.length;
  assert.throws(()=>t.act(t.game.turn,{action:'raise',amount:999999,version:t.version},1000));
  assert.equal(t.memory.current.actions.length,before);
  const human=0;t.game.turn=human;t.deadline=1000;
  t.tick(1000+TURN_MS);
  assert.equal((t.memory.current||t.memory.history.at(-1)).actions.length,before);
});
test('legacy saved rooms restore without memory and initialize current-hand observations',()=>{
  const s=new PokerService(()=>1000),h=s.handle('/session','',{name:'Host'});
  s.handle('/create',h.token,{requestId:crypto.randomUUID()});
  const raw=JSON.parse(encode(s));delete raw.rooms[0][1].table.memory;
  const restored=decode(JSON.stringify(raw),()=>1000);
  assert.deepEqual([...restored.rooms.values()][0].table.memory.history,[]);
});
