/** Compact, client-only receipt history. Rendering never requires all tickets in the DOM. */
export function createReceiptArchive({ rounds, tickets }) {
  const numbers = new Uint8Array(rounds * tickets * 6);
  const ranks = new Uint8Array(rounds * tickets);
  const draws = new Uint8Array(rounds * 7);
  let completed = 0;
  return {
    record(last) {
      if (last.round !== completed + 1 || last.tickets.length !== tickets) throw new Error('Invalid receipt round');
      const start = completed * tickets;
      draws.set([...last.winning, last.bonus], completed * 7);
      last.tickets.forEach((ticket, i) => {
        numbers.set(ticket.numbers, (start + i) * 6);
        ranks[start + i] = ticket.rank;
      });
      completed++;
    },
    snapshot({ releaseUnused = false } = {}) {
      // A stopped run should not transfer and retain buffers reserved for a million games.
      const part = (array, length) => releaseUnused && length < array.length ? array.slice(0, length) : array.subarray(0, length);
      return { rounds: completed, tickets, numbers: part(numbers, completed * tickets * 6), ranks: part(ranks, completed * tickets), draws: part(draws, completed * 7) };
    }
  };
}

/** Each receipt belongs to one draw and holds at most five games. */
export function indexReceipts(archive) {
  const perRound = Math.ceil(archive.tickets / 5);
  const total = archive.rounds * perRound;
  const sheets = new Uint32Array(total);
  let won = 0, lost = 0, bestRank = 6, bestSheet = 0;
  for (let sheet = 0; sheet < total; sheet++) {
    const roundStart = Math.floor(sheet / perRound) * archive.tickets;
    const start = roundStart + (sheet % perRound) * 5;
    const end = Math.min(start + 5, roundStart + archive.tickets);
    let hasWin = false;
    for (let i = start; i < end; i++) {
      const rank = archive.ranks[i];
      if (rank) {
        hasWin = true;
        if (rank < bestRank) { bestRank = rank; bestSheet = sheet; }
      }
    }
    if (hasWin) sheets[won++] = sheet;
    else sheets[total - ++lost] = sheet;
  }
  // The filters partition one buffer; both keep chronological browsing order.
  const losers = sheets.subarray(won).reverse();
  return { total, perRound, bestSheet, winners: sheets.subarray(0, won), losers };
}

export function readReceipt(archive, sheet) {
  const perRound = Math.ceil(archive.tickets / 5);
  if (!Number.isInteger(sheet) || sheet < 0 || sheet >= archive.rounds * perRound) throw new Error('Invalid receipt page');
  const round = Math.floor(sheet / perRound);
  const first = (sheet % perRound) * 5;
  const draw = archive.draws.subarray(round * 7, round * 7 + 7);
  const tickets = [];
  for (let i = first; i < Math.min(first + 5, archive.tickets); i++) {
    const game = round * archive.tickets + i;
    tickets.push({ numbers: Array.from(archive.numbers.subarray(game * 6, game * 6 + 6)), rank: archive.ranks[game], game: game + 1 });
  }
  return { sheet, round: round + 1, winning: Array.from(draw.subarray(0, 6)), bonus: draw[6], tickets };
}
