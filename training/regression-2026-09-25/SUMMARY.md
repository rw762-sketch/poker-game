# Final audit results

Final corrected audit: **35,939 completed hands plus 8,000 targeted decisions**. Preliminary pre-correction runs are excluded from these counts.

## Correctness

- 5,939 stress hands across 600 uneven-stack tables; 57,583 actions. No illegal actions, free-check folds, negative stacks, duplicate dealt cards, nontermination, or chip-conservation failures.
- 24,000 paired-comparison hands also passed action and chip invariants.
- 8,000 constructed decisions passed legal-action and mixed-frequency checks. No prohibited bluff attempts in tested multiway, all-in, and board-tie cases.
- 56 automated tests pass, including the seed-correlation regression test.

## Learning

- 6,000 hands; 38,088 predicted responses, always before the current hand enters training.
- Brier prediction error: 0.187809 versus 0.191064 for the smoothed baseline (1.70% lower).
- Mean session error difference: -0.003257; session-cluster 95% interval [-0.0037206100134968513, -0.002793441446023638]. Lower error in all ten independent sessions.
- Models kept only the most recent 120 hands and were checked across mid-session behavior changes. Save/reload predictions matched.

## Recent bluff-policy comparison

- Latest weighted bluff selection versus immediately preceding revision: 12,000 matched deals.
- Overall paired change: +0.00697 big blinds per hand; approximate 95% interval [-0.00384, +0.01777].
- This is inconclusive about a win-rate improvement when the interval includes zero; it is not proof of GTO or performance against humans.

| Opponent | Current BB/hand | Previous BB/hand | Paired change | 95% interval |
|---|---:|---:|---:|---|
| caller | 2.9229 | 2.9229 | +0.0000 | [+0.0000, +0.0000] |
| folder | 0.8402 | 0.8143 | +0.0259 | [+0.0003, +0.0515] |
| selective | 0.8651 | 0.8548 | +0.0103 | [-0.0270, +0.0475] |
| pressure | 1.4760 | 1.4760 | +0.0000 | [+0.0000, +0.0000] |
| min-raise | 3.0165 | 3.0165 | +0.0000 | [+0.0000, +0.0000] |
| medium | 0.2883 | 0.2827 | +0.0056 | [-0.0409, +0.0521] |

Per-style intervals are descriptive and not corrected for multiple comparisons. Synthetic opponents, fixed fresh stacks, and approximate ranges limit generalization.

## What changed

Added reproducible sampling scripts, reports, and a test-harness seed correction. **The live AI policy and website were not changed by this audit.** No synthetic player profiles were copied into user browser history. Evaluation trains temporary opponent models to test the existing learning implementation; it does not deploy new global weights.

Further samples are appropriate after a decision-policy change or when measuring rarer scenarios/new opponents; repeating the same audit indefinitely would not establish equilibrium play.
