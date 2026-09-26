// Avalanche adjacent scenario IDs before feeding the reproducible LCG.
// Without this, the LCG's first draws for neighboring seeds are correlated.
export function sampleSeed(value) {
 let x=value>>>0;x=Math.imul(x^(x>>>16),0x85ebca6b);x=Math.imul(x^(x>>>13),0xc2b2ae35);return (x^(x>>>16))>>>0;
}
