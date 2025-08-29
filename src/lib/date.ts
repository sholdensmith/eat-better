// Day/time helpers using America/Los_Angeles

const TZ = 'America/Los_Angeles';

export function nowInLA(): Date {
  // Create a Date reflecting now; operations that format will use timeZone TZ.
  return new Date();
}

export function formatDayKey(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${day}`;
}

export function todayKeyLA(): string {
  return formatDayKey(new Date());
}

export function nextLocalMidnightDelayMs(): number {
  // Compute milliseconds until the next midnight in LA
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(now);
  const year = Number(parts.find(p=>p.type==='year')!.value);
  const month = Number(parts.find(p=>p.type==='month')!.value);
  const day = Number(parts.find(p=>p.type==='day')!.value);

  // Next day at 00:00:00 LA. Construct a Date in LA by calculating UTC offset via DateTimeFormat.
  const laMidnightStr = `${year}-${String(month).padStart(2,'0')}-${String(day+1).padStart(2,'0')}T00:00:00`;
  // To map LA local to UTC timestamp, we can get the offset of LA at that instant by using Date in that locale is tricky.
  // Instead, approximate by constructing current LA date components and using UTC with offset difference.
  // Simpler approach: increment dayKey by 1 and compute the UTC time difference by repeatedly checking.
  const nowMs = Date.now();
  // Find next midnight by iterating minutes up to 26 hours max.
  let t = nowMs + 60_000; // start 1 min ahead
  const targetDayKey = incrementDayKey(todayKeyLA(), 1);
  while (t < nowMs + 26 * 3600_000) {
    const dk = formatDayKey(new Date(t));
    if (dk === targetDayKey) {
      // roll back to the first instant of that day
      // binary search backwards 1 hour to find boundary
      let low = t - 3600_000; let high = t;
      for (let i=0;i<20;i++) {
        const mid = Math.floor((low+high)/2);
        if (formatDayKey(new Date(mid)) === targetDayKey) high = mid; else low = mid;
      }
      return high - nowMs;
    }
    t += 60_000;
  }
  return 60_000; // fallback 1 min
}

export function incrementDayKey(dayKey: string, by: number): string {
  const [y,m,d] = dayKey.split('-').map(Number);
  // Build a Date as if in LA by using UTC and adjusting by LA's current offset is complex.
  // For our use (purge and UI), a simple UTC add is acceptable; server will use TZ properly for filtering.
  const dt = new Date(Date.UTC(y, m-1, d));
  dt.setUTCDate(dt.getUTCDate() + by);
  return formatDayKey(dt);
}

