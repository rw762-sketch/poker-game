import {sampleSeed} from './sample-seed.mjs';
import {writeFileSync,mkdirSync} from 'node:fs';
import {gtoDecision} from '../gto.js';
import {seededRandom} from '../poker-math.js';
const cards=s=>s.split(' ').map(c=>({r:'23456789TJQKA'.indexOf(c[0])+2,s:'shcd'.indexOf(c[1])}));
const base={cards:cards('Qs Js'),board:cards('Ts 9d 2s'),opponents:1,opponentRanges:['standard'],pot:200,current:0,bet:0,stack:1000,effectiveStack:1000,position:'late',seat:2,bigBlind:20,options:{owed:0,call:0,min:20,max:1000,canRaise:true}};
const cases=[
 ['live-draw',base],
 ['weak-river',{...base,cards:cards('6h 5c'),board:cards('2s 9d Jh Qc As')}],
 ['ace-blocker-river',{...base,cards:cards('As 5d'),board:cards('Ks 9s 2s Qd 7c')}],
 ['nuts-mixed-value',{...base,cards:cards('As Ks'),board:cards('Qs Js Ts 2d 3c')}],
 ['multiway-draw',{...base,opponents:3,opponentRanges:['standard','standard','standard']}],
 ['opponent-all-in',{...base,effectiveStack:0,options:{owed:0,call:0,min:20,max:1000,canRaise:false}}],
 ['board-tie',{...base,cards:cards('2h 3c'),board:cards('As Ks Qs Js Ts')}],
 ['draw-facing-bet',{...base,pot:250,current:50,options:{owed:50,call:50,min:100,max:1000,canRaise:true}}],
];
const results=[],start=Date.now();
for(const [i,[name,obs]] of cases.entries()){
 let raises=0,folds=0,bluffs=0,expected=0,variance=0;
 for(let j=0;j<1000;j++){
  const d=gtoDecision(obs,seededRandom(sampleSeed(5500000+i*1000+j)));
  if(!obs.options.owed&&d.action==='fold')throw Error(`${name}: folded free check`);
  if(d.action==='raise'){
   if(!obs.options.canRaise||!Number.isInteger(d.amount)||d.amount<obs.options.min||d.amount>obs.options.max)throw Error(`${name}: illegal raise`);
   raises++;if(d.analysis.bluffKind)bluffs++;
  }
  if(d.action==='fold')folds++;
  const p=d.analysis.raiseFrequency||0;expected+=p;variance+=p*(1-p);
 }
 const residual=raises-expected,se=Math.sqrt(variance);
 if(Math.abs(residual)>Math.max(12,5*se))throw Error(`${name}: observed mix inconsistent with stated probabilities`);
 if(['multiway-draw','opponent-all-in','board-tie'].includes(name)&&bluffs)throw Error(`${name}: inappropriate bluff`);
 const result={name,decisions:1000,raises,folds,bluffs,expectedRaises:expected,mixingResidualStandardErrors:se?residual/se:0};results.push(result);console.log(JSON.stringify(result));
}
mkdirSync('training/regression-2026-09-25',{recursive:true});writeFileSync('training/regression-2026-09-25/targeted.json',JSON.stringify({seedMix:'32-bit avalanche',decisions:8000,seedStart:5500000,productionRollouts:600,results,failures:0,elapsedSeconds:(Date.now()-start)/1000,limitations:['Constructed scenarios; action-frequency consistency does not establish GTO optimality.']},null,2));
