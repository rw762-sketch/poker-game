import { simulateEquity, seededRandom } from './poker-math.js?v=fc2f7b054864';
import { analyzeDecision } from './strategy.js?v=fc2f7b054864';
self.onmessage = ({ data }) => {
  try {
    // Random seed is generated once per requested calculation, not from live game state.
    const simulation = simulateEquity(data.input, data.trials, seededRandom(data.seed));
    const advice = analyzeDecision(data.input, simulation);
    self.postMessage({ simulation, advice });
  } catch (error) { self.postMessage({ error:error.message }); }
};
