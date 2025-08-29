// Local storage helpers for syncKey and targets

export type Targets = {
  calories_kcal: number;
  protein_g: number;
  carbs_g?: number | null;
  fat_g?: number | null;
};

export type Profile = {
  weight: string;       // raw user input, e.g., "211 lb" or "96 kg"
  height: string;       // raw user input, e.g., "5 ft 7 in" or "170 cm"
  age: number;          // years
  sex: 'male' | 'female';
  activity: number;     // multiplier (e.g., 1.375)
  deficit: number;      // kcal/day
  goalWeight?: string;  // optional raw input
};

const SYNC_KEY = 'syncKey';
const TARGETS_KEY = 'targets';
const LAST_DAY_KEY = 'lastDayKey';
const PROFILE_KEY = 'profile';

export function getOrCreateSyncKey(): string {
  let k = localStorage.getItem(SYNC_KEY);
  if (!k) {
    k = crypto.randomUUID();
    localStorage.setItem(SYNC_KEY, k);
  }
  return k;
}

export function getSyncKey(): string | null {
  return localStorage.getItem(SYNC_KEY);
}

export function applyPairingHashIfPresent(): boolean {
  // Expect URL hash like #k=<syncKey>
  const hash = window.location.hash;
  if (hash && hash.startsWith('#k=')) {
    const incoming = decodeURIComponent(hash.slice(3));
    if (incoming && incoming.length >= 16) {
      localStorage.setItem(SYNC_KEY, incoming);
    }
    // clear hash
    window.location.hash = '';
    return true;
  }
  return false;
}

export function saveTargets(t: Targets) {
  localStorage.setItem(TARGETS_KEY, JSON.stringify(t));
}

export function loadTargets(): Targets | null {
  const raw = localStorage.getItem(TARGETS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function getLastDayKey(): string | null {
  return localStorage.getItem(LAST_DAY_KEY);
}
export function setLastDayKey(k: string) {
  localStorage.setItem(LAST_DAY_KEY, k);
}

export function saveProfile(p: Profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

export function loadProfile(): Profile | null {
  const raw = localStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as Profile; } catch { return null; }
}
