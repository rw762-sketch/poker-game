# Learned opponent ranges

The new GTO-inspired policy replaces coarse range labels with weighted legal two-card combinations whenever public action history is available. An action-likelihood model is trained on 30,000 complete synthetic hands with six playing styles. Runtime Bayesian-style updates use only the observer's cards, public board and observed opponent actions. Exact opponent cards are never read during inference. The posterior retains a 10% uniform component and tempers repeated evidence to limit overconfidence.

The generated `range-model-data.js` contains smoothed action counts, not hand histories. It is loaded by the browser and therefore actually changes GTO decisions; this is distinct from the earlier test-only audit. No detailed model explanations are added to the player UI.

## Evaluation boundaries

- Training: seeds 6,600,000–6,629,999 (30,000 complete hands), avalanche-mixed before the seeded RNG.
- Final held-out prediction evaluation: seeds 8,800,000–8,809,999, with one scored prediction on a scheduled street for each eligible sampled hand. Covers flop, turn and river. Hidden cards are used only by the offline scoring harness, not as inputs to inference.
- The coarse baseline includes a 10% uniform floor rather than assigning impossible zero probabilities to off-range hands.
- The earlier `holdout-flop-only.json` was a coverage check; `holdout.json` is the final street-balanced evaluation. Training/model parameters were not changed based on either result.
- Gameplay: 3,000 paired deals / 6,000 complete hands, new GTO versus the prior published revision, six synthetic opponent styles and production rollout counts. This evaluation is separate from the training generator.
- A caching optimization reuses each candidate's features within the same street. An exact-output comparison verified unchanged posterior weights before rerunning the automated suite.

Synthetic calibration improvements are not proof of stronger play against humans, exact card prediction, or equilibrium/GTO optimality. The product remains GTO-inspired.

## Reproduce

```sh
node scripts/train-ranges.mjs
node scripts/evaluate-ranges.mjs
mkdir -p /tmp/ryan-poker-range-baseline
git archive eb8b05d dist | tar -x -C /tmp/ryan-poker-range-baseline
node scripts/evaluate-range-play.mjs paired /tmp/ryan-poker-range-baseline/dist
node --test tests/*.test.mjs
```
