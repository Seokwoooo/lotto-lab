import { createExperiment } from './core.js?v=6';

let experiment = null, cancelled = false, lastReport = -Infinity;

self.onmessage = ({ data }) => {
  if (data.type === 'stop') { cancelled = true; return; }
  if (data.type !== 'start') return;
  try {
    experiment = createExperiment(data.config);
    cancelled = false;
    lastReport = -Infinity;
    run();
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};

function run() {
  try {
    const start = performance.now();
    let complete = false;
    if (!cancelled) {
      do {
        complete = experiment.step(1);
      } while (!complete && performance.now() - start < 12);
    }
    const finished = cancelled || complete;
    const now = performance.now();
    if (finished || now - lastReport >= 100) {
      const result = experiment.snapshot();
      // Only the final message needs receipt arrays. Progress stays small.
      if (!finished) result.last = null;
      self.postMessage({ type: cancelled ? 'stopped' : complete ? 'done' : 'progress', result });
      lastReport = now;
    }
    if (!finished) setTimeout(run, 0);
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
}
