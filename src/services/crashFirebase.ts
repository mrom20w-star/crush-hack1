export const FIREBASE_RTDB_URL = 'https://mrwan-dd795-default-rtdb.firebaseio.com';

export type CrashPhase = 'waiting' | 'flight' | 'crashed';

export interface CrashCurrentData {
  roundNumber: number;
  phase: CrashPhase;
  crashPoint: number;
  roundStartedAt?: number;
  flightStartedAt?: number;
  updatedAt?: number;
}

export interface CrashHistoryItem {
  roundNumber: number;
  crashPoint: number;
  crashedAt?: number;
}

export interface CrashPollResult {
  closed: boolean;
  reason?: 'permission_denied' | 'disabled' | 'false_value';
  current: CrashCurrentData | null;
}

export interface CrashOverridePayload {
  roundNumber: number;
  crashPoint: number;
  updatedAt: number;
}

function isPermissionDeniedError(status: number, body: unknown): boolean {
  if (status === 401 || status === 403) return true;
  if (body && typeof body === 'object' && 'error' in body) {
    const err = String((body as { error: unknown }).error ?? '').toLowerCase();
    return err.includes('permission') || err.includes('denied');
  }
  return false;
}

function parseCurrentData(raw: unknown): CrashCurrentData | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const roundNumber = Number(obj.roundNumber);
  const crashPoint = Number(obj.crashPoint);
  const phase = obj.phase;

  if (
    !Number.isInteger(roundNumber) ||
    (phase !== 'waiting' && phase !== 'flight' && phase !== 'crashed') ||
    !Number.isFinite(crashPoint)
  ) {
    return null;
  }

  return {
    roundNumber,
    phase,
    crashPoint,
    roundStartedAt: typeof obj.roundStartedAt === 'number' ? obj.roundStartedAt : undefined,
    flightStartedAt: typeof obj.flightStartedAt === 'number' ? obj.flightStartedAt : undefined,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : undefined,
  };
}

export async function fetchCrashState(signal?: AbortSignal): Promise<CrashPollResult> {
  const ts = Date.now();
  const [currentRes, enabledRes] = await Promise.all([
    fetch(`${FIREBASE_RTDB_URL}/crash/current.json?t=${ts}`, {
      cache: 'no-store',
      signal,
    }),
    fetch(`${FIREBASE_RTDB_URL}/crash/enabled.json?t=${ts}`, {
      cache: 'no-store',
      signal,
    }),
  ]);

  let currentBody: unknown = null;
  let enabledBody: unknown = null;

  try {
    currentBody = await currentRes.json();
  } catch {
    currentBody = null;
  }

  try {
    enabledBody = await enabledRes.json();
  } catch {
    enabledBody = null;
  }

  if (
    isPermissionDeniedError(currentRes.status, currentBody) ||
    isPermissionDeniedError(enabledRes.status, enabledBody)
  ) {
    return { closed: true, reason: 'permission_denied', current: null };
  }

  if (enabledBody === false) {
    return { closed: true, reason: 'disabled', current: null };
  }

  if (currentBody === false) {
    return { closed: true, reason: 'false_value', current: null };
  }

  if (currentBody === null) {
    // Verify if the entire /crash node is set to false
    const rootRes = await fetch(`${FIREBASE_RTDB_URL}/crash.json?shallow=true&t=${ts}`, {
      cache: 'no-store',
      signal,
    });
    let rootBody: unknown = null;
    try {
      rootBody = await rootRes.json();
    } catch {
      rootBody = null;
    }
    if (isPermissionDeniedError(rootRes.status, rootBody)) {
      return { closed: true, reason: 'permission_denied', current: null };
    }
    if (rootBody === false) {
      return { closed: true, reason: 'false_value', current: null };
    }
    return { closed: false, current: null };
  }

  if (!currentRes.ok) {
    throw new Error(`RTDB HTTP ${currentRes.status}`);
  }

  return {
    closed: false,
    current: parseCurrentData(currentBody),
  };
}

export async function fetchPastCrashHistory(
  beforeRoundNumber: number,
  limit = 10
): Promise<CrashHistoryItem[]> {
  try {
    const res = await fetch(
      `${FIREBASE_RTDB_URL}/crash/history.json?orderBy="$key"&limitToLast=${limit + 4}&t=${Date.now()}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, unknown> | null;
    if (!data || typeof data !== 'object') return [];

    const items: CrashHistoryItem[] = [];
    for (const val of Object.values(data)) {
      if (!val || typeof val !== 'object') continue;
      const item = val as Record<string, unknown>;
      const roundNumber = Number(item.roundNumber);
      const crashPoint = Number(item.crashPoint);
      if (
        Number.isInteger(roundNumber) &&
        roundNumber < beforeRoundNumber &&
        Number.isFinite(crashPoint) &&
        crashPoint >= 1
      ) {
        items.push({
          roundNumber,
          crashPoint,
          crashedAt: typeof item.crashedAt === 'number' ? item.crashedAt : undefined,
        });
      }
    }

    return items.sort((a, b) => b.roundNumber - a.roundNumber).slice(0, limit);
  } catch {
    return [];
  }
}

export async function sendCrashOverride(
  targetRoundNumber: number,
  crashPoint: number,
  currentState: CrashCurrentData | null
): Promise<{ ok: boolean; error?: string }> {
  if (!Number.isInteger(targetRoundNumber) || targetRoundNumber <= 0) {
    return { ok: false, error: 'invalid_round' };
  }
  if (!Number.isFinite(crashPoint) || crashPoint < 1) {
    return { ok: false, error: 'invalid_crash_point' };
  }

  // Strict guard: only allow override for a round that hasn't started yet,
  // or the current round strictly while phase === 'waiting'.
  if (currentState) {
    const isCurrentWaiting =
      currentState.phase === 'waiting' && targetRoundNumber === currentState.roundNumber;
    const isFutureRound = targetRoundNumber > currentState.roundNumber;

    if (!isCurrentWaiting && !isFutureRound) {
      return { ok: false, error: 'round_already_started' };
    }
  }

  const payload: CrashOverridePayload = {
    roundNumber: targetRoundNumber,
    crashPoint: Number(crashPoint.toFixed(2)),
    updatedAt: Date.now(),
  };

  const res = await fetch(`${FIREBASE_RTDB_URL}/crash/override.json`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  if (isPermissionDeniedError(res.status, body)) {
    return { ok: false, error: 'permission_denied' };
  }

  if (!res.ok) {
    return { ok: false, error: `http_${res.status}` };
  }

  return { ok: true };
}
