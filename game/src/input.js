// Keyboard input: held keys, plus one-shot presses the game consumes.

export function createInput() {
  const keys = new Set();
  const pressed = new Set();

  function onKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (!keys.has(k)) pressed.add(k);
    keys.add(k);
  }
  function onKeyUp(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    keys.delete(k);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', () => { keys.clear(); pressed.clear(); });

  return {
    // Held-state checks.
    up() { return keys.has('w') || keys.has('ArrowUp'); },
    down() { return keys.has('s') || keys.has('ArrowDown'); },
    left() { return keys.has('a') || keys.has('ArrowLeft'); },
    right() { return keys.has('d') || keys.has('ArrowRight'); },
    run() { return keys.has('Shift'); },
    // One-shot press, consumed on read.
    consume(key) {
      const k = key.length === 1 ? key.toLowerCase() : key;
      if (pressed.has(k)) { pressed.delete(k); return true; }
      return false;
    },
    clearPressed() { pressed.clear(); },
  };
}
