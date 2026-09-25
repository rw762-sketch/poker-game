# River Room

[Play online](https://rw762-sketch.github.io/poker-game/)

A Texas Hold’em browser game with solo play against three computer opponents and online rooms for 2–4 friends. Includes rotating blinds, betting rounds, all-ins, side pots, ties, and best-five-of-seven hand evaluation. Play chips only. State lasts for the current page session.

Run locally with `python3 -m http.server 4173`, then open http://localhost:4173.

The computer strategy is intentionally simple and is not a poker training engine.

Validation: 300 randomized tables (up to 15 hands each) checked for chip conservation and termination; targeted hand-ranking and side-pot tests. Browser visual testing was not requested. WebMCP registration is feature-detected; no supported browser validation context was available.

## Online multiplayer

Use **Play with friends** to create or join an 8-character room. Share the invite link, wait for 2–4 players, and let the host deal. Solo play remains available.

The host browser runs the authoritative poker engine. Guests send actions; the host validates turns, bet sizes, and state versions, then sends each guest a filtered view containing only their own hole cards until showdown. This is casual play among trusted friends: a technically capable host can inspect the full deck and hole cards in their own browser. There is no independent game server or anti-cheat guarantee.

The host must stay connected with the tab open. Closing or refreshing the host tab ends the room. A returning guest can reclaim their seat in the same tab using the room code and a session-only random token. New players join before the first hand. Turns time out after 45 seconds; a disconnected player gets 15 seconds to reconnect before their turn can be skipped. Timeouts check when free, otherwise fold. The host's browser must be awake for timers to run.

The networking library is **PeerJS 1.5.5**, vendored under `vendor/` with its MIT license. It was obtained from the official npm package, not a poker template. The game, lobby, privacy filtering, and action protocol are project code. PeerJS Cloud provides signaling; game messages travel over WebRTC. Some networks require a TURN relay and may not connect with this setup. There is no paid hosting or account setup.

References: https://peerjs.com/client/getting-started and https://peerjs.com/client/faq

Validation: `node --test tests/multiplayer.test.mjs` covers 2–4 seats, private-card filtering, host authority, invalid/out-of-turn/replayed actions, room capacity, reconnects, timeouts, showdown privacy, chip conservation, and an asynchronous four-client transport simulation. Actual separate-device/cross-network WebRTC behavior is not covered by those simulations.
