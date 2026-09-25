// Binary logistic regression trained on observed responses to bets, never cards.
// Retrained from the bounded history so reset, expiry, and reload are reproducible.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const sigmoid=z=>1/(1+Math.exp(-clamp(z,-30,30)));
export function validContext(c) {
  return c && Number.isInteger(c.street)&&c.street>=0&&c.street<=3 &&
    Number.isFinite(c.price)&&c.price>=0&&c.price<=1 &&
    Number.isFinite(c.spr)&&c.spr>=0&&c.spr<=1000 &&
    Number.isInteger(c.opponents)&&c.opponents>=1&&c.opponents<=3;
}
function features(c) {
  return [1,c.price*2,c.street===0?1:0,c.street===1?1:0,c.street===2?1:0,
    Math.log1p(Math.min(c.spr,20))/Math.log(21),(c.opponents-1)/2,c.price*(c.street===3?1:0)*2];
}
export class OpponentModel {
  constructor(examples=[]) {
    this.examples=examples.filter(e=>validContext(e.context)&&(e.fold===0||e.fold===1));
    this.weights=[Math.log(.45/.55),0,0,0,0,0,0,0];
    this.samples=this.examples.length;
    const prepared=this.examples.map((e,i)=>({...e,x:features(e.context),weight:.995**(this.samples-1-i)}));
    const total=prepared.reduce((sum,e)=>sum+e.weight,0);
    if(total) {
      const prior=(prepared.reduce((sum,e)=>sum+e.fold*e.weight,0)+3.6)/(total+8);
      this.weights[0]=Math.log(prior/(1-prior));
      // Full-batch gradients avoid a final handful of responses dominating the fit.
      for(let epoch=0;epoch<160;epoch++) {
        const gradient=Array(this.weights.length).fill(0);
        for(const e of prepared) {
          const error=(e.fold-this.predictRaw(e.x))*e.weight;
          e.x.forEach((x,j)=>gradient[j]+=error*x);
        }
        for(let j=0;j<this.weights.length;j++)this.weights[j]=clamp(this.weights[j]+.8*(gradient[j]/total-.003*(j?this.weights[j]:0)),-8,8);
      }
    }
  }
  predictRaw(x) { return sigmoid(x.reduce((sum,v,i)=>sum+v*this.weights[i],0)); }
  predict(context) {
    if(!validContext(context))return {fold:.45,confidence:0,samples:this.samples,similar:0};
    const similar=this.examples.filter(e=>e.context.street===context.street&&Math.abs(e.context.price-context.price)<.12&&e.context.opponents===context.opponents).length;
    // Familiar situations, not just a large total sample, are required for adaptation.
    const confidence=this.samples<20?0:Math.min(1,this.samples/80)*Math.min(1,similar/12);
    return {fold:clamp(this.predictRaw(features(context)),.03,.97),confidence,samples:this.samples,similar};
  }
}
export function learnBluffPolicy(policy,prediction,riskFraction) {
  if(!prediction || !prediction.confidence)return {...policy};
  const c=Math.min(.65,prediction.confidence);
  const profitable=prediction.fold>riskFraction/(1+riskFraction)+.06;
  const target=profitable?clamp((prediction.fold-.3)*.25,0,.16):0;
  return {...policy,bluff:clamp(policy.bluff*(1-c)+target*c,0,.16)};
}
