import test from 'node:test';
import assert from 'node:assert/strict';
import { peerConfiguration } from '../network-config.js';
import { OnlineRoom } from '../multiplayer.js';
import { EventEmitter } from 'node:events';

test('direct configuration omits defunct bundled TURN servers', async () => {
  const config = await peerConfiguration(() => { throw Error('unexpected request'); });
  assert.ok(config.iceServers.length);
  assert.ok(config.iceServers.every(s => !s.urls.includes('turn.peerjs.com')));
});
test('relay credentials are fetched without caching and validated', async () => {
  const relay = { urls:['turn:relay.example:3478','turns:relay.example:443?transport=tcp'],username:'temporary',credential:'temporary' };
  const config = await peerConfiguration(async (url,options) => {
    assert.equal(url,'https://example.test/ice'); assert.equal(options.cache,'no-store');
    return {ok:true,json:async () => [relay]};
  }, 'https://example.test/ice');
  assert.deepEqual(config.iceServers.at(-1),relay);
  for (const value of [[],{},[{urls:'https://wrong.example'}],[{urls:'turn:relay.example'}]]) {
    await assert.rejects(peerConfiguration(async () => ({ok:true,json:async()=>value}),'https://example.test/ice'));
  }
  await assert.rejects(peerConfiguration(async () => ({ok:false}),'https://example.test/ice'),/authorize/);
});
test('a missing room rejects immediately with the specific error and removes its listener', async () => {
  const room = new OnlineRoom({onState(){},onStatus(){},onError(){}});
  const peer = new EventEmitter(), connection = new EventEmitter();
  connection.close = () => connection.emit('close');
  peer.connect = () => connection; room.peer = peer; room.code = 'ABCDEFGH';
  const joining = room.connectToHost();
  peer.emit('error',{type:'peer-unavailable'});
  await assert.rejects(joining,/Room not found/);
  assert.equal(peer.listenerCount('error'),0);
});
test('transport failure preserves useful network guidance and does not leave a pending join', async () => {
  const room = new OnlineRoom({onState(){},onStatus(){},onError(){}});
  const peer = new EventEmitter(), connection = new EventEmitter();
  connection.close = () => connection.emit('close'); peer.connect = () => connection;
  room.peer = peer; room.code = 'ABCDEFGH';
  const joining = room.connectToHost();
  connection.emit('error',new Error('ICE failed'));
  await assert.rejects(joining,/browser connection to the host failed/);
  assert.equal(peer.listenerCount('error'),0);
});
