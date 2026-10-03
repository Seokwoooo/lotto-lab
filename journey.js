/** One page visit only. Never persist the record or count a shared replay as a purchase. */
const STORAGE_KEY = 'lottolab-billion-v1';
export const BILLION_GAMES = 1_000_000;
const signature = result => [result.config.seed, result.config.mode, result.config.tickets, result.rounds, ...result.config.fixed].join(':');
const summary = record => record ? { attempts: record.attempts, spent: record.spent, hit: record.hit } : null;

export function createBillionJourney(legacyStorage) {
  let record = null;
  // Remove the previous release's saved record; never load or write browser storage.
  try { legacyStorage?.removeItem(STORAGE_KEY); } catch { /* Storage may be blocked. */ }
  return {
    status: () => summary(record),
    reset() {
      record = null;
    },
    record(result, { replay = false, friend = false } = {}) {
      if (friend || !result.games) return null;
      const key = signature(result);
      if (record?.key === key) {
        // Reopening a result in this page must not count it as another purchase.
        return { ...summary(record), hit: result.counts[1] > 0 };
      }
      if (replay || result.config.rounds * result.config.tickets !== BILLION_GAMES) return null;
      const previous = record?.hit || record?.attempts === 1_000_000 ? null : record;
      record = {
        version: 1, key, attempts: (previous?.attempts ?? 0) + 1,
        spent: (previous?.spent ?? 0) + result.games * 1000, hit: result.counts[1] > 0
      };
      return summary(record);
    }
  };
}
