const ranks = { 2:'two', 3:'three', 4:'four', 5:'five', 6:'six', 7:'seven', 8:'eight', 9:'nine', 10:'ten', 11:'jack', 12:'queen', 13:'king', 14:'ace' };
const plurals = { 2:'twos', 3:'threes', 4:'fours', 5:'fives', 6:'sixes', 7:'sevens', 8:'eights', 9:'nines', 10:'tens', 11:'jacks', 12:'queens', 13:'kings', 14:'aces' };
export function describeHand(v) {
  switch (v[0]) {
    case 0: return `${ranks[v[1]]}-high`;
    case 1: return `a pair of ${plurals[v[1]]}`;
    case 2: return `two pair, ${plurals[v[1]]} and ${plurals[v[2]]}`;
    case 3: return `three ${plurals[v[1]]}`;
    case 4: return `a ${ranks[v[1]]}-high straight`;
    case 5: return `a ${ranks[v[1]]}-high flush`;
    case 6: return `a full house, ${plurals[v[1]]} full of ${plurals[v[2]]}`;
    case 7: return `four ${plurals[v[1]]}`;
    case 8: return v[1] === 14 ? 'a royal flush' : `a ${ranks[v[1]]}-high straight flush`;
    default: return 'an incomplete hand';
  }
}
export function compareHandsText(winner, loser) {
  const winning = describeHand(winner), losing = describeHand(loser);
  if (winning !== losing) return `${winning} beats ${losing}`;
  const different = winner.findIndex((rank, i) => i > 0 && rank !== loser[i]);
  if (different < 0) return `${winning} ties ${losing} — the same best five-card hand`;
  const detail = winner[0] === 5 ? 'next differing card' : 'kicker';
  return `${winning} beats ${losing} — ${ranks[winner[different]]} beats ${ranks[loser[different]]} as the ${detail}`;
}
