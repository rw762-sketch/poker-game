import test from 'node:test';
import assert from 'node:assert/strict';
import { TableGifts, validGift } from '../table-gifts.js';
import { HostTable } from '../room-state.js';
test('gifts validate seats, drink choices and per-sender cooldown', () => {
  const gifts = new TableGifts(), members = [{online:true},{online:true},{online:false}];
  assert.deepEqual(gifts.create(0,1,'tea',members,0), {from:0,to:1,drink:'tea'});
  assert.throws(()=>gifts.create(0,1,'coffee',members,3999));
  assert.doesNotThrow(()=>gifts.create(1,0,'coffee',members,1));
  assert.doesNotThrow(()=>gifts.create(0,1,'coffee',members,4000));
  for (const [to,drink] of [[0,'tea'],[2,'tea'],[4,'tea'],[1,'__proto__'],[1,'<script>']]) assert.throws(()=>gifts.create(0,to,drink,members,8000));
  assert.equal(validGift({from:0,to:1,drink:'constructor'}),false);
});
test('a gift cannot change chips, private cards, action version or turn deadline', () => {
  const table = new HostTable('Host'); table.join('Friend','a'.repeat(24)); table.start(0,table.version);
  const before = JSON.stringify(table);
  new TableGifts().create(0,1,'mocktail',table.members);
  assert.equal(JSON.stringify(table),before);
});
