# River Room

A Texas Hold’em browser game with solo play against three computer opponents and online rooms for 2–4 friends. Includes rotating blinds, betting rounds, all-ins, side pots, ties, and best-five-of-seven hand evaluation. Play chips only. State lasts for the current page session.

Run locally with `python3 -m http.server 4173`, then open http://localhost:4173.

The computer opponents use position, public betting, hand-range estimates, and simulated equity. Hard is tuned on generated sample games; it is not a GTO solver.

Validation: 300 randomized tables (up to 15 hands each) checked for chip conservation and termination; targeted hand-ranking and side-pot tests. Browser visual testing was not requested. WebMCP registration is feature-detected; no supported browser validation context was available.

## GitHub Pages

Published repository: https://github.com/rw762-sketch/poker-game

Game URL: https://rw762-sketch.github.io/poker-game/

GitHub `main` contains the contents of local `dist/` at its root, plus a public README and `.nojekyll`. Pages deploys from `main` / root. The local `github` remote identifies this publication repository; its history is separate from this local source repository. Publish subsequent changes by updating the corresponding root files on GitHub. Do not force-push the local source branch over it.

## Online multiplayer

Use **Play with friends** to create or join an 8-character room. Share the invite link, wait for 2–4 players, and let the host deal. Solo play remains available.

The host browser runs the authoritative poker engine. Guests send actions; the host validates turns, bet sizes, and state versions, then sends each guest a filtered view containing only their own hole cards until showdown. This is casual play among trusted friends: a technically capable host can inspect the full deck and hole cards in their own browser. There is no independent game server or anti-cheat guarantee.

The host must stay connected with the tab open. Closing or refreshing the host tab ends the room. A returning guest can reclaim their seat in the same tab using the room code and a session-only random token. New players join before the first hand. Turns time out after 45 seconds; a disconnected player gets 15 seconds to reconnect before their turn can be skipped. Timeouts check when free, otherwise fold. The host's browser must be awake for timers to run.

The networking library is **PeerJS 1.5.5**, vendored under `dist/vendor/` with its MIT license. It was obtained from the official npm package, not a poker template. The game, lobby, privacy filtering, and action protocol are project code. PeerJS Cloud provides signaling; game messages travel over WebRTC. Some networks require a TURN relay and may not connect with this setup. There is no paid hosting or account setup.

References: https://peerjs.com/client/getting-started and https://peerjs.com/client/faq

Validation: `node --test tests/multiplayer.test.mjs` covers 2–4 seats, private-card filtering, host authority, invalid/out-of-turn/replayed actions, room capacity, reconnects, timeouts, showdown privacy, chip conservation, and an asynchronous four-client transport simulation. Actual separate-device/cross-network WebRTC behavior is not covered by those simulations.

## AI difficulty and asset versions

Solo play offers Easy, Medium, and Hard above the table. The preference is saved locally and applies on the next hand. Easy uses a loose, passive heuristic. Medium uses 100 equity samples and Hard uses 360 when evaluating contested pots, using only the bot's own cards and public information. Both use positional opening ranges and board-aware bet sizing. Hard uses the saved parameters in trained-policy.js.

Before publishing, run `python3 scripts/version-assets.py`. It gives the HTML stylesheet and JavaScript module graph one content-derived cache version, preventing a newly added button from loading with an older cached event-handler script.

Tests: `node --test tests/ai.test.mjs tests/multiplayer.test.mjs`.

Browser verification: two Chrome tabs created/joined a real PeerJS room, received different private hands, synchronized a call, and completed a hand by folding. This checks live signaling and data channels on this machine, not all separate-device network combinations.

## Poker Lab calculator

Open **Poker calculator** from the game or visit [Poker Lab](https://rw762-sketch.github.io/poker-game/calculator.html). It runs separately so a live room stays open. Enter your cards, community cards, 1–5 opponents, position, an estimated opponent range, pot, call amount, and stack. It reports outright win/tie/loss probabilities, pot equity, sampling uncertainty, pot odds, showdown-only call EV, and a suggested action and bet size. Optional exact opponent cards support heads-up analysis.

Simulation runs in a Web Worker and can be canceled. Duplicate cards and inconsistent inputs are rejected. Position affects strategy advice, not the mathematical equity of a fixed hand against a fixed range. Range presets are project-defined starting-hand filters, not copied professional charts. Recommendations are heuristics, not solved optimal plays; future betting, fold equity, rake, side pots, and exact opponent behavior are excluded.

## Reproducible sample-game training

Run `node scripts/train-ai.mjs` from the repository root. The script searches seven strategy parameters across **5,760 complete simulated games**, then freezes the result and compares it with the previous Hard policy on **1,600 separate held-out deals per policy**. Opponents mix calling, old-policy, and positional strategies. This is parameter tuning on synthetic games, not neural-network training or human hand-history learning.

The original sample-game policy run (before the later adaptive-memory layer) earned **2.427 big blinds per hand** against that synthetic opponent mix, versus **1.048** for the old policy. The paired improvement was **1.379 BB/hand**, with an approximate 95% interval of **0.505–2.252**. These benchmark results do not establish performance against human players. See `training/report.json` for the full report and `training/sample-games.json` for 12 complete example action traces.

Run `node --test tests/*.test.mjs`: 21 checks cover hidden-card isolation, legal actions, chip conservation, range effects, input validation, pot-odds math, and a fast evaluator compared with exhaustive best-five evaluation on 5,000 hands, plus multiplayer regressions.

Strategy references (read and implemented as project-specific heuristics):
- [PokerStars Learn: Pot odds](https://www.pokerstars.com/poker/learn/lesson/pot-odds/)
- [Starting hands and position](https://www.pokerstars.com/poker/learn/lesson/poker-starting-hands/)
- [Thinking about hand ranges](https://www.pokerstars.com/poker/learn/strategies/how-to-think-about-hand-ranges-in-poker/)
- [Stack-to-pot ratio](https://www.pokerstars.com/poker/learn/lesson/introduction-to-stack-to-pot-ratio-spr/)

## Relay setup and connection errors

The bundled PeerJS 1.5.5 default TURN hostnames did not resolve during the September 24 connection investigation. The game now overrides those defaults with an explicit STUN configuration. This supports direct connections, but **does not solve restrictive NAT/firewall connections by itself**. Two tabs on one computer successfully joined the live room; that is not a cross-network test.

`network-config.js` exposes `TURN_CREDENTIALS_URL` for a deployed HTTPS endpoint returning a JSON array of short-lived `RTCIceServer` objects. Configure an active TURN service, including TCP/TLS on port 443 where supported, expose its temporary credentials through that endpoint with CORS for this site's origin, and set the URL before publishing. Keep the provider's account/API secret on the endpoint's server, never in this public repository. Both host and guests must reload and create a new room after configuration changes. Browser requests use `no-store`; invalid or unavailable relay configuration fails explicitly.

Until a working relay is configured, try both devices on the same Wi-Fi or another network, keep the host tab open, and use a newly created room. No guaranteed cross-network support is claimed. A missing room now rejects promptly with the room-not-found message instead of being replaced by a generic timeout.


## Adaptive player strategy

Medium and Hard now learn from public actions across completed solo hands. A rolling browser-local history retains at most 120 hands. Each record contains seat, betting round, action, chips committed, whether a bet was faced, and raise size relative to the pot; it contains no hole cards or deck information. Records survive refreshes and new solo tables. The player at seat zero represents the person using this browser, not an authenticated identity. Multiplayer behavior is not recorded.

The model estimates voluntary preflop participation, preflop raises, folds when facing bets, postflop aggression, and sizing. Estimates use neutral prior counts, at least eight completed hands before adapting, sample-dependent confidence, and a 0.985 per-hand decay. Hard responds fully; Medium uses half-strength adjustments. Easy remains simple. Frequent callers invite larger value bets and fewer bluffs; frequent folders invite selective bluffs and wider late-position opens. Aggressive and selective players change the opponent ranges used by equity simulations. Multiple streets of aggression narrow an otherwise loose range. Jules is a little more cautious, Morgan sizes more aggressively, and Alex keeps the baseline policy.

This is an online statistical opponent model with bounded strategy rules, not a language model, neural retraining, or a claim of optimal play. The earlier training benchmark does not establish the strength of this new adaptive layer. The AI player read disclosure shows a coarse read and offers **Reset player memory**; resetting discards the current partial hand and starts recording with the next hand. Browser storage failure falls back to memory for the current page.

Validation: 31 tests, including divergent choices for the same hand against caller/folder histories, recent behavior overriding old habits, persistence and history bounds, hidden-card isolation, and 100 full adaptive-bot hands with legal moves and conserved chips.

## AI Arena

`arena.html` is a separate spectator page running four Hard bots through the same engine and strategy as solo play. Play/Pause, Next move, Next hand, and speed controls let you watch or step through decisions. Each timeline entry stores the actual decision-time inputs, equity sample result (when sampled), adapted parameters, and the matching policy rule. Preflop rule decisions are explicitly labeled rather than showing a fabricated equity estimate.

Spectators can reveal cards; bots still receive only their own cards and public information. The chip chart records stacks after completed hands, and the reads table shows the arena's learned tendencies. Learning remains in the arena tab, separate from local solo-player memory. New match preserves arena learning; Reset arena clears it. The timeline retains the latest 100 moves. Backgrounding the page pauses autoplay.

Validation now includes 33 tests, with arena chip conservation, bounded history, reset/new-match behavior, and identical seeded actions with or without the explanatory snapshot.

## Defending against bets

The defense correction removes the absolute six-big-blind preflop fold shortcut and replaces the large fixed equity cushion with a price-scaled margin capped at three percentage points. River decisions and all-in calls do not receive a future-betting discount. Cheap calls into limped pots use equity rather than the unopened-pot opening cutoff. Merely matching a large bet no longer assigns a caller the raiser's tight range.

`node scripts/check-fold-rates.mjs` runs 300 seeded hands each against a minimum-raise, half-pot, and calling opponent. The before/after behavioral audit is saved in `training/defense-check.json`. Against the half-pot opponent, folds per faced bet fell from 47.6% to 42.3%; this demonstrates changed behavior, not a higher win rate. The full suite now contains 38 tests including cheap-call, river, all-in, range-inference, and weak-hand folding regressions.
