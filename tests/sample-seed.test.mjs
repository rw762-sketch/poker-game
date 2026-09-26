import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleSeed} from '../scripts/sample-seed.mjs';
import {seededRandom} from '../poker-math.js';
test('scenario seeds cover first-draw buckets without adjacent-seed correlation',()=>{
 const draws=Array.from({length:10000},(_,i)=>seededRandom(sampleSeed(5500000+i))());
 const bins=Array(10).fill(0);for(const x of draws)bins[Math.floor(x*10)]++;
 assert.ok(bins.every(n=>n>850&&n<1150));
 const mean=draws.reduce((s,x)=>s+x,0)/draws.length;
 const variance=draws.reduce((s,x)=>s+(x-mean)**2,0);
 const covariance=draws.slice(1).reduce((s,x,i)=>s+(x-mean)*(draws[i]-mean),0);
 assert.ok(Math.abs(covariance/variance)<.08);
 assert.equal(sampleSeed(55),sampleSeed(55));
});
