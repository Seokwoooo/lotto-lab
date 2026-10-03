/** The next quick experiment follows completed games, including stopped and shared runs. */
export function nextBudgetStep(completedGames) {
  if (!Number.isSafeInteger(completedGames) || completedGames < 1) throw new Error('Invalid completed game count');
  const games = completedGames < 10_000 ? 10_000 : 100_000;
  return { games, rounds: games / 1000, tickets: 1000, amount: games === 10_000 ? '1천만원' : '1억원', repeat: completedGames >= 100_000 };
}
