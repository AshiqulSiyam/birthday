/**
 * LILIUM ORIENTALIS // PROJECT: MOONLIGHT
 * Interactive 3D Stargazer Lily Growth Animation & Birthday Tribute
 * Dedicated to Nusrat Jahan Sadia — 03 November
 */

(function () {
  'use strict';

  // ==========================================================================
  // Global State & Configuration
  // ==========================================================================
  const CONFIG = {
    animationDuration: 10.0, // 10 seconds from seed to full bloom
    idleSwaySpeed: 0.8,
    cameraBaseZ: 9.5,
    cameraShiftX: -2.2, // Camera shift when message card opens
    stemHeight: 10.2,
    colors: {
      black: 0x000000,
      stemGreen: 0x245a1b,
      stemHighlight: 0x4caf50,
      wireframePink: 0xff80ab,
      wireframeWhite: 0xffffff,
      pollenGold: 0xffa000,
      antherOrange: 0xd84315,
      stigmaGreen: 0x1b5e20,
      fireflyGold: 0xfff5cc,
      fireflyPink: 0xff99bb
    }
  };

  const urlParams = new URLSearchParams(window.location.search);
  const initialProgress = urlParams.has('progress') ? Math.min(1.0, Math.max(0.0, parseFloat(urlParams.get('progress')))) : 0.0;

  const STATE = {
    progress: initialProgress, // 0.000 to 1.000
    isPlaying: true,
    isComplete: false,
    isPanelOpen: false,
    currentStage: 1,
    audioEnabled: true,
    isBirthdaySongPlaying: false,
    activeFlowerIndex: -1,
    tourAccepted: false,
    mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
    camTargetOffset: { x: 0, y: 0, z: CONFIG.cameraBaseZ }
  };

  // Flower Quotes for Wish Nodes
  const FLOWER_WISHES = [
    {
      id: "FLOWER // 01 (APEX)",
      text: '"3rd November: The day the moon came to this world."'
    },
    {
      id: "FLOWER // 02 (AURORA)",
      text: '"In Sha Allah: A smoother path & every dream fulfilled."'
    },
    {
      id: "FLOWER // 03 (HORIZON)",
      text: '"Pending Request: 1x Campus Tour 🙂"'
    }
  ];

  // DOM Elements
  const container = document.getElementById('webgl-container');
  const stageStatusEl = document.getElementById('stage-status');
  const progressPercentEl = document.getElementById('progress-percent');
  const progressBarFillEl = document.getElementById('progress-bar-fill');
  const hudCoordsEl = document.getElementById('hud-coords');
  const unlockContainer = document.getElementById('unlock-container');
  const unlockBtn = document.getElementById('unlock-btn');
  const messagePanel = document.getElementById('message-panel');
  const tiltGlassCard = document.getElementById('tilt-glass-card');
  const closePanelBtn = document.getElementById('close-panel-btn');
  const flowerTooltip = document.getElementById('flower-tooltip');
  const tooltipText = document.getElementById('tooltip-text');
  const tabPolished = document.getElementById('tab-polished');
  const tabRaw = document.getElementById('tab-raw');
  const contentPolished = document.getElementById('content-polished');
  const contentRaw = document.getElementById('content-raw');
  const tourBtn = document.getElementById('tour-btn');
  const tourBtnText = document.getElementById('tour-btn-text');
  const replayBtn = document.getElementById('replay-btn');
  const equalizerBars = document.getElementById('equalizer-bars');
  const confettiCanvas = document.getElementById('confetti-canvas');

  // ==========================================================================
  // Music Box "Happy Birthday to You" Synthesizer (Pure Web Audio API)
  // ==========================================================================
  let audioCtx = null;
  let masterGainNode = null;
  let birthdaySongTimeouts = [];

  function initAudio() {
    if (audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AudioContext();
      masterGainNode = audioCtx.createGain();
      masterGainNode.gain.setValueAtTime(STATE.audioEnabled ? 1.0 : 0.0, audioCtx.currentTime);
      masterGainNode.connect(audioCtx.destination);
    } catch (e) {
      console.warn("Audio Context init deferred:", e);
    }
  }

  /**
   * Synthesizes a crystalline music-box / celesta chime tone
   */
  function playMusicBoxNote(freq, time, duration = 1.4, gainLevel = 0.18) {
    if (!audioCtx || !masterGainNode) return;
    try {
      const osc1 = audioCtx.createOscillator(); // Fundamental
      const osc2 = audioCtx.createOscillator(); // 1st Overtone (octave)
      const osc3 = audioCtx.createOscillator(); // 2nd Overtone (crystal shimmer)
      const noteGain = audioCtx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, time);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, time);

      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3, time);

      // Bell / Music box envelope
      noteGain.gain.setValueAtTime(0.0001, time);
      noteGain.gain.linearRampToValueAtTime(gainLevel, time + 0.008);
      noteGain.gain.exponentialRampToValueAtTime(gainLevel * 0.45, time + 0.18);
      noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      osc3.connect(noteGain);

      noteGain.connect(masterGainNode);

      osc1.start(time);
      osc2.start(time);
      osc3.start(time);

      osc1.stop(time + duration);
      osc2.stop(time + duration);
      osc3.stop(time + duration);
    } catch (e) {}
  }

  /**
   * Complete Polyphonic "Happy Birthday to You" Arrangement (in F Major)
   */
  function playHappyBirthdayMelody() {
    initAudio();
    if (!audioCtx || !masterGainNode) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    // Clear any previous schedule
    birthdaySongTimeouts.forEach(t => clearTimeout(t));
    birthdaySongTimeouts = [];

    // Ensure master volume is unmuted
    masterGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);

    STATE.isBirthdaySongPlaying = true;
    STATE.audioEnabled = true;
    updateAudioUIState(true);

    const tempo = 92; // BPM
    const beatSec = 60 / tempo;
    const startTime = audioCtx.currentTime + 0.15;

    // Pitch Frequencies (Hz)
    const C4 = 261.63, D4 = 293.66, Eb4 = 311.13, E4 = 329.63, F4 = 349.23, G4 = 392.00;
    const A4 = 440.00, Bb4 = 466.16, C5 = 523.25, D5 = 587.33;
    const C3 = 130.81, E3 = 164.81, F3 = 174.61, G3 = 196.00, A3 = 220.00, Bb3 = 233.08, Bb2 = 116.54;

    // Melody: [frequency, durationBeats, startBeatOffset]
    const melody = [
      // Phrase 1: "Happy Birthday to you"
      [C4, 0.75, 0.0],
      [C4, 0.25, 0.75],
      [D4, 1.0, 1.0],
      [C4, 1.0, 2.0],
      [F4, 1.0, 3.0],
      [E4, 2.0, 4.0],

      // Phrase 2: "Happy Birthday to you"
      [C4, 0.75, 6.0],
      [C4, 0.25, 6.75],
      [D4, 1.0, 7.0],
      [C4, 1.0, 8.0],
      [G4, 1.0, 9.0],
      [F4, 2.0, 10.0],

      // Phrase 3: "Happy Birthday dear Nusrat (Jahan Sadia)"
      [C4, 0.75, 12.0],
      [C4, 0.25, 12.75],
      [C5, 1.0, 13.0],
      [A4, 1.0, 14.0],
      [F4, 1.0, 15.0],
      [E4, 1.0, 16.0],
      [D4, 2.0, 17.0],

      // Phrase 4: "Happy Birthday to you!"
      [Bb4, 0.75, 19.0],
      [Bb4, 0.25, 19.75],
      [A4, 1.0, 20.0],
      [F4, 1.0, 21.0],
      [G4, 1.0, 22.0],
      [F4, 3.2, 23.0]
    ];

    // Harmony chords / bass notes
    const chords = [
      // Bar 1 & 2: F major then C7
      [F3, 0.0], [A3, 1.0], [C4, 2.0],
      [C3, 3.0], [G3, 4.0], [Bb3, 5.0],
      // Bar 3 & 4: C7 then F
      [C3, 6.0], [E3, 7.0], [G3, 8.0],
      [F3, 9.0], [A3, 10.0], [C4, 11.0],
      // Bar 5 & 6: F7 then Bb
      [F3, 12.0], [C4, 13.0], [Eb4, 14.0],
      [Bb2, 15.0], [F3, 16.0], [D4, 17.0],
      // Bar 7 & 8: F/C, C7, F
      [C3, 19.0], [F3, 20.0], [A3, 21.0],
      [C3, 22.0], [E3, 22.5],
      [F3, 23.0], [A3, 23.2], [C4, 23.4], [F4, 23.6]
    ];

    // Schedule melody
    melody.forEach(([freq, dur, beat]) => {
      const noteTime = startTime + beat * beatSec;
      playMusicBoxNote(freq, noteTime, dur * beatSec * 1.5, 0.18);
    });

    // Schedule soft harmony
    chords.forEach(([freq, beat]) => {
      if (!freq) return;
      const noteTime = startTime + beat * beatSec;
      playMusicBoxNote(freq, noteTime, 1.8, 0.08);
    });

    // Total song duration ~ 27 beats
    const totalDurationMs = (27 * beatSec + 0.8) * 1000;
    const endTid = setTimeout(() => {
      if (STATE.audioEnabled) {
        playHappyBirthdayMelody();
      }
    }, totalDurationMs);

    birthdaySongTimeouts.push(endTid);
  }

  function stopHappyBirthday() {
    birthdaySongTimeouts.forEach(t => clearTimeout(t));
    birthdaySongTimeouts = [];
    STATE.isBirthdaySongPlaying = false;
    STATE.audioEnabled = false;

    if (masterGainNode && audioCtx) {
      masterGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
      masterGainNode.gain.setValueAtTime(0.0, audioCtx.currentTime);
    }
    if (audioCtx && audioCtx.state === 'running') {
      audioCtx.suspend();
    }
    updateAudioUIState(false);
  }

  function toggleAudio() {
    initAudio();
    if (!audioCtx) return;

    const unlockOverlay = document.getElementById('audio-unlock-overlay');
    if (unlockOverlay) unlockOverlay.classList.add('dismissed');

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        playHappyBirthdayMelody();
      });
      return;
    }

    if (STATE.audioEnabled && STATE.isBirthdaySongPlaying) {
      stopHappyBirthday();
    } else {
      STATE.audioEnabled = true;
      playHappyBirthdayMelody();
    }
  }

  function updateAudioUIState(isPlaying) {
    const audioBtn = document.getElementById('audio-toggle');
    const audioLabel = document.getElementById('audio-label');
    const cardAudioBtnIcon = document.getElementById('card-audio-btn-icon');
    const equalizerBars = document.getElementById('equalizer-bars');

    if (isPlaying) {
      if (audioBtn) {
        audioBtn.classList.add('active');
        audioBtn.classList.remove('muted');
      }
      if (audioLabel) audioLabel.textContent = 'MUSIC: ON';
      if (cardAudioBtnIcon) cardAudioBtnIcon.textContent = '🔊';
      if (equalizerBars) equalizerBars.style.opacity = '1';
    } else {
      if (audioBtn) {
        audioBtn.classList.remove('active');
        audioBtn.classList.add('muted');
      }
      if (audioLabel) audioLabel.textContent = 'MUSIC: OFF';
      if (cardAudioBtnIcon) cardAudioBtnIcon.textContent = '🔇';
      if (equalizerBars) equalizerBars.style.opacity = '0.35';
    }
  }

  function ensureAudioPlaying() {
    if (!STATE.audioEnabled) return;
    initAudio();
    if (audioCtx) {
      if (audioCtx.state === 'running') {
        const unlockOverlay = document.getElementById('audio-unlock-overlay');
        if (unlockOverlay) unlockOverlay.classList.add('dismissed');
        if (!STATE.isBirthdaySongPlaying) {
          playHappyBirthdayMelody();
        }
      } else if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          const unlockOverlay = document.getElementById('audio-unlock-overlay');
          if (unlockOverlay) unlockOverlay.classList.add('dismissed');
          if (!STATE.isBirthdaySongPlaying && STATE.audioEnabled) {
            playHappyBirthdayMelody();
          }
        }).catch(() => {
          // Autoplay blocked by browser policy until user click/tap
        });
      }
    }
  }

  // ==========================================================================
  // Procedural Canvas Textures & Background Artwork (Zero External Links)
  // ==========================================================================

  /**
   * Generates a high-definition botanical illustration of a blooming
   * Stargazer Lily specifically tailored as the message card background.
   */
  function createCardFlowerBackground() {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d');

    // 1. Dark celestial botanical background
    const bgGrad = ctx.createRadialGradient(600, 600, 100, 600, 800, 950);
    bgGrad.addColorStop(0, '#2d0e26');
    bgGrad.addColorStop(0.35, '#1b0a1e');
    bgGrad.addColorStop(0.75, '#0e0614');
    bgGrad.addColorStop(1, '#050208');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 1600);

    // 2. Soft starlight & glowing orbs
    for (let i = 0; i < 75; i++) {
      const x = Math.random() * 1200;
      const y = Math.random() * 1600;
      const r = 2 + Math.random() * 16;
      const alpha = 0.04 + Math.random() * 0.16;
      ctx.fillStyle = i % 2 === 0 ? `rgba(255, 128, 171, ${alpha})` : `rgba(255, 215, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Central Stargazer Lily Botanical Painting
    const centerX = 600;
    const centerY = 520;

    // Background deep green foliage leaves
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 + 15) * (Math.PI / 180);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);
      const leafGrad = ctx.createLinearGradient(0, 0, 0, 420);
      leafGrad.addColorStop(0, '#1b5e20');
      leafGrad.addColorStop(0.6, '#2e7d32');
      leafGrad.addColorStop(1, '#0a2a0c');
      ctx.fillStyle = leafGrad;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      ctx.quadraticCurveTo(80, 220, 0, 440);
      ctx.quadraticCurveTo(-80, 220, 0, 40);
      ctx.fill();
      ctx.restore();
    }

    // 6 Large Recurved Stargazer Petals
    const drawPetal = (angle, isInner) => {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle);

      const length = isInner ? 390 : 355;
      const halfWidth = isInner ? 115 : 88;

      ctx.beginPath();
      ctx.moveTo(0, 25);
      ctx.bezierCurveTo(halfWidth * 0.8, 90, halfWidth * 1.15, length * 0.5, halfWidth * 0.4, length * 0.85);
      ctx.quadraticCurveTo(halfWidth * 0.1, length * 0.95, 0, length);
      ctx.quadraticCurveTo(-halfWidth * 0.1, length * 0.95, -halfWidth * 0.4, length * 0.85);
      ctx.bezierCurveTo(-halfWidth * 1.15, length * 0.5, -halfWidth * 0.8, 90, 0, 25);
      ctx.closePath();

      // Petal Base Ivory Fill
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Petal Gradient (White margin, Crimson Heart)
      const pGrad = ctx.createRadialGradient(0, length * 0.4, 20, 0, length * 0.4, halfWidth * 1.25);
      pGrad.addColorStop(0, '#880e4f');
      pGrad.addColorStop(0.35, '#ad1457');
      pGrad.addColorStop(0.65, '#c2185b');
      pGrad.addColorStop(0.85, 'rgba(255, 64, 129, 0.55)');
      pGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = pGrad;
      ctx.fill();

      // Chartreuse Nectar Furrow at base
      const nGrad = ctx.createRadialGradient(0, 40, 5, 0, 40, 110);
      nGrad.addColorStop(0, '#cddc39');
      nGrad.addColorStop(0.5, '#8bc34a');
      nGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = nGrad;
      ctx.beginPath();
      ctx.ellipse(0, 50, 28, 70, 0, 0, Math.PI * 2);
      ctx.fill();

      // Raised dark burgundy speckles
      ctx.fillStyle = '#4a0028';
      for (let s = 0; s < 40; s++) {
        const sy = 60 + Math.random() * (length * 0.65);
        const sx = (Math.random() - 0.5) * (halfWidth * 0.85) * (1 - (sy / length));
        const sr = 1.8 + Math.random() * 3.5;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // White ruffled edge highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 3.5;
      ctx.stroke();

      ctx.restore();
    };

    // Draw outer sepals (60, 180, 300 deg)
    [60, 180, 300].forEach(deg => drawPetal(deg * (Math.PI / 180), false));
    // Draw inner petals (0, 120, 240 deg)
    [0, 120, 240].forEach(deg => drawPetal(deg * (Math.PI / 180), true));

    // Stamens & Golden-Orange Anthers at center
    for (let st = 0; st < 6; st++) {
      const sAngle = (st * 60 + 30) * (Math.PI / 180);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(sAngle);

      ctx.strokeStyle = '#dcedc8';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.quadraticCurveTo(35, 120, 60, 215);
      ctx.stroke();

      ctx.fillStyle = '#d84315';
      ctx.shadowColor = '#ffa000';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.ellipse(60, 215, 14, 32, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.restore();
    }

    // Central Pistil Stigma
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();

    // Floating ambient petals drifting down
    for (let p = 0; p < 18; p++) {
      const px = Math.random() * 1200;
      const py = 750 + Math.random() * 750;
      const pRot = Math.random() * Math.PI * 2;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(pRot);
      const petGrad = ctx.createLinearGradient(-25, 0, 25, 0);
      petGrad.addColorStop(0, 'rgba(255, 64, 129, 0.45)');
      petGrad.addColorStop(0.5, 'rgba(255, 128, 171, 0.55)');
      petGrad.addColorStop(1, 'rgba(255, 255, 255, 0.5)');
      ctx.fillStyle = petGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Generates authentic, breathtaking Lilium Orientalis 'Stargazer' petal texture:
   * Saturated crimson-magenta heart, ruffled white borders, luminous lime nectar groove,
   * tactile dark burgundy papillae/speckles with micro specular 3D glints.
   */
  function createStargazerPetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // 1. Pristine translucent porcelain ivory base
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 2048, 2048);

    // 2. Soft pastel rose blush
    const blushGrad = ctx.createLinearGradient(0, 2048, 0, 0);
    blushGrad.addColorStop(0, '#ffffff');
    blushGrad.addColorStop(0.15, '#fff0f5');
    blushGrad.addColorStop(0.5, '#fce4ec');
    blushGrad.addColorStop(0.85, '#ffffff');
    ctx.fillStyle = blushGrad;
    ctx.fillRect(0, 0, 2048, 2048);

    // 3. Central Saturated Crimson-Magenta Heart (Stargazer Identity)
    const centerGrad = ctx.createRadialGradient(1024, 1200, 30, 1024, 1200, 960);
    centerGrad.addColorStop(0, '#880e4f'); // Deep velvet burgundy
    centerGrad.addColorStop(0.2, '#ad1457'); // Royal crimson
    centerGrad.addColorStop(0.45, '#c2185b'); // Saturated magenta
    centerGrad.addColorStop(0.7, '#ff4081'); // Radiant hot pink
    centerGrad.addColorStop(0.88, 'rgba(255, 128, 171, 0.25)');
    centerGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.save();
    ctx.translate(1024, 1024);
    ctx.scale(0.44, 1.0); // Longitudinal stripe
    ctx.translate(-1024, -1024);
    ctx.fillStyle = centerGrad;
    ctx.fillRect(0, 0, 2048, 2048);
    ctx.restore();

    // 4. Luminous Yellow/Lime Nectar Furrow at petal base
    const nectarGrad = ctx.createRadialGradient(1024, 2000, 10, 1024, 2000, 480);
    nectarGrad.addColorStop(0, '#cddc39'); // Bright chartreuse
    nectarGrad.addColorStop(0.35, '#8bc34a'); // Lime green
    nectarGrad.addColorStop(0.65, 'rgba(255, 235, 59, 0.4)');
    nectarGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.save();
    ctx.translate(1024, 2000);
    ctx.scale(0.3, 1.25);
    ctx.translate(-1024, -2000);
    ctx.fillStyle = nectarGrad;
    ctx.beginPath();
    ctx.arc(1024, 2000, 480, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 5. Fine longitudinal botanical veins branching outward
    ctx.lineWidth = 1.8;
    for (let i = 0; i < 60; i++) {
      const angle = (i - 30) * 0.022;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(136, 14, 79, 0.22)' : 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.moveTo(1024, 2000);
      const ctrlX = 1024 + Math.sin(angle) * 720;
      const endX = 1024 + Math.sin(angle * 1.45) * 900;
      ctx.quadraticCurveTo(ctrlX, 1100, endX, 180);
      ctx.stroke();
    }

    // 6. Distinct Raised Magenta Papillae / Speckles (240+ organic dots)
    const rng = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    let seed = 77;
    for (let i = 0; i < 240; i++) {
      const u = rng(seed++);
      const v = rng(seed++);

      // Clustered along midrib and lower-middle half
      const y = 600 + v * 1250;
      const xSpread = (1 - (y - 600) / 1800) * 320 + 80;
      const x = 1024 + (u - 0.5) * xSpread * 2;
      const radius = 3.5 + rng(seed++) * 5.0;

      // Dark wine red core
      ctx.fillStyle = '#4a0028';
      ctx.beginPath();
      ctx.ellipse(x, y, radius, radius * 1.35, (u - 0.5) * 0.35, 0, Math.PI * 2);
      ctx.fill();

      // Soft magenta halo
      ctx.fillStyle = 'rgba(216, 27, 96, 0.45)';
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Tiny 3D specular highlight on top
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      ctx.arc(x - radius * 0.35, y - radius * 0.35, radius * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.anisotropy = 16;
    return texture;
  }

  /**
   * Generates procedural Bump Map for petal surface tactile relief
   */
  function createStargazerBumpMap() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080'; // Neutral gray base
    ctx.fillRect(0, 0, 1024, 1024);

    // Deep midrib groove
    const midribGrad = ctx.createLinearGradient(480, 0, 544, 0);
    midribGrad.addColorStop(0, '#808080');
    midribGrad.addColorStop(0.5, '#404040'); // Indented
    midribGrad.addColorStop(1, '#808080');
    ctx.fillStyle = midribGrad;
    ctx.fillRect(480, 0, 64, 1024);

    // Raised speckles in bump map
    const rng = (seed) => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    let seed = 77;
    for (let i = 0; i < 240; i++) {
      const u = rng(seed++);
      const v = rng(seed++);
      const y = 300 + v * 625;
      const xSpread = (1 - (y - 300) / 900) * 160 + 40;
      const x = 512 + (u - 0.5) * xSpread * 2;
      const radius = 2.5 + rng(seed++) * 3.5;

      const dotGrad = ctx.createRadialGradient(x, y, 0, x, y, radius * 1.5);
      dotGrad.addColorStop(0, '#ffffff'); // Raised peak
      dotGrad.addColorStop(1, '#808080');
      ctx.fillStyle = dotGrad;
      ctx.beginPath();
      ctx.arc(x, y, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * Generates soft glowing lunar halo texture
   */
  function createMoonTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Soft outer atmosphere aura
    const glowGrad = ctx.createRadialGradient(256, 256, 120, 256, 256, 256);
    glowGrad.addColorStop(0, 'rgba(235, 245, 255, 0.95)');
    glowGrad.addColorStop(0.5, 'rgba(180, 215, 255, 0.4)');
    glowGrad.addColorStop(0.8, 'rgba(255, 180, 220, 0.15)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, 512, 512);

    // Moon Disc with subtle maria / craters
    ctx.fillStyle = '#f8f9fa';
    ctx.beginPath();
    ctx.arc(256, 256, 140, 0, Math.PI * 2);
    ctx.fill();

    // Lunar Maria shading (soft gray-blue patches)
    ctx.fillStyle = 'rgba(160, 175, 200, 0.22)';
    const craters = [
      [220, 230, 45],
      [280, 210, 50],
      [250, 310, 60],
      [190, 280, 35],
      [310, 290, 40]
    ];
    craters.forEach(([cx, cy, cr]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, Math.PI * 2);
      ctx.fill();
    });

    return new THREE.CanvasTexture(canvas);
  }

  /**
   * Generates smooth glowing sprite for particles
   */
  function createParticleSpriteTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 240, 210, 0.9)');
    grad.addColorStop(0.6, 'rgba(255, 128, 171, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  // ==========================================================================
  // Three.js Scene Setup
  // ==========================================================================
  let scene, camera, renderer, clock;
  let lilyRootGroup;
  let flowerHeads = [];
  let foliageMeshes = [];
  let stemCurve, stemMesh;
  let lunarHaloMesh;
  let starParticles, fireflyParticles, fireflyPositions, fireflyVelocities;
  let raycaster, mouseVector;
  let petalSharedTexture, petalSharedBumpMap;

  function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(CONFIG.colors.black);
    scene.fog = new THREE.FogExp2(0x060309, 0.02);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 2.5, CONFIG.cameraBaseZ);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    mouseVector = new THREE.Vector2();

    petalSharedTexture = createStargazerPetalTexture();
    petalSharedBumpMap = createStargazerBumpMap();

    setupLighting();
    setupStarfield();
    setupProceduralLily();
    setupLunarHalo();
    setupFireflies();

    window.addEventListener('resize', onWindowResize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('click', onCanvasClick);
  }

  function setupLighting() {
    // Ambient light - delicate cool twilight
    const ambientLight = new THREE.AmbientLight(0x321a38, 1.4);
    scene.add(ambientLight);

    // Key Light - soft warm moonlight from top front
    const keyLight = new THREE.DirectionalLight(0xfff8ed, 1.6);
    keyLight.position.set(3.5, 9, 6.5);
    scene.add(keyLight);

    // Rim / Backlight - vibrant magenta/pink halo for botanical silhouette
    const rimLight = new THREE.DirectionalLight(0xff4081, 1.8);
    rimLight.position.set(-4.5, 6, -5);
    scene.add(rimLight);

    // Soft botanical uplight
    const upLight = new THREE.PointLight(0x4caf50, 0.9, 14);
    upLight.position.set(0, -3, 2);
    scene.add(upLight);
  }

  // ==========================================================================
  // Starfield & Deep-Space Cosmic Ambience
  // ==========================================================================
  function setupStarfield() {
    const starCount = 2000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const idx = i * 3;
      positions[idx] = (Math.random() - 0.5) * 65;
      positions[idx + 1] = (Math.random() - 0.5) * 55 + 2;
      positions[idx + 2] = -12 + (Math.random() - 0.5) * 38;

      const isWarm = Math.random() > 0.6;
      colors[idx] = isWarm ? 1.0 : 0.85;
      colors[idx + 1] = isWarm ? 0.88 : 0.92;
      colors[idx + 2] = isWarm ? 0.98 : 1.0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.13,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });

    starParticles = new THREE.Points(geometry, material);
    scene.add(starParticles);
  }

  // ==========================================================================
  // Floating Fireflies & Upward Spore Swarm
  // ==========================================================================
  function setupFireflies() {
    const count = 380;
    const geometry = new THREE.BufferGeometry();
    fireflyPositions = new Float32Array(count * 3);
    fireflyVelocities = [];

    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      fireflyPositions[idx] = (Math.random() - 0.5) * 14;
      fireflyPositions[idx + 1] = -5.5 + Math.random() * 13;
      fireflyPositions[idx + 2] = (Math.random() - 0.5) * 11;

      fireflyVelocities.push({
        vx: (Math.random() - 0.5) * 0.008,
        vy: 0.012 + Math.random() * 0.022,
        vz: (Math.random() - 0.5) * 0.008,
        pulseSpeed: 1.5 + Math.random() * 3.0,
        phase: Math.random() * Math.PI * 2
      });

      const isGold = i % 2 === 0;
      colors[idx] = isGold ? 1.0 : 1.0;
      colors[idx + 1] = isGold ? 0.94 : 0.55;
      colors[idx + 2] = isGold ? 0.78 : 0.78;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(fireflyPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.3,
      map: createParticleSpriteTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    fireflyParticles = new THREE.Points(geometry, material);
    scene.add(fireflyParticles);
  }

  // ==========================================================================
  // Procedural Stargazer Lily Construction
  // ==========================================================================
  function setupProceduralLily() {
    lilyRootGroup = new THREE.Group();
    scene.add(lilyRootGroup);

    // 1. Central Stem Path (Organic curve bending slightly forward and right)
    const stemPoints = [
      new THREE.Vector3(0.0, -5.2, 0.0),
      new THREE.Vector3(0.12, -2.5, 0.1),
      new THREE.Vector3(-0.16, 0.5, 0.16),
      new THREE.Vector3(0.14, 2.8, -0.05),
      new THREE.Vector3(0.0, 4.9, 0.1)
    ];
    stemCurve = new THREE.CatmullRomCurve3(stemPoints);

    // Stem Tube Geometry
    const stemGeo = new THREE.TubeGeometry(stemCurve, 72, 0.12, 14, false);
    const stemMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.stemGreen,
      roughness: 0.38,
      metalness: 0.08
    });
    stemMesh = new THREE.Mesh(stemGeo, stemMat);
    lilyRootGroup.add(stemMesh);

    // Initially hide stem for growth phase
    stemMesh.scale.set(1, 0.001, 1);
    stemMesh.position.y = -5.2;

    // 2. Alternating Lanceolate Lily Leaves along the stalk
    buildFoliage();

    // 3. Unopened buds at apex
    buildBuds();

    // 4. Three Exquisite Stargazer Flower Heads
    // Flower 1: Apex Top-Center (Tilted forward-down toward viewer to proudly display open radial face)
    const f1 = createStargazerFlowerHead(0, new THREE.Vector3(0.0, 4.45, 0.2), new THREE.Euler(0.46, 0, 0));
    // Flower 2: Left Aurora (Branching outward left)
    const f2 = createStargazerFlowerHead(1, new THREE.Vector3(-1.55, 3.45, 0.35), new THREE.Euler(0.36, -0.62, 0.35));
    // Flower 3: Right Horizon (Branching outward right)
    const f3 = createStargazerFlowerHead(2, new THREE.Vector3(1.45, 3.15, 0.45), new THREE.Euler(0.30, 0.55, -0.30));

    flowerHeads.push(f1, f2, f3);
  }

  /**
   * Builds alternating lance-shaped leaves curling naturally along the stem
   */
  function buildFoliage() {
    const leafCount = 14;
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x245a1b,
      roughness: 0.32,
      metalness: 0.1,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < leafCount; i++) {
      const t = 0.12 + (i / leafCount) * 0.72; // along stem [0..1]
      const pt = stemCurve.getPoint(t);
      const angle = i * 2.39996; // Golden spiral angle

      const leafGeo = createLanceLeafGeometry(1.65 - (i / leafCount) * 0.35, 0.38);
      const leafMesh = new THREE.Mesh(leafGeo, leafMat);

      leafMesh.position.copy(pt);
      leafMesh.rotation.y = angle;
      leafMesh.rotation.x = 0.42 + (i / leafCount) * 0.32; // curl down
      leafMesh.rotation.z = Math.sin(angle) * 0.22;

      leafMesh.scale.set(0.001, 0.001, 0.001);
      lilyRootGroup.add(leafMesh);

      foliageMeshes.push({
        mesh: leafMesh,
        triggerT: t,
        targetScale: 1.0 - (i / leafCount) * 0.22
      });
    }
  }

  /**
   * Generates a single lance-shaped leaf with arched keel
   */
  function createLanceLeafGeometry(length = 1.6, width = 0.38) {
    const geo = new THREE.BufferGeometry();
    const segsU = 20;
    const segsV = 8;
    const verts = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU; // 0 (base) to 1 (tip)
      const archY = -Math.pow(u, 2.1) * 0.48;
      const reachZ = u * length;
      const curWidth = Math.sin(Math.pow(u, 0.8) * Math.PI) * width;

      for (let j = 0; j <= segsV; j++) {
        const v = (j / segsV) * 2 - 1; // -1 to +1
        const x = v * curWidth * 0.5;
        const y = archY + (1 - Math.abs(v)) * 0.07;
        const z = reachZ;

        verts.push(x, y, z);
        uvs.push((v + 1) * 0.5, u);
      }
    }

    const rowSize = segsV + 1;
    for (let i = 0; i < segsU; i++) {
      for (let j = 0; j < segsV; j++) {
        const a = i * rowSize + j;
        const b = (i + 1) * rowSize + j;
        const c = (i + 1) * rowSize + (j + 1);
        const d = i * rowSize + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  /**
   * Builds two unopened green/pink-tipped buds at the stem apex
   */
  let budMeshes = [];
  function buildBuds() {
    const budMat = new THREE.MeshStandardMaterial({
      color: 0x388e3c,
      roughness: 0.45,
      metalness: 0.1
    });

    const budOffsets = [
      { pos: new THREE.Vector3(-0.42, 5.35, -0.28), rot: new THREE.Euler(0.4, 0.2, 0.55) },
      { pos: new THREE.Vector3(0.38, 5.45, -0.22), rot: new THREE.Euler(0.32, -0.42, -0.48) }
    ];

    budOffsets.forEach((b) => {
      const budGroup = new THREE.Group();
      budGroup.position.copy(b.pos);
      budGroup.rotation.copy(b.rot);

      const coneGeo = new THREE.ConeGeometry(0.19, 0.95, 14);
      coneGeo.translate(0, 0.47, 0);
      const cone = new THREE.Mesh(coneGeo, budMat);
      budGroup.add(cone);

      budGroup.scale.set(0.001, 0.001, 0.001);
      lilyRootGroup.add(budGroup);
      budMeshes.push(budGroup);
    });
  }

  /**
   * Generates a "Perfect Looking" Stargazer Lily Flower Head:
   * - 6 Recurved Petals (3 wide inner petals + 3 outer sepals)
   * - High-definition bump map, ruffled edges, deep keel, and organic recurve
   * - 6 Fountain arching filaments + golden-orange rocking anthers + 3-lobed stigma
   * - Invisible Raycast Hit Sphere for wish interaction
   */
  function createStargazerFlowerHead(flowerIndex, attachPos, orientation) {
    const flowerGroup = new THREE.Group();
    flowerGroup.position.copy(attachPos);
    flowerGroup.rotation.copy(orientation);
    lilyRootGroup.add(flowerGroup);

    // Branching pedicel (flower stem)
    const pedicelGeo = new THREE.CylinderGeometry(0.075, 0.095, 0.75, 10);
    pedicelGeo.translate(0, -0.37, 0);
    const pedicelMat = new THREE.MeshStandardMaterial({ color: 0x245a1b, roughness: 0.45 });
    const pedicel = new THREE.Mesh(pedicelGeo, pedicelMat);
    flowerGroup.add(pedicel);

    // Receptacle / calyx base
    const recepGeo = new THREE.CylinderGeometry(0.12, 0.08, 0.28, 12);
    recepGeo.translate(0, -0.14, 0);
    const recep = new THREE.Mesh(recepGeo, pedicelMat);
    flowerGroup.add(recep);

    // Containers for Wireframe vs Organic Petals
    const wireframeGroup = new THREE.Group();
    const organicGroup = new THREE.Group();
    flowerGroup.add(wireframeGroup);
    flowerGroup.add(organicGroup);

    const petalsData = [];

    // Materials
    const wireframeMat = new THREE.MeshBasicMaterial({
      color: CONFIG.colors.wireframePink,
      wireframe: true,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });

    const organicMat = new THREE.MeshStandardMaterial({
      map: petalSharedTexture,
      bumpMap: petalSharedBumpMap,
      bumpScale: 0.038,
      roughness: 0.35,
      metalness: 0.04,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      depthWrite: true
    });

    // 6 Stargazer Petals:
    // Inner Whorl: 0, 120, 240 deg (broader, slightly elevated to layer naturally inside sepals)
    // Outer Whorl: 60, 180, 300 deg (slender sepals)
    for (let p = 0; p < 6; p++) {
      const isInner = p % 2 === 0;
      const angle = (p * 60) * (Math.PI / 180);
      const width = isInner ? 1.42 : 1.12;
      const length = isInner ? 3.90 : 3.65;

      const { geometry, updateBloomGeometry } = createPerfectPetalGeometry(length, width, isInner);

      // Wireframe Petal
      const wfMesh = new THREE.Mesh(geometry.clone(), wireframeMat.clone());
      wfMesh.rotation.y = angle;
      if (isInner) {
        wfMesh.position.y = 0.06;
      }
      wireframeGroup.add(wfMesh);

      // Organic Shaded Petal
      const orgMesh = new THREE.Mesh(geometry, organicMat.clone());
      orgMesh.rotation.y = angle;
      if (isInner) {
        orgMesh.position.y = 0.06;
      }
      organicGroup.add(orgMesh);

      petalsData.push({
        wfMesh: wfMesh,
        orgMesh: orgMesh,
        updateGeo: updateBloomGeometry,
        angle: angle,
        isInner: isInner
      });
    }

    // Stamens & Pistil (Reproductive Center)
    const stamensData = createStamensAndPistil(flowerGroup);

    // Invisible Raycast Hit Sphere for wish interaction
    const hitSphereGeo = new THREE.SphereGeometry(1.8, 8, 8);
    const hitSphereMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitSphereGeo, hitSphereMat);
    hitMesh.userData = { flowerIndex: flowerIndex };
    flowerGroup.add(hitMesh);

    flowerGroup.scale.set(0.001, 0.001, 0.001);

    /**
     * Updates this flower head across the 4 animation phases:
     */
    function updateFlowerBloom(growthProgress) {
      if (growthProgress < 0.2) {
        flowerGroup.scale.set(0.001, 0.001, 0.001);
        return;
      }

      // Emergence scale from 0.2 to 0.4
      const appearFactor = THREE.MathUtils.clamp((growthProgress - 0.2) / 0.2, 0, 1);
      const easeAppear = 1 - Math.pow(1 - appearFactor, 3);
      flowerGroup.scale.setScalar(easeAppear);

      // Bloom factor (petals unfurl from 0.25 to 0.85)
      const bloomFactor = THREE.MathUtils.clamp((growthProgress - 0.25) / 0.6, 0, 1);
      const smoothBloom = THREE.MathUtils.smoothstep(bloomFactor, 0, 1);

      // Update petal vertex curves
      petalsData.forEach((pd) => {
        pd.updateGeo(pd.wfMesh.geometry, smoothBloom, pd.isInner);
        pd.updateGeo(pd.orgMesh.geometry, smoothBloom, pd.isInner);
      });

      // Phase 2 (20% - 65%): Wireframe Construction
      let wfOpacity = 0;
      if (growthProgress >= 0.20 && growthProgress < 0.45) {
        wfOpacity = THREE.MathUtils.clamp((growthProgress - 0.20) / 0.15, 0, 0.9);
      } else if (growthProgress >= 0.45 && growthProgress <= 0.65) {
        wfOpacity = THREE.MathUtils.clamp((0.65 - growthProgress) / 0.20, 0, 0.9);
      } else {
        wfOpacity = 0.0;
      }

      petalsData.forEach((pd) => {
        pd.wfMesh.material.opacity = wfOpacity;
        pd.wfMesh.visible = wfOpacity > 0.02;
      });

      // Phase 3 (35% - 100%): Organic Materialization
      // Gracefully materializes from 35% and reaches full 100% opacity by 58%
      let orgOpacity = 0;
      if (growthProgress >= 0.35 && growthProgress < 0.58) {
        orgOpacity = THREE.MathUtils.clamp((growthProgress - 0.35) / 0.23, 0, 1.0);
      } else if (growthProgress >= 0.58) {
        orgOpacity = 1.0;
      } else {
        orgOpacity = 0.0;
      }

      petalsData.forEach((pd) => {
        pd.orgMesh.material.opacity = orgOpacity;
        pd.orgMesh.visible = orgOpacity > 0.01;
      });

      // Stamens emergence
      stamensData.updateStamens(smoothBloom, orgOpacity);
    }

    return {
      group: flowerGroup,
      hitMesh: hitMesh,
      flowerIndex: flowerIndex,
      updateBloom: updateFlowerBloom,
      worldPos: new THREE.Vector3()
    };
  }

  /**
   * Generates dynamic "Perfect Looking" Stargazer Lily Petal 3D Surface
   * Computes signature recurved curling (curling outward & rolling backwards at tips)
   */
  function createPerfectPetalGeometry(length = 3.85, maxWidth = 1.35, isInner = true) {
    const geo = new THREE.BufferGeometry();
    const segsU = 34; // Longitudinal (base to tip)
    const segsV = 16; // Transverse (left to right)
    const totalVerts = (segsU + 1) * (segsV + 1);

    const positions = new Float32Array(totalVerts * 3);
    const uvs = new Float32Array(totalVerts * 2);
    const indices = [];

    // Precalculate UV coordinates
    let uvIdx = 0;
    for (let i = 0; i <= segsU; i++) {
      const u = i / segsU;
      for (let j = 0; j <= segsV; j++) {
        const v = j / segsV;
        uvs[uvIdx++] = v;
        uvs[uvIdx++] = u;
      }
    }

    // Grid triangles
    const rowSize = segsV + 1;
    for (let i = 0; i < segsU; i++) {
      for (let j = 0; j < segsV; j++) {
        const a = i * rowSize + j;
        const b = (i + 1) * rowSize + j;
        const c = (i + 1) * rowSize + (j + 1);
        const d = i * rowSize + (j + 1);
        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    function calculateVertices(targetGeometry, bloom, isInner) {
      const posAttr = targetGeometry.attributes.position;
      const array = posAttr.array;
      let ptr = 0;

      for (let i = 0; i <= segsU; i++) {
        const u = i / segsU; // 0 = base, 1 = tip

        // 1. Bud path: slender, upright, closed chalice anchored at (0,0,0)
        const rBud = Math.sin(u * Math.PI) * 0.36 * (1 - u * 0.28) + u * 0.12;
        const yBud = u * length * 0.95;

        // 2. Bloom path: outward flare with classic Stargazer recurved tip
        // Rises to peak crown at u ~ 0.45, then arches outward and curls downward at tip
        const rBloom = Math.sin(u * 1.62) * length * 0.96 - Math.pow(u, 3.2) * length * 0.14;
        const yBloom = Math.sin(u * Math.PI * 0.68) * length * 0.46 - Math.pow(u, 2.5) * length * 0.68;

        // Smooth transition between bud and bloom
        const archR = THREE.MathUtils.lerp(rBud, rBloom, bloom);
        const archY = THREE.MathUtils.lerp(yBud, yBloom, bloom);

        // 3. Width profile: narrow claw base (u=0), wide graceful mid-petal, sharp tip
        const widthCurve = Math.sin(Math.pow(u, 0.68) * Math.PI);
        const curWidth = THREE.MathUtils.lerp(maxWidth * 0.3, maxWidth, bloom) * widthCurve;

        for (let j = 0; j <= segsV; j++) {
          const vNorm = (j / segsV) * 2 - 1; // -1 to +1

          // Transverse width displacement
          const x = vNorm * (curWidth * 0.5);

          // Deep V-shaped keel trough along the midrib vein (anchors cleanly at base u=0)
          const keel = (1.0 - Math.abs(vNorm)) * 0.16 * Math.sin(u * Math.PI * 0.5) * (1.0 - u * 0.4) * bloom;

          // Authentic wavy ruffled margin at outer edges
          const ruffle = Math.sin(u * 22.0) * 0.055 * Math.pow(Math.abs(vNorm), 1.5) * bloom;

          // Transform to 3D coordinate frame
          // Radial coordinate is Z, vertical is Y, lateral is X
          const r = archR + keel;
          const y = archY + ruffle - (isInner ? 0 : 0.04);
          const z = r;

          array[ptr++] = x;
          array[ptr++] = y;
          array[ptr++] = z;
        }
      }

      posAttr.needsUpdate = true;
      targetGeometry.computeVertexNormals();
    }

    calculateVertices(geo, 0.0, isInner);

    return {
      geometry: geo,
      updateBloomGeometry: calculateVertices
    };
  }

  /**
   * Generates 6 curved stamens with golden-orange anthers and 1 central pistil
   */
  function createStamensAndPistil(flowerGroup) {
    const centerGroup = new THREE.Group();
    flowerGroup.add(centerGroup);

    const stamens = [];

    const filamentMat = new THREE.MeshStandardMaterial({
      color: 0xdcedc8,
      roughness: 0.28,
      metalness: 0.08
    });

    const antherMat = new THREE.MeshStandardMaterial({
      color: CONFIG.colors.antherOrange,
      roughness: 0.65,
      bumpScale: 0.06
    });

    // 6 Stamens (Filaments arching outward)
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 + 30) * (Math.PI / 180);
      const stamenGroup = new THREE.Group();
      stamenGroup.rotation.y = angle;

      const filGeo = new THREE.CylinderGeometry(0.026, 0.038, 2.1, 10);
      filGeo.translate(0, 1.05, 0);
      const filMesh = new THREE.Mesh(filGeo, filamentMat);
      filMesh.rotation.x = 0.25;
      stamenGroup.add(filMesh);

      // Anther (rocking T-shaped pollen capsule attached to filament tip)
      const antherGeo = new THREE.BoxGeometry(0.14, 0.09, 0.44);
      const antherMesh = new THREE.Mesh(antherGeo, antherMat);
      antherMesh.rotation.x = Math.PI / 2;
      antherMesh.rotation.z = (Math.random() - 0.5) * 0.45;
      stamenGroup.add(antherMesh);

      centerGroup.add(stamenGroup);
      stamens.push({ group: stamenGroup, fil: filMesh, anther: antherMesh });
    }

    // 1 Central Pistil (longer style + 3-lobed stigma)
    const pistilMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.35 });
    const styleGeo = new THREE.CylinderGeometry(0.045, 0.055, 2.5, 10);
    styleGeo.translate(0, 1.25, 0);
    const styleMesh = new THREE.Mesh(styleGeo, pistilMat);
    styleMesh.rotation.x = 0.06;
    centerGroup.add(styleMesh);

    // 3-lobed Stigma at tip
    const stigmaGeo = new THREE.SphereGeometry(0.14, 10, 10);
    stigmaGeo.scale(1.25, 0.85, 1.25);
    const stigmaMesh = new THREE.Mesh(stigmaGeo, new THREE.MeshStandardMaterial({ color: 0x1b5e20, roughness: 0.2 }));
    stigmaMesh.position.set(0, 2.55, 0.15);
    centerGroup.add(stigmaMesh);

    centerGroup.scale.set(0.001, 0.001, 0.001);

    function updateStamens(bloom, opacity) {
      if (bloom < 0.2) {
        centerGroup.scale.set(0.001, 0.001, 0.001);
        return;
      }
      const scale = THREE.MathUtils.clamp((bloom - 0.2) / 0.8, 0, 1);
      centerGroup.scale.setScalar(scale);

      const rotX = 0.16 + scale * 0.38;
      const filLength = 2.1;
      const tipY = Math.cos(rotX) * filLength;
      const tipZ = Math.sin(rotX) * filLength;

      stamens.forEach((st) => {
        st.fil.rotation.x = rotX;
        st.anther.position.set(0, tipY, tipZ);
      });
    }

    return {
      group: centerGroup,
      updateStamens: updateStamens
    };
  }

  // ==========================================================================
  // Celestial Lunar Halo (Dedicated to Nusrat Jahan Sadia)
  // ==========================================================================
  function setupLunarHalo() {
    const moonGeo = new THREE.PlaneGeometry(9.6, 9.6);
    const moonMat = new THREE.MeshBasicMaterial({
      map: createMoonTexture(),
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    lunarHaloMesh = new THREE.Mesh(moonGeo, moonMat);
    lunarHaloMesh.position.set(0, 3.8, -4.6);
    scene.add(lunarHaloMesh);
  }

  // ==========================================================================
  // Growth Animation Timeline Controller (0s - 10s+)
  // ==========================================================================
  function updateAnimationTimeline(delta) {
    if (STATE.isPlaying && STATE.progress < 1.0) {
      STATE.progress += delta / CONFIG.animationDuration;
      if (STATE.progress >= 1.0) {
        STATE.progress = 1.0;
        STATE.isPlaying = false;
        onBloomComplete();
      }
    } else if (STATE.progress >= 1.0 && !STATE.isComplete) {
      onBloomComplete();
    }

    const p = STATE.progress;
    const percentStr = (p * 100).toFixed(3) + '%';
    progressPercentEl.textContent = percentStr;
    progressBarFillEl.style.width = percentStr;

    // Stage State Transitions & HUD Updates
    if (p < 0.25) {
      if (STATE.currentStage !== 1) {
        STATE.currentStage = 1;
        stageStatusEl.textContent = 'STAGE 1: SPROUTING STEM & Foliage';
        stageStatusEl.style.color = '#5cb85c';
      }
      const stemP = p / 0.25;
      const easeStem = 1 - Math.pow(1 - stemP, 3);
      stemMesh.scale.y = Math.max(0.001, easeStem);
      stemMesh.position.y = -5.2 + (easeStem * 5.0) - 5.0;

      foliageMeshes.forEach((f) => {
        if (stemP >= f.triggerT) {
          const leafGrowP = (stemP - f.triggerT) / (1 - f.triggerT);
          const s = Math.min(1.0, leafGrowP * 1.5) * f.targetScale;
          f.mesh.scale.set(s, s, s);
        } else {
          f.mesh.scale.set(0.001, 0.001, 0.001);
        }
      });

      budMeshes.forEach((b) => {
        if (stemP > 0.8) {
          const bp = (stemP - 0.8) / 0.2;
          b.scale.setScalar(bp);
        }
      });
    } else if (p < 0.55) {
      if (STATE.currentStage !== 2) {
        STATE.currentStage = 2;
        stageStatusEl.textContent = 'STAGE 2: GENERATING PETAL WIREFRAME MESH';
        stageStatusEl.style.color = '#ff80ab';
      }
      stemMesh.scale.y = 1.0;
      stemMesh.position.y = 0;
      foliageMeshes.forEach((f) => f.mesh.scale.setScalar(f.targetScale));
      budMeshes.forEach((b) => b.scale.setScalar(1.0));
    } else if (p < 0.85) {
      if (STATE.currentStage !== 3) {
        STATE.currentStage = 3;
        stageStatusEl.textContent = 'STAGE 3: RENDERING ORGANIC BLOOM & STAMENS';
        stageStatusEl.style.color = '#ff4081';
      }
    } else {
      if (STATE.currentStage !== 4) {
        STATE.currentStage = 4;
        stageStatusEl.textContent = 'STAGE 4: BLOOMING COMPLETE — FOR NUSRAT JAHAN SADIA';
        stageStatusEl.style.color = '#ffd54f';
      }
    }

    flowerHeads.forEach((fh) => {
      fh.updateBloom(p);
    });

    if (p >= 0.85 && lunarHaloMesh) {
      const moonP = (p - 0.85) / 0.15;
      lunarHaloMesh.material.opacity = moonP * 0.78;
    }
  }

  function onBloomComplete() {
    STATE.isComplete = true;
    unlockContainer.classList.remove('hidden');

    // Auto-play the Happy Birthday melody if user enabled audio or trigger audio
    if (STATE.audioEnabled) {
      playHappyBirthdayMelody();
    }
  }

  // ==========================================================================
  // Idle Breeze Sway & Ambient Simulation
  // ==========================================================================
  function updateIdleAnimation(time) {
    if (!lilyRootGroup) return;

    const swayFactor = STATE.progress > 0.3 ? 1.0 : STATE.progress / 0.3;
    const breeze = Math.sin(time * CONFIG.idleSwaySpeed) * 0.045 * swayFactor;
    const breezeCross = Math.cos(time * (CONFIG.idleSwaySpeed * 0.7)) * 0.028 * swayFactor;

    lilyRootGroup.rotation.z = breeze;
    lilyRootGroup.rotation.x = breezeCross;

    if (lunarHaloMesh && STATE.progress >= 0.85) {
      const pulse = 1.0 + Math.sin(time * 1.5) * 0.045;
      lunarHaloMesh.scale.set(pulse, pulse, 1.0);
    }

    if (fireflyParticles && fireflyPositions) {
      const positions = fireflyParticles.geometry.attributes.position.array;
      for (let i = 0; i < fireflyVelocities.length; i++) {
        const idx = i * 3;
        const vel = fireflyVelocities[i];

        positions[idx] += vel.vx + Math.sin(time + vel.phase) * 0.006;
        positions[idx + 1] += vel.vy;
        positions[idx + 2] += vel.vz + Math.cos(time + vel.phase) * 0.006;

        if (positions[idx + 1] > 8.5) {
          positions[idx + 1] = -5.5;
          positions[idx] = (Math.random() - 0.5) * 12;
        }
      }
      fireflyParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ==========================================================================
  // Interactive Camera & Parallax
  // ==========================================================================
  function onMouseMove(e) {
    STATE.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    STATE.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
    mouseVector.x = STATE.mouse.targetX;
    mouseVector.y = STATE.mouse.targetY;

    if (hudCoordsEl) {
      const degX = (STATE.mouse.targetY * 12).toFixed(1);
      const degY = (STATE.mouse.targetX * 18).toFixed(1);
      hudCoordsEl.textContent = `ROT: X ${degX >= 0 ? '+' : ''}${degX}° Y ${degY >= 0 ? '+' : ''}${degY}°`;
    }

    checkFlowerRaycast(false);
    updateCard3DTilt(e.clientX, e.clientY);
  }

  function onTouchMove(e) {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      STATE.mouse.targetX = (touch.clientX / window.innerWidth) * 2 - 1;
      STATE.mouse.targetY = -(touch.clientY / window.innerHeight) * 2 + 1;
      mouseVector.x = STATE.mouse.targetX;
      mouseVector.y = STATE.mouse.targetY;
      updateCard3DTilt(touch.clientX, touch.clientY);
    }
  }

  /**
   * Interactive 3D Card Tilt & Glare Parallax (Extraordinary Aesthetic)
   */
  function updateCard3DTilt(clientX, clientY) {
    if (!STATE.isPanelOpen || !tiltGlassCard) return;

    const rect = tiltGlassCard.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (x >= -50 && x <= rect.width + 50 && y >= -50 && y <= rect.height + 50) {
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -6; // Max 6 deg tilt
      const rotateY = ((x - centerX) / centerX) * 8;

      tiltGlassCard.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;

      const glare = tiltGlassCard.querySelector('.card-glare');
      if (glare) {
        const pctX = (x / rect.width) * 100;
        const pctY = (y / rect.height) * 100;
        glare.style.background = `radial-gradient(circle at ${pctX}% ${pctY}%, rgba(255, 255, 255, 0.18) 0%, transparent 60%)`;
      }
    } else {
      tiltGlassCard.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    }
  }

  function updateCameraParallax(delta) {
    STATE.mouse.x += (STATE.mouse.targetX - STATE.mouse.x) * 0.05;
    STATE.mouse.y += (STATE.mouse.targetY - STATE.mouse.y) * 0.05;

    // Smoothly glide camera from stem growth framing (y=2.2) to full flower bloom framing (y=3.3)
    const baseCamY = THREE.MathUtils.lerp(2.2, 3.3, STATE.progress);
    const targetX = (STATE.isPanelOpen ? CONFIG.cameraShiftX : 0) + STATE.mouse.x * 0.85;
    const targetY = baseCamY + STATE.mouse.y * 0.65;
    const targetZ = CONFIG.cameraBaseZ;

    camera.position.x += (targetX - camera.position.x) * 0.06;
    camera.position.y += (targetY - camera.position.y) * 0.06;
    camera.position.z += (targetZ - camera.position.z) * 0.06;

    const lookTargetY = THREE.MathUtils.lerp(2.0, 3.4, STATE.progress);
    camera.lookAt(STATE.isPanelOpen ? -1.1 : 0, lookTargetY, 0);

    if (starParticles) {
      starParticles.position.x = -STATE.mouse.x * 0.8;
      starParticles.position.y = -STATE.mouse.y * 0.6;
    }
  }

  // ==========================================================================
  // Interactive Wish Nodes (Raycasting on Flowers)
  // ==========================================================================
  function checkFlowerRaycast(isClick = false) {
    if (STATE.progress < 0.5) return;

    raycaster.setFromCamera(mouseVector, camera);
    const hitMeshes = flowerHeads.map(fh => fh.hitMesh);
    const intersects = raycaster.intersectObjects(hitMeshes, false);

    if (intersects.length > 0) {
      container.style.cursor = 'pointer';
      const flowerIdx = intersects[0].object.userData.flowerIndex;

      if (isClick || STATE.activeFlowerIndex !== flowerIdx) {
        showFlowerWishTooltip(flowerIdx);
        triggerParticleBurstAtFlower(flowerHeads[flowerIdx].group);
        // Note: Happy Birthday music plays continuously without random note disruption
      }
    } else {
      container.style.cursor = 'grab';
      if (isClick && !flowerTooltip.classList.contains('hidden')) {
        hideFlowerWishTooltip();
      }
    }
  }

  function showFlowerWishTooltip(index) {
    STATE.activeFlowerIndex = index;
    const wish = FLOWER_WISHES[index];
    if (!wish) return;

    tooltipText.textContent = wish.text;
    document.querySelector('.tooltip-flower-id').textContent = wish.id;

    const flower = flowerHeads[index];
    const worldPos = new THREE.Vector3();
    flower.group.getWorldPosition(worldPos);
    worldPos.y += 1.4;

    const screenPos = worldPos.clone().project(camera);
    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-(screenPos.y * 0.5) + 0.5) * window.innerHeight;

    flowerTooltip.style.left = `${Math.max(160, Math.min(window.innerWidth - 160, x))}px`;
    flowerTooltip.style.top = `${Math.max(80, y)}px`;
    flowerTooltip.classList.remove('hidden');
  }

  function hideFlowerWishTooltip() {
    flowerTooltip.classList.add('hidden');
    STATE.activeFlowerIndex = -1;
  }

  function onCanvasClick(e) {
    if (e.target.closest('#message-panel') || e.target.closest('.hud-audio-btn') || e.target.closest('.glass-btn')) {
      return;
    }
    checkFlowerRaycast(true);
  }

  function triggerParticleBurstAtFlower(targetGroup) {
    const worldPos = new THREE.Vector3();
    targetGroup.getWorldPosition(worldPos);

    if (fireflyParticles && fireflyPositions) {
      const positions = fireflyParticles.geometry.attributes.position.array;
      for (let i = 0; i < 45; i++) {
        const idx = (i * 7) % fireflyVelocities.length;
        const pIdx = idx * 3;
        positions[pIdx] = worldPos.x + (Math.random() - 0.5) * 0.9;
        positions[pIdx + 1] = worldPos.y + (Math.random() - 0.5) * 0.9;
        positions[pIdx + 2] = worldPos.z + (Math.random() - 0.5) * 0.9;

        fireflyVelocities[idx].vy = 0.06 + Math.random() * 0.07;
        fireflyVelocities[idx].vx = (Math.random() - 0.5) * 0.09;
      }
      fireflyParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ==========================================================================
  // Birthday Experience UI & Message Reveal
  // ==========================================================================
  function setupUIEventListeners() {
    // 1. Celestial Audio Autoplay Unlock Overlay
    const unlockOverlay = document.getElementById('audio-unlock-overlay');
    const unlockAudioBtn = document.getElementById('audio-unlock-btn');

    function dismissAndStartAudio(e) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      if (unlockOverlay) {
        unlockOverlay.classList.add('dismissed');
      }
      STATE.audioEnabled = true;
      initAudio();
      if (audioCtx) {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().then(() => {
            playHappyBirthdayMelody();
          }).catch(() => {
            playHappyBirthdayMelody();
          });
        } else if (!STATE.isBirthdaySongPlaying) {
          playHappyBirthdayMelody();
        }
      }
    }

    if (unlockOverlay) {
      unlockOverlay.addEventListener('click', dismissAndStartAudio);
    }
    if (unlockAudioBtn) {
      unlockAudioBtn.addEventListener('click', dismissAndStartAudio);
    }

    // 2. Audio Stop / Resume Toggles (Top HUD button and Message Card button)
    const audioToggleBtn = document.getElementById('audio-toggle');
    if (audioToggleBtn) {
      audioToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAudio();
      });
    }

    const cardAudioToggleBtn = document.getElementById('card-audio-toggle');
    if (cardAudioToggleBtn) {
      cardAudioToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAudio();
      });
    }

    // 3. Global click/gesture fallback to ensure music starts on very first interaction
    const startAudioEvents = ['click', 'touchstart', 'keydown'];
    const onFirstUserAction = (e) => {
      dismissAndStartAudio(e);
      startAudioEvents.forEach(evt => window.removeEventListener(evt, onFirstUserAction));
    };
    startAudioEvents.forEach(evt => window.addEventListener(evt, onFirstUserAction, { passive: true, once: true }));

    // Unlock 3rd November Message Button
    unlockBtn.addEventListener('click', openMessagePanel);

    // Close Panel Button
    closePanelBtn.addEventListener('click', closeMessagePanel);

    // Version Toggle Tabs
    tabPolished.addEventListener('click', () => switchTab('polished'));
    tabRaw.addEventListener('click', () => switchTab('raw'));

    // Campus Tour Request Button
    tourBtn.addEventListener('click', acceptCampusTour);

    // Replay Bloom Animation Button
    replayBtn.addEventListener('click', replayBloom);

    // Dismiss tooltip on tooltip click
    flowerTooltip.addEventListener('click', hideFlowerWishTooltip);
  }

  function openMessagePanel() {
    STATE.isPanelOpen = true;
    messagePanel.classList.remove('hidden');
    unlockContainer.classList.add('hidden');
    hideFlowerWishTooltip();

    // Trigger illuminated paragraph reveal
    triggerTypewriterReveal();

    // Ensure music box is playing smoothly
    ensureAudioPlaying();
  }

  function closeMessagePanel() {
    STATE.isPanelOpen = false;
    messagePanel.classList.add('hidden');
    unlockContainer.classList.remove('hidden');
  }

  function triggerTypewriterReveal() {
    const paragraphs = contentPolished.querySelectorAll('.typewriter-p');
    paragraphs.forEach((p, idx) => {
      p.classList.remove('revealed');
      setTimeout(() => {
        p.classList.add('revealed');
      }, 80 + idx * 140);
    });
  }

  function switchTab(type) {
    if (type === 'polished') {
      tabPolished.classList.add('active');
      tabRaw.classList.remove('active');
      contentPolished.classList.remove('hidden');
      contentRaw.classList.add('hidden');
      triggerTypewriterReveal();
    } else {
      tabRaw.classList.add('active');
      tabPolished.classList.remove('active');
      contentRaw.classList.remove('hidden');
      contentPolished.classList.add('hidden');
    }
  }

  function acceptCampusTour() {
    STATE.tourAccepted = true;
    tourBtn.classList.add('accepted');
    tourBtnText.textContent = "🎉 Campus Tour Officially Scheduled! In Sha Allah!";

    launchConfettiCelebration();

    // Celebratory music fanfare
    if (audioCtx) {
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, idx) => {
        playMusicBoxNote(f, now + idx * 0.12, 1.8, 0.22);
      });
    }
  }

  function replayBloom() {
    closeMessagePanel();
    STATE.progress = 0.0;
    STATE.isPlaying = true;
    STATE.isComplete = false;
    STATE.currentStage = 1;

    stemMesh.scale.set(1, 0.001, 1);
    stemMesh.position.y = -5.2;
    foliageMeshes.forEach(f => f.mesh.scale.setScalar(0.001));
    flowerHeads.forEach(fh => fh.updateBloom(0.0));
    if (lunarHaloMesh) lunarHaloMesh.material.opacity = 0;

    // Keep Happy Birthday melody playing continuously
    ensureAudioPlaying();
  }

  // ==========================================================================
  // Celebratory 2D Petal & Confetti Explosion Canvas
  // ==========================================================================
  let confettiParticles = [];
  let confettiAnimId = null;

  function launchConfettiCelebration() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
    const ctx = confettiCanvas.getContext('2d');

    const colors = ['#ff4081', '#ff80ab', '#ffd54f', '#ffffff', '#e91e63', '#a5d6a7'];
    confettiParticles = [];

    // Spawn 160 celebratory petals and glistening stars
    for (let i = 0; i < 160; i++) {
      confettiParticles.push({
        x: window.innerWidth * (0.3 + Math.random() * 0.4),
        y: window.innerHeight * 0.6,
        vx: (Math.random() - 0.5) * 18,
        vy: -11 - Math.random() * 15,
        size: 8 + Math.random() * 14,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.22,
        gravity: 0.35 + Math.random() * 0.25,
        drag: 0.98,
        isPetal: Math.random() > 0.35
      });
    }

    if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

    function renderConfetti() {
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      let aliveCount = 0;

      confettiParticles.forEach(p => {
        p.vx *= p.drag;
        p.vy += p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;

        if (p.y < confettiCanvas.height + 60) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;

          if (p.isPetal) {
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(-p.size * 0.3, -p.size * 0.3, p.size * 0.6, p.size * 0.6);
          }
          ctx.restore();
        }
      });

      if (aliveCount > 0) {
        confettiAnimId = requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
      }
    }

    renderConfetti();
  }

  // ==========================================================================
  // Resize Handler & Render Loop
  // ==========================================================================
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    updateAnimationTimeline(delta);
    updateIdleAnimation(elapsedTime);
    updateCameraParallax(delta);

    renderer.render(scene, camera);
  }

  // ==========================================================================
  // Initialization Entrypoint
  // ==========================================================================
  window.addEventListener('DOMContentLoaded', () => {
    initThree();
    setupUIEventListeners();

    // Generate and apply high-definition Stargazer Lily background to message card
    if (tiltGlassCard) {
      const flowerBgData = createCardFlowerBackground();
      tiltGlassCard.style.backgroundImage = 'url(' + flowerBgData + ')';
    }

    // Always-on audio initialization
    ensureAudioPlaying();

    if (urlParams.has('panel')) {
      const unlockOverlay = document.getElementById('audio-unlock-overlay');
      if (unlockOverlay) {
        unlockOverlay.classList.add('dismissed');
      }
      openMessagePanel();
      if (urlParams.has('scroll')) {
        const scrollArea = document.querySelector('.card-scroll-area');
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }
    }

    animate();
  });

})();
