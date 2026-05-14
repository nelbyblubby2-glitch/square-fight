// ── SFX System (Web Audio API — no files needed) ──────────────────────────────
const SFX = (() => {
  let ctx = null;

  function _ctx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  // Core tone builder
  function _play({ type = "square", freq = 440, freq2 = null, gain = 0.18,
                   attack = 0.005, decay = 0.08, sustain = 0, release = 0.05,
                   duration = 0.12, detune = 0, filterFreq = null, filterQ = 1 }) {
    try {
      const ac  = _ctx();
      const now = ac.currentTime;

      const osc = ac.createOscillator();
      const env = ac.createGain();

      osc.type    = type;
      osc.frequency.setValueAtTime(freq, now);
      if (freq2) osc.frequency.exponentialRampToValueAtTime(freq2, now + duration);
      if (detune) osc.detune.setValueAtTime(detune, now);

      env.gain.setValueAtTime(0, now);
      env.gain.linearRampToValueAtTime(gain, now + attack);
      env.gain.linearRampToValueAtTime(gain * sustain || gain * 0.3, now + attack + decay);
      env.gain.linearRampToValueAtTime(0, now + duration + release);

      let node = osc;

      if (filterFreq) {
        const filt = ac.createBiquadFilter();
        filt.type            = "lowpass";
        filt.frequency.value = filterFreq;
        filt.Q.value         = filterQ;
        osc.connect(filt);
        node = filt;
      }

      node.connect(env);
      env.connect(ac.destination);

      osc.start(now);
      osc.stop(now + duration + release + 0.02);
    } catch (_) {}
  }

  // Noise burst helper
  function _noise(gainVal = 0.06, dur = 0.07, filterFreq = 800) {
    try {
      const ac      = _ctx();
      const now     = ac.currentTime;
      const bufSize = Math.floor(ac.sampleRate * dur);
      const buf     = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data    = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      const src  = ac.createBufferSource();
      src.buffer = buf;

      const filt           = ac.createBiquadFilter();
      filt.type            = "bandpass";
      filt.frequency.value = filterFreq;
      filt.Q.value         = 1.2;

      const env = ac.createGain();
      env.gain.setValueAtTime(gainVal, now);
      env.gain.linearRampToValueAtTime(0, now + dur);

      src.connect(filt);
      filt.connect(env);
      env.connect(ac.destination);
      src.start(now);
    } catch (_) {}
  }

  return {
    // Square takes damage — punchy low thud + distorted crack
    takeDamage() {
      // Low body thud
      _play({ type: "sawtooth", freq: 90, freq2: 40, gain: 0.32,
              attack: 0.001, decay: 0.07, release: 0.10, duration: 0.09,
              filterFreq: 480, filterQ: 3 });
      // High crack layer
      _play({ type: "square", freq: 260, freq2: 90, gain: 0.14,
              attack: 0.001, decay: 0.045, release: 0.05, duration: 0.07,
              filterFreq: 1100 });
      // Noise burst
      _noise(0.11, 0.055, 420);
    },

    // Heal number appears — soft rising chime
    heal() {
      _play({ type: "sine", freq: 520, freq2: 780, gain: 0.13,
              attack: 0.008, decay: 0.06, release: 0.08, duration: 0.13 });
      _play({ type: "triangle", freq: 780, freq2: 1040, gain: 0.07,
              attack: 0.01, decay: 0.05, release: 0.06, duration: 0.11 });
    },

    // UI interaction — crisp click/tap feel for any button or screen press
    uiClick() {
      _play({ type: "sine", freq: 880, freq2: 660, gain: 0.11,
              attack: 0.002, decay: 0.035, release: 0.03, duration: 0.055 });
      _noise(0.04, 0.03, 2400);
    },
  };
})();
