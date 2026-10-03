import { createExperiment, validateConfig } from './core.js?v=11';
import { createReceiptArchive, indexReceipts } from './receipts.js?v=15';

let experiment = null, archive = null, cancelled = false, lastReport = -Infinity;

self.onmessage = ({ data }) => {
  if (data.type === 'stop') { cancelled = true; return; }
  if (data.type !== 'start') return;
  try {
    const config = validateConfig(data.config);
    archive = createReceiptArchive(config);
    experiment = createExperiment(config, { onRound: last => archive.record(last) });
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
      // Progress stays small. The full history moves once, without copying its buffers.
      if (!finished) result.last = null;
      if (finished) {
        result.receipts = archive.snapshot({ releaseUnused: true });
        result.receiptIndex = indexReceipts(result.receipts);
      }
      const transfer = finished ? [...new Set([result.receipts.numbers.buffer, result.receipts.ranks.buffer, result.receipts.draws.buffer, result.receiptIndex.winners.buffer, result.receiptIndex.losers.buffer])] : [];
      self.postMessage({ type: cancelled ? 'stopped' : complete ? 'done' : 'progress', result }, transfer);
      lastReport = now;
    }
    if (!finished) setTimeout(run, 0);
    else { experiment = null; archive = null; }
  } catch (error) {
    self.postMessage({ type: 'error', message: error.message });
  }
}
