/** A tab-local, constant-size record. Never store tickets or count a shared replay as a purchase. */
const STORAGE_KEY = 'lottolab-billion-v1';
export const BILLION_GAMES = 1_000_000;
const signature = result => [result.config.seed, result.config.mode, result.config.tickets, result.rounds, ...result.config.fixed].join(':');
const summary = record => record ? { attempts: record.attempts, spent: record.spent, hit: record.hit } : null;

function validRecord(record) {
  return record?.version === 1 && Number.isSafeInteger(record.attempts) && record.attempts > 0 && record.attempts <= 1_000_000
    && Number.isSafeInteger(record.spent) && record.spent >= record.attempts * 1000 && record.spent <= record.attempts * 1_000_000_000
    && record.spent % 1000 === 0 && typeof record.hit === 'boolean' && typeof record.key === 'string' && record.key.length < 160;
}

export function createBillionJourney(storage) {
  let record = null;
  try {
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) ?? 'null');
    if (validRecord(saved)) record = saved;
  } catch { /* Private browsing or unavailable storage: keep this tab's in-memory record. */ }
  return {
    status: () => summary(record),
    reset() {
      record = null;
      try { storage?.removeItem(STORAGE_KEY); } catch { /* In-memory reset still works. */ }
    },
    record(result, { replay = false, friend = false } = {}) {
      if (friend || !result.games) return null;
      const key = signature(result);
      if (record?.key === key) {
        // The current, reproduced first-prize count owns the celebration, even if storage was edited.
        return { ...summary(record), hit: result.counts[1] > 0 };
      }
      if (replay || result.config.rounds * result.config.tickets !== BILLION_GAMES) return null;
      const previous = record?.hit || record?.attempts === 1_000_000 ? null : record;
      record = {
        version: 1, key, attempts: (previous?.attempts ?? 0) + 1,
        spent: (previous?.spent ?? 0) + result.games * 1000, hit: result.counts[1] > 0
      };
      try { storage?.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* Continue without persistence. */ }
      return summary(record);
    }
  };
}
