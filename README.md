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

The latest run earned **2.427 big blinds per hand** against that synthetic opponent mix, versus **1.048** for the old policy. The paired improvement was **1.379 BB/hand**, with an approximate 95% interval of **0.505–2.252**. These benchmark results do not establish performance against human players. See `training/report.json` for the full report and `training/sample-games.json` for 12 complete example action traces.

Run `node --test tests/*.test.mjs`: 21 checks cover hidden-card isolation, legal actions, chip conservation, range effects, input validation, pot-odds math, and a fast evaluator compared with exhaustive best-five evaluation on 5,000 hands, plus multiplayer regressions.

Strategy references (read and implemented as project-specific heuristics):
- [PokerStars Learn: Pot odds](https://www.pokerstars.com/poker/learn/lesson/pot-odds/)
- [Starting hands and position](https://www.pokerstars.com/poker/learn/lesson/poker-starting-hands/)
- [Thinking about hand ranges](https://www.pokerstars.com/poker/learn/strategies/how-to-think-about-hand-ranges-in-poker/)
- [Stack-to-pot ratio](https://www.pokerstars.com/poker/learn/lesson/introduction-to-stack-to-pot-ratio-spr/)
