// Presentation waits independently of the Worker. A fast calculation must not
// cut the draw short, and skipping must never invent or discard a real result.
export function playDrawReveal({ ready, update, reducedMotion = false }) {
  let fast = false, cancelled = false, timer = null, resume = null, releaseCancel;
  const cancellation = new Promise(resolve => { releaseCancel = resolve; });
  const data = Promise.resolve(ready).then(result => ({ result }), error => ({ error }));
  function release() {
    clearTimeout(timer); timer = null;
    const resolve = resume; resume = null; resolve?.();
  }
  function pause(milliseconds) {
    if (fast || cancelled) return Promise.resolve();
    return new Promise(resolve => { resume = resolve; timer = setTimeout(release, milliseconds); });
  }
  const finished = (async () => {
    try {
      for (const value of [3, 2, 1]) {
        if (fast || cancelled) break;
        update({ phase: 'countdown', value });
        await pause(reducedMotion ? 200 : 400);
      }
      if (cancelled) return null;
      if (!fast) update({ phase: 'mixing' });
      const outcome = await Promise.race([data, cancellation]);
      if (cancelled) return null;
      if (outcome.error) throw outcome.error;
      const result = outcome.result;
      const numbers = result.last ? [...(result.last.drawOrder ?? [...result.last.winning, result.last.bonus])] : [];
      for (let index = 0; index < numbers.length; index++) {
        if (fast || cancelled) break;
        const bonus = index === 6;
        if (bonus) update({ phase: 'bonus' });
        await pause(reducedMotion ? 150 : bonus ? 900 : index === 0 ? 350 : 160);
        if (fast || cancelled) break;
        update({ phase: 'number', number: numbers[index], index, bonus });
        await pause(reducedMotion ? 220 : 430);
      }
      if (cancelled) return null;
      if (fast) update({ phase: 'all', numbers });
      update({ phase: 'complete' });
      await pause(reducedMotion ? 250 : 450);
      return cancelled ? null : result;
    } finally { release(); }
  })();
  return {
    finished,
    skip() { fast = true; release(); },
    cancel() { cancelled = true; release(); releaseCancel({ result: null }); }
  };
}
