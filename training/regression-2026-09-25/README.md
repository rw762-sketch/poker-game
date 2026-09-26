# Large-sample decision and learning regression audit

Candidate: local `4827998` / published `c14cfd12cb31a6ae0bd20ac65a44a66c92ddd9d5`.
Comparison: local `15ffc56`, immediately before the weighted bluff-selection change.

The sample sizes were fixed before inspecting results. No policy tuning uses these evaluation seeds.

- **Paired decisions/results:** 12,000 independent seeded deal pairs (24,000 complete hands), 2,000 pairs against each of six scripted opponent styles. Hero and dealer positions rotate; each actor has a separate RNG. Both versions use production simulation counts. Paired net chips are reported in big blinds per hand with approximate 95% intervals. Per-style intervals are descriptive, not adjusted multiple hypothesis tests. These games compare recent bluff changes, not GTO exploitability or human win rate.
- **Online learning:** 10 independent 600-hand sessions. Models predict before the current hand is recorded, train from completed hands only, and retain the production 120-hand window. Opponent styles switch after 300 hands. Scores use a confidence-blended prediction diagnostic against a smoothed constant baseline. Live action selection blends bluff frequencies instead, so prediction gains are not poker-profit gains. Interval calculations cluster by independent session.
- **Stress:** 600 tables, up to 10 hands each, all four difficulties, 2–4 occupied seats, uneven and short stacks, and repeated hands. Every action verifies legal moves, nonnegative integer stacks, chip conservation, unique dealt cards, and termination. Tests also prohibit folding a free check.

## Reproduce locally

Export the comparison revision to a separate directory:

```sh
mkdir -p /tmp/ryan-poker-regression-baseline
git archive 15ffc56 dist | tar -x -C /tmp/ryan-poker-regression-baseline
node scripts/regression-samples.mjs paired /tmp/ryan-poker-regression-baseline/dist
node scripts/regression-samples.mjs stress
node scripts/learning-regression.mjs
node --test tests/*.test.mjs
```

Generated results: `paired.json`, `learning.json`, `stress.json` and `SUMMARY.md`. These are developer audit artifacts; no strategy details are added to the player UI and no synthetic player history is installed in anyone's browser.

## Sampling correction

The first targeted frequency check exposed correlated first LCG draws from adjacent integer seeds. `sample-seed.mjs` now applies a 32-bit avalanche hash to scenario identifiers before creating random streams. The paired-result and online-learning runs were repeated without changing the AI. Superseded unmixed-seed outputs are retained under `preliminary/` for traceability and are not used for final statistical conclusions. The stress run checks invariants rather than estimating probabilities and does not require independent first draws.

## Targeted decision sampling

`node scripts/bluff-regression.mjs` runs 1,000 decisions for each of eight constructed draw/river/value/all-in/multiway cases (8,000 decisions at the production 600 equity rollouts). It checks legal action bounds, free-check safety, absence of bluff attempts where excluded by policy, and observed versus expected mixed-action frequencies. A five-standard-error residual is a conservative harness sanity threshold, not evidence of equilibrium play.
