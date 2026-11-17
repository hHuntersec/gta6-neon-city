// Save / load through localStorage. Best-effort: a private window simply
// starts fresh.

const KEY = 'neon-city-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(data) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable — the game still plays.
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(KEY);
  } catch { /* best-effort */ }
}
