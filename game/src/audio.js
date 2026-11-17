// Synthesized sound: no audio files, everything is WebAudio oscillators.
// All calls are guarded so the game never breaks when audio is unavailable.

export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenTimer = 0;
  let sirenHigh = false;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    try {
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
    } catch {
      engineOsc = null;
    }
  }

  function setEngine(speedRatio, driving) {
    if (!engineOsc || !engineGain) return;
    try {
      const target = muted ? 0 : (driving ? 0.03 + speedRatio * 0.05 : 0);
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
      engineOsc.frequency.setTargetAtTime(48 + speedRatio * 130, ctx.currentTime, 0.08);
    } catch { /* audio is best-effort */ }
  }

  function startSiren() {
    if (!ensure() || sirenOsc) return;
    try {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(ctx.destination);
      sirenOsc.start();
    } catch {
      sirenOsc = null;
    }
  }

  function updateSiren(dt, wanted) {
    if (!sirenOsc || !sirenGain) return;
    try {
      const target = muted || wanted === 0 ? 0 : 0.025;
      sirenGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
      sirenTimer += dt;
      if (sirenTimer > 0.45) {
        sirenTimer = 0;
        sirenHigh = !sirenHigh;
        sirenOsc.frequency.setTargetAtTime(sirenHigh ? 950 : 650, ctx.currentTime, 0.05);
      }
    } catch { /* best-effort */ }
  }

  function blip(freq, dur, type, vol) {
    if (muted || !ensure()) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.value = vol || 0.08;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + (dur || 0.12));
      o.stop(ctx.currentTime + (dur || 0.12));
    } catch { /* best-effort */ }
  }

  return {
    unlock,
    startEngine,
    setEngine,
    startSiren,
    updateSiren,
    pickup() { blip(880, 0.1, 'sine', 0.09); setTimeout(() => blip(1320, 0.12, 'sine', 0.09), 60); },
    coin() { blip(1200, 0.08, 'square', 0.05); },
    thud() { blip(90, 0.18, 'sawtooth', 0.12); },
    punch() { blip(180, 0.08, 'square', 0.07); },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.09), i * 90));
    },
    busted() { [400, 300, 200].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sawtooth', 0.08), i * 140)); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
  };
}
