// Structured awards keep split pots and uncalled-chip returns out of win effects.
export function celebrationEvent(before, after) {
  if (!before || before.hand !== after.hand) return null;
  if (after.done && !before.done) {
    const winners = (after.awards || []).filter(a => a.profit > 0);
    if (!winners.length) return null;
    return { kind: winners.some(a => a.allIn) ? 'all-in-win' : 'win',
      title: winners.some(a => a.allIn) ? 'ALL-IN VICTORY' : 'POT WON',
      detail: winners.map(a => `${after.players[a.seat].name} +${a.profit.toLocaleString()} chips`).join(' · ') };
  }
  const pushed = after.players.filter((p, i) => p.allIn && !before.players[i].allIn);
  return pushed.length ? { kind: 'all-in', title: 'ALL IN', detail: pushed.map(p => p.name).join(' · ') } : null;
}
let dismissTimer;
export function celebrateTable(before, after) {
  const arena = document.querySelector('.arena');
  if (!arena) return;
  if (!before || before.hand !== after.hand) {
    clearTimeout(dismissTimer);
    arena.querySelector('.table-celebration')?.remove();
  }
  const event = celebrationEvent(before, after);
  if (!event) return;
  clearTimeout(dismissTimer);
  arena.querySelector('.table-celebration')?.remove();
  const banner = document.createElement('div');
  banner.className = `table-celebration ${event.kind}`;
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  const title = document.createElement('strong'); title.textContent = event.title;
  const detail = document.createElement('span'); detail.textContent = event.detail;
  banner.append(title, detail);
  if (event.kind === 'all-in-win' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 24; i++) {
      const piece = document.createElement('i');
      piece.setAttribute('aria-hidden', 'true');
      piece.style.setProperty('--x', `${(i / 23) * 100}%`);
      piece.style.setProperty('--drift', `${(i % 2 ? 1 : -1) * (30 + i * 3)}px`);
      piece.style.setProperty('--delay', `${(i % 6) * 65}ms`);
      banner.append(piece);
    }
  }
  arena.append(banner);
  dismissTimer = setTimeout(() => banner.remove(), event.kind === 'all-in-win' ? 4500 : 2800);
}
