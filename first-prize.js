const format = new Intl.NumberFormat('ko-KR');

/** Use completed games for the headline, and keep draw rounds as separate context. */
export function firstPrizePresentation(result, amount) {
  const hasWin = result.counts[1] > 0;
  return {
    hasWin,
    story: `${amount}, ${format.format(result.games)}게임을 ${hasWin ? '돌린 끝에…' : '돌렸지만…'}`,
    context: `${format.format(result.rounds)}회 추첨 × 회차당 ${format.format(result.config.tickets)}게임 · 전체 게임 합산`,
    reaction: hasWin ? '이걸 해내네요. 1등 당첨!' : '이번엔 1등 운이 없네요…',
    end: hasWin ? '!' : '…'
  };
}

/** One brief effect per result. Presentation randomness never touches the draw PRNG. */
export function createFirstPrizeEffects({ card, canvas, reducedMotion, viewport, requestFrame, cancelFrame }) {
  let frame = null;
  const playedResults = new WeakSet();
  let context = null;

  function cancel() {
    if (frame !== null) cancelFrame(frame);
    frame = null;
    card.classList.remove('impact-miss', 'celebrate-win');
    canvas.hidden = true;
    // Release the full-screen bitmap as soon as the brief celebration ends.
    canvas.width = canvas.height = 1;
    context = null;
  }

  function play(result) {
    cancel();
    if (!result?.games || playedResults.has(result)) return;
    playedResults.add(result);
    if (reducedMotion()) return;
    const hasWin = result.counts[1] > 0;
    card.classList.add(hasWin ? 'celebrate-win' : 'impact-miss');
    context = canvas.getContext('2d');
    if (!context) return;
    const { width, height, pixelRatio = 1 } = viewport();
    const scale = Math.min(pixelRatio, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    canvas.hidden = false;
    const sourceY = Math.min(height * .74, Math.max(height * .35, card.getBoundingClientRect().bottom));
    const colors = hasWin ? ['#ffd326', '#f57931', '#ec5562', '#4288e7', '#42a678'] : ['#7c8fa9', '#a3b2c7', '#c7d1dd'];
    const count = hasWin ? (width < 680 ? 96 : 160) : (width < 680 ? 54 : 84);
    const pieces = Array.from({ length: count }, (_, i) => {
      const left = i % 2 === 0;
      return {
        x: hasWin ? width * (left ? .06 : .94) : Math.random() * width,
        y: hasWin ? sourceY : -30 - Math.random() * height * .25,
        vx: hasWin ? (left ? 1 : -1) * (100 + Math.random() * Math.min(width * .65, 580)) : (Math.random() - .5) * 42,
        vy: hasWin ? -(300 + Math.random() * 560) : 75 + Math.random() * 95,
        size: hasWin ? 5 + Math.random() * 5 : 9 + Math.random() * 7,
        spin: (Math.random() - .5) * (hasWin ? 12 : 2),
        angle: Math.random() * Math.PI,
        delay: hasWin ? (i % 3) * .08 : .32 + Math.random() * .4,
        color: colors[i % colors.length]
      };
    });
    let started = null;
    function draw(timestamp) {
      frame = null;
      if (started === null) started = timestamp;
      const elapsed = (timestamp - started) / 1000;
      if (elapsed >= 3.2) { cancel(); return; }
      context.clearRect(0, 0, width, height);
      context.globalAlpha = Math.max(0, Math.min(hasWin ? 1 : .55, (3.2 - elapsed) / .65));
      for (const piece of pieces) {
        const age = elapsed - piece.delay;
        if (age < 0) continue;
        const x = piece.x + piece.vx * age;
        const y = piece.y + piece.vy * age + (hasWin ? 460 : 95) * age * age;
        if (y > height + 30 || x < -30 || x > width + 30) continue;
        context.save();
        context.translate(x, y);
        context.rotate(piece.angle + piece.spin * age);
        context.fillStyle = piece.color;
        if (hasWin) context.fillRect(-piece.size / 2, -piece.size / 3, piece.size, piece.size * .65);
        else {
          // Quiet falling receipt scraps, in contrast to the upward prize cannons.
          context.fillRect(-piece.size / 2, -piece.size * .7, piece.size, piece.size * 1.4);
          context.fillStyle = '#edf1f6';
          for (const row of [-.35, 0, .35]) context.fillRect(-piece.size * .3, piece.size * row, piece.size * .6, 1);
        }
        context.restore();
      }
      frame = requestFrame(draw);
    }
    frame = requestFrame(draw);
  }

  return { play, cancel };
}
