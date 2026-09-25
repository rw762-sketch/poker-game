export const DRINKS = Object.freeze({
  coffee: { label:'Coffee', icon:'☕' },
  tea: { label:'Tea', icon:'🍵' },
  lemonade: { label:'Lemonade', icon:'🍋' },
  mocktail: { label:'Mocktail', icon:'🍹' },
});
export function validGift(gift) {
  return gift && Number.isInteger(gift.from) && gift.from >= 0 && gift.from < 4 &&
    Number.isInteger(gift.to) && gift.to >= 0 && gift.to < 4 && gift.from !== gift.to &&
    typeof gift.drink === 'string' && Object.hasOwn(DRINKS, gift.drink);
}
// Cosmetics never mutate the poker state, action version, chips, or turn clock.
export class TableGifts {
  constructor() { this.last = new Map(); }
  create(from, to, drink, members, now = Date.now()) {
    const gift = { from, to, drink };
    if (!validGift(gift) || !members[from]?.online || !members[to]?.online) throw Error('Choose a connected player and a drink.');
    if (now - (this.last.get(from) ?? -Infinity) < 4000) throw Error('Give the server a moment — one drink every 4 seconds.');
    this.last.set(from, now);
    return gift;
  }
}
