import { createExperiment } from './core.js';

let experiment = null, cancelled = false;

self.onmessage = ({ data }) => {
  if (data.type === 'stop') { cancelled = true; return; }
  if (data.type !== 'start') return;
  try {
    experiment = createExperiment(data.config);
    cancelled = false;
    run();
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
};

function run() {
  try {
    const start = performance.now();
    let complete = false;
    do {
      complete = experiment.step(1);
    } while (!complete && !cancelled && performance.now() - start < 18);
    const result = experiment.snapshot();
    self.postMessage({ type: cancelled ? 'stopped' : complete ? 'done' : 'progress', result });
    if (!complete && !cancelled) setTimeout(run, 0);
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
}
