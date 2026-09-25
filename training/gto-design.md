# GTO difficulty: bounded approximation

The GTO option is a separate strategy and does not consume learned opponent profiles or the logistic fold model. It is GTO-inspired, not an equilibrium solver, and has no demonstrated exploitability bound or win-rate advantage.

Reference: Michael Acevedo, Modern Poker Theory, supplied PDF. PDF pages 114–116 explain the polar betting toy game; pages 590–604 discuss range construction, checking, and sizing; page 727 warns against treating minimum defense frequency as an unconditional defense rule. The book's six-max 100-BB cash and tournament charts are not directly copied into this four-player, initially 50-BB, no-rake game.

Implemented:
- Position-dependent opening frequencies across 1,326 starting combinations, with a mixed boundary class. Frequencies and hand ranking are approximations.
- Equity sampling against public-action range assumptions; pot-odds defense, without forcing an MDF target.
- Legal bet sizes responding to board texture and stack-to-pot ratio.
- Range-based value and bluff selection, strong checks, draw/blocker preference, and reduced multiway bluff budgets.
- The polar river toy-game bluff:value ratio B/(P+B) supplies a budget. Subsequent equity gates and approximate ranges mean the final policy is not the exact toy-game equilibrium either.

Limits: coarse assumed ranges, no full action-conditioned range propagation, no game-tree solution or equilibrium computation, approximate equity realization on earlier streets, no convergence or exploitability guarantee. GTO-inspired should not be interpreted as stronger than Hard in all matchups.

Verification: deterministic opening/mixing/budget tests, free-check and all-in defenses, independence from exploit profiles, no hidden-card observation, and legal complete-game/chip-conservation tests.

## Humanized bluffing update

Seat personalities make small changes to value-bet frequency and public-state sizing; strong checks remain in every style. A shared sizing distribution is used for value and bluffs. Live draws may semi-bluff up to 65% estimated equity, fixing the former blanket 40% cutoff. Limited draw raises can precede an otherwise losing call/fold decision. Own public betting history informs later-street continuation, with weak unblocked river hands giving up more often. Bluff attempts are currently restricted to heads-up pots with an opponent able to respond. Timing depends on public price/seat and independent randomness, never private hand strength. These are heuristic additions, not solver training or evidence of equilibrium convergence.
