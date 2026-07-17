const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function resumeAudio() { if (audioCtx.state === 'suspended') audioCtx.resume(); }

// ── Kanonenschuss – tiefer Knall + heller Crack, leichte Tonhöhen-Variation ──
function playCannonShot() {
    resumeAudio();
    const rate = 0.95 + Math.random() * 0.1; // 0.95–1.05

    // Tiefer "Bumm"-Layer
    const bufSize = audioCtx.sampleRate * 0.5;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
        const env = Math.pow(1 - i / bufSize, 1.8);
        d[i] = (Math.random() * 2 - 1) * env;
    }
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rate;

    const lpf = audioCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 120;

    const g1 = audioCtx.createGain();
    g1.gain.setValueAtTime(4.0, audioCtx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45);
    src.connect(lpf);
    lpf.connect(g1);
    g1.connect(audioCtx.destination);
    src.start();

    // Heller "Crack"-Layer
    const osc = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200 * rate, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.18);
    g2.gain.setValueAtTime(1.2, audioCtx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.18);
    osc.connect(g2);
    g2.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.18);
}

// ── Abpraller ────────────────────────────────────────────────────────────────
function playRicochet() {
    resumeAudio();
    const rate = 0.85 + Math.random() * 0.3;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200 * rate, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.25);
    g.gain.setValueAtTime(0.9, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(g);
    g.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}

// ── Explosion (kleine) – mit Entfernung ──────────────────────────────────────
function playExplosion(dist) {
    resumeAudio();
    const vol = _distToVol(dist, 200, 1.8);
    if (vol < 0.01) return;

    const bufferSize = audioCtx.sampleRate * 1.2;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.8);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const lpf = audioCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(800, audioCtx.currentTime);
    lpf.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 1.2);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);

    source.connect(lpf);
    lpf.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

// ── Grosse Panzer-Explosion – tiefer Bumm + heller Crack ─────────────────────
function playExplosionLarge(dist) {
    resumeAudio();
    const vol = _distToVol(dist, 350, 5.0);
    if (vol < 0.01) return;

    // Tiefes Rauschen
    const bufferSize = audioCtx.sampleRate * 2.0;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 1.4);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const lpf = audioCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(400, audioCtx.currentTime);
    lpf.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 2.0);

    const g1 = audioCtx.createGain();
    g1.gain.setValueAtTime(vol, audioCtx.currentTime);
    g1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 2.0);

    source.connect(lpf);
    lpf.connect(g1);
    g1.connect(audioCtx.destination);
    source.start();

    // Knall-Layer
    const osc = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.3);
    g2.gain.setValueAtTime(vol * 0.6, audioCtx.currentTime);
    g2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
    osc.connect(g2);
    g2.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playPlayerHit() {
    resumeAudio();
    const bufferSize = audioCtx.sampleRate * 0.4;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const gainNode = audioCtx.createGain();
    gainNode.gain.setValueAtTime(2.5, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start();
}

// ── MG ───────────────────────────────────────────────────────────────────────
function playMGShot() {
    resumeAudio();
    const rate = 0.9 + Math.random() * 0.2;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160 * rate, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.07);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.07);
}

// ── Gebäude-Einsturz ──────────────────────────────────────────────────────────
function playBuildingCollapse(dist) {
    resumeAudio();
    const vol = _distToVol(dist, 250, 3.0);
    if (vol < 0.01) return;

    const bufferSize = audioCtx.sampleRate * 1.8;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const env = i < bufferSize * 0.1
            ? i / (bufferSize * 0.1)
            : Math.pow(1 - (i - bufferSize * 0.1) / (bufferSize * 0.9), 0.8);
        data[i] = (Math.random() * 2 - 1) * env;
    }
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    const lpf = audioCtx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 300;

    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.8);

    source.connect(lpf);
    lpf.connect(g);
    g.connect(audioCtx.destination);
    source.start();
}

// ── Hilfsfunktion: Entfernung → Lautstärke ────────────────────────────────────
function _distToVol(dist, maxDist, baseVol) {
    if (dist === undefined || dist === null) return baseVol;
    return baseVol * Math.max(0, 1 - dist / maxDist);
}

function playSound(name, dist) {
    if (name === 'explosion_large') playExplosionLarge(dist);
    else if (name === 'player_hit') playPlayerHit();
    else if (name === 'ricochet') playRicochet();
    else if (name === 'building_collapse') playBuildingCollapse(dist);
}
