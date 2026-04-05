const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = document.getElementById("scoreValue");
const highScoreValue = document.getElementById("highScoreValue");
const ballsValue = document.getElementById("ballsValue");
const multiplierValue = document.getElementById("multiplierValue");
const statusText = document.getElementById("statusText");

const startButton = document.getElementById("startButton");
const resetButton = document.getElementById("resetButton");
const audioButton = document.getElementById("audioButton");
const leftFlipperButton = document.getElementById("leftFlipperButton");
const rightFlipperButton = document.getElementById("rightFlipperButton");
const launchButton = document.getElementById("launchButton");

const W = canvas.width;
const H = canvas.height;
const DT = 1 / 60;
const MAX_DT = 1 / 30;
const DEG = Math.PI / 180;

const state = {
  running: false,
  audioEnabled: true,
  gameOver: false,
  score: 0,
  highScore: Number(localStorage.getItem("gangsterPinballHighScore") || 0),
  ballsLeft: 3,
  multiplier: 1,
  heatValue: 0,
  launcherCharge: 0,
  leftPressed: false,
  rightPressed: false,
  launchHeld: false,
  lastTime: 0,
  flashTimer: 0,
  cameraShake: 0,
  lampsPulse: 0,
  ballReadyTimer: 0,
  currentMessage: "Step up and press Start. Hold launch to fire the ball up the rail."
};

const ball = {
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  r: 16,
  active: false,
  inPlunger: true,
  trail: []
};

const leftFlipper = {
  side: "left",
  pivot: { x: 280, y: 1214 },
  length: 146,
  restAngle: 24 * DEG,
  activeAngle: -24 * DEG,
  angle: 24 * DEG,
  pressed: false,
  angularVelocity: 0
};

const rightFlipper = {
  side: "right",
  pivot: { x: 620, y: 1214 },
  length: 146,
  restAngle: Math.PI - 24 * DEG,
  activeAngle: Math.PI + 24 * DEG,
  angle: Math.PI - 24 * DEG,
  pressed: false,
  angularVelocity: 0
};

const bumpers = [
  { x: 275, y: 390, r: 46, color: "#b51223", score: 120, glow: 0, label: "DICE" },
  { x: 460, y: 296, r: 44, color: "#b88a34", score: 140, glow: 0, label: "CASH" },
  { x: 645, y: 395, r: 46, color: "#b51223", score: 120, glow: 0, label: "CLUB" },
  { x: 368, y: 530, r: 40, color: "#7b0d16", score: 160, glow: 0, label: "ACE" },
  { x: 555, y: 548, r: 40, color: "#c8a25c", score: 160, glow: 0, label: "BOSS" }
];

const targets = [
  { x: 206, y: 266, w: 34, h: 88, label: "777", lit: 0, score: 180 },
  { x: 694, y: 266, w: 34, h: 88, label: "$$$", lit: 0, score: 180 },
  { x: 188, y: 696, w: 32, h: 92, label: "TRK", lit: 0, score: 220 },
  { x: 712, y: 696, w: 32, h: 92, label: "TBL", lit: 0, score: 220 }
];

const spinnerLanes = [
  { x: 224, y: 472, w: 62, h: 212, lit: 0, score: 90, label: "ROLL" },
  { x: 614, y: 474, w: 62, h: 212, lit: 0, score: 90, label: "HEAT" }
];

const slings = [
  [
    { x: 182, y: 1114 },
    { x: 278, y: 1044 },
    { x: 330, y: 1118 }
  ],
  [
    { x: 718, y: 1114 },
    { x: 622, y: 1044 },
    { x: 570, y: 1118 }
  ]
];

const wallSegments = [
  { x1: 115, y1: 136, x2: 96, y2: 304 },
  { x1: 96, y1: 304, x2: 104, y2: 720 },
  { x1: 104, y1: 720, x2: 128, y2: 1018 },
  { x1: 128, y1: 1018, x2: 220, y2: 1160 },
  { x1: 787, y1: 136, x2: 804, y2: 880 },
  { x1: 804, y1: 880, x2: 804, y2: 1238 },
  { x1: 220, y1: 1160, x2: 302, y2: 1160 },
  { x1: 598, y1: 1160, x2: 680, y2: 1160 },
  { x1: 750, y1: 1240, x2: 750, y2: 168 }
];

const guides = [
  { x1: 202, y1: 1120, x2: 156, y2: 1300 },
  { x1: 698, y1: 1120, x2: 744, y2: 1300 }
];

const arcs = [
  { x: 450, y: 172, r: 345, start: Math.PI * 1.05, end: Math.PI * 1.95 }
];

let audio = null;

function makeAudioEngine() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return null;
  }

  const context = new AudioContextClass();
  const master = context.createGain();
  const musicBus = context.createGain();
  const sfxBus = context.createGain();

  master.gain.value = 0.72;
  musicBus.gain.value = 0.23;
  sfxBus.gain.value = 0.9;
  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(context.destination);

  let musicStarted = false;
  let nextMusicTime = 0;
  let musicLookAhead = 0;
  let chordIndex = 0;
  let beatIndex = 0;

  const progression = [
    { root: 110.0, third: 138.59, fifth: 164.81, seventh: 196.0, bass: 55.0 },
    { root: 123.47, third: 155.56, fifth: 185.0, seventh: 220.0, bass: 61.74 },
    { root: 130.81, third: 164.81, fifth: 196.0, seventh: 233.08, bass: 65.41 },
    { root: 98.0, third: 123.47, fifth: 146.83, seventh: 174.61, bass: 49.0 }
  ];

  function envGain(bus, start, attack, hold, release, peak) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(peak, start + attack);
    gain.gain.setValueAtTime(peak, start + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    gain.connect(bus);
    return gain;
  }

  function tone(bus, type, freq, start, duration, volume, detune = 0) {
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    const gain = envGain(bus, start, 0.01, duration * 0.35, duration * 0.65, volume);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.value = detune;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(type === "triangle" ? 900 : 1800, start);
    filter.Q.value = 1.2;

    osc.connect(filter);
    filter.connect(gain);
    osc.start(start);
    osc.stop(start + duration + 0.08);
  }

  function noiseHit(start, duration, volume, bright = false) {
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (bright ? 1 : 0.5);
    }

    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envGain(sfxBus, start, 0.002, duration * 0.15, duration * 0.75, volume);

    source.buffer = buffer;
    filter.type = bright ? "highpass" : "bandpass";
    filter.frequency.setValueAtTime(bright ? 2400 : 880, start);
    filter.Q.value = 0.9;

    source.connect(filter);
    filter.connect(gain);
    source.start(start);
    source.stop(start + duration);
  }

  function cymbal(bus, start, volume) {
    const buffer = context.createBuffer(1, context.sampleRate * 0.12, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = envGain(bus, start, 0.001, 0.01, 0.08, volume);

    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.setValueAtTime(3500, start);

    source.connect(filter);
    filter.connect(gain);
    source.start(start);
    source.stop(start + 0.12);
  }

  function brass(freq, start, duration, volume) {
    tone(musicBus, "sawtooth", freq, start, duration, volume, 6);
    tone(musicBus, "triangle", freq * 0.5, start, duration * 0.92, volume * 0.55, -4);
  }

  function pianoChord(chord, start, volume) {
    tone(musicBus, "triangle", chord.root * 2, start, 0.22, volume, 0);
    tone(musicBus, "triangle", chord.third * 2, start + 0.01, 0.2, volume * 0.88, 0);
    tone(musicBus, "triangle", chord.fifth * 2, start + 0.02, 0.18, volume * 0.8, 0);
  }

  function scheduleMusic() {
    if (!musicStarted || !state.audioEnabled) {
      return;
    }

    while (nextMusicTime < context.currentTime + 0.45) {
      const chord = progression[chordIndex % progression.length];
      const beat = beatIndex % 8;
      const beatDur = 0.42;
      const isDownbeat = beat === 0 || beat === 4;

      tone(musicBus, "triangle", chord.bass, nextMusicTime, 0.34, isDownbeat ? 0.14 : 0.09, -120);
      if (beat === 0 || beat === 2 || beat === 4 || beat === 6) {
        pianoChord(chord, nextMusicTime + 0.01, 0.05);
      }
      if (beat === 1 || beat === 5) {
        brass(chord.fifth, nextMusicTime + 0.05, 0.28, 0.045);
      }
      if (beat === 3 || beat === 7) {
        brass(chord.seventh, nextMusicTime + 0.03, 0.24, 0.036);
      }
      if (isDownbeat) {
        cymbal(musicBus, nextMusicTime + 0.03, 0.03);
        noiseHit(nextMusicTime + 0.05, 0.07, 0.03, false);
      }

      beatIndex += 1;
      if (beatIndex % 8 === 0) {
        chordIndex += 1;
      }
      nextMusicTime += beatDur;
    }

    musicLookAhead = requestAnimationFrame(scheduleMusic);
  }

  return {
    async unlock() {
      if (context.state === "suspended") {
        await context.resume();
      }
      if (!musicStarted) {
        musicStarted = true;
        nextMusicTime = context.currentTime + 0.05;
        beatIndex = 0;
        chordIndex = 0;
        cancelAnimationFrame(musicLookAhead);
        scheduleMusic();
      }
    },
    toggle(enabled) {
      state.audioEnabled = enabled;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.linearRampToValueAtTime(enabled ? 0.72 : 0.0001, context.currentTime + 0.12);
      if (enabled && musicStarted) {
        scheduleMusic();
      }
    },
    startButton() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "square", 440, now, 0.08, 0.12);
      tone(sfxBus, "square", 660, now + 0.07, 0.09, 0.1);
      tone(sfxBus, "triangle", 780, now + 0.14, 0.1, 0.08);
    },
    flipper() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      noiseHit(now, 0.04, 0.1, true);
      tone(sfxBus, "square", 260, now, 0.05, 0.08);
    },
    bumper(intensity = 1) {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 280 + intensity * 90, now, 0.1, 0.1);
      tone(sfxBus, "square", 560 + intensity * 140, now + 0.03, 0.12, 0.08);
    },
    wallHit(speed = 1) {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "square", 140 + speed * 24, now, 0.04, 0.04);
    },
    score() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 520, now, 0.08, 0.06);
      tone(sfxBus, "triangle", 780, now + 0.05, 0.08, 0.05);
    },
    launch(power) {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "sawtooth", 160 + power * 130, now, 0.12, 0.08);
      noiseHit(now + 0.02, 0.08, 0.07, true);
    },
    loseBall() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 260, now, 0.12, 0.1);
      tone(sfxBus, "triangle", 220, now + 0.12, 0.14, 0.09);
      tone(sfxBus, "triangle", 164, now + 0.25, 0.18, 0.08);
    },
    gameOver() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 330, now, 0.15, 0.08);
      tone(sfxBus, "triangle", 247, now + 0.16, 0.18, 0.08);
      tone(sfxBus, "triangle", 196, now + 0.34, 0.32, 0.08);
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function addScore(points, reason) {
  const payout = Math.round(points * state.multiplier);
  state.score += payout;
  state.heatValue = clamp(state.heatValue + points * 0.012, 0, 320);
  state.multiplier = 1 + Math.floor(state.heatValue / 90);
  state.flashTimer = 0.22;
  updateHud();
  setStatus(`${reason} pays ${payout.toLocaleString()}. Keep the heat alive.`);
  if (audio) {
    audio.score();
  }
}

function updateHud() {
  scoreValue.textContent = state.score.toLocaleString();
  highScoreValue.textContent = state.highScore.toLocaleString();
  ballsValue.textContent = state.ballsLeft.toString();
  multiplierValue.textContent = `x${state.multiplier}`;
}

function setStatus(text) {
  state.currentMessage = text;
  statusText.textContent = text;
}

function resetBallToPlunger() {
  ball.x = 748;
  ball.y = 1184;
  ball.vx = 0;
  ball.vy = 0;
  ball.active = true;
  ball.inPlunger = true;
  ball.trail.length = 0;
  state.launcherCharge = 0;
  state.ballReadyTimer = 0.4;
}

function startGame() {
  if (!audio) {
    audio = makeAudioEngine();
  }
  if (audio) {
    audio.unlock();
    audio.startButton();
  }

  state.running = true;
  state.gameOver = false;
  state.score = 0;
  state.ballsLeft = 3;
  state.multiplier = 1;
  state.heatValue = 0;
  state.cameraShake = 0;
  state.flashTimer = 0;
  leftFlipper.pressed = false;
  rightFlipper.pressed = false;
  bumpers.forEach((bumper) => {
    bumper.glow = 0;
  });
  targets.forEach((target) => {
    target.lit = 0;
  });
  spinnerLanes.forEach((lane) => {
    lane.lit = 0;
  });
  resetBallToPlunger();
  updateHud();
  setStatus("The back room is open. Hold launch and send it up the rail.");
}

function resetTable() {
  state.running = false;
  state.gameOver = false;
  state.score = 0;
  state.ballsLeft = 3;
  state.multiplier = 1;
  state.heatValue = 0;
  state.launcherCharge = 0;
  state.leftPressed = false;
  state.rightPressed = false;
  state.launchHeld = false;
  leftFlipper.pressed = false;
  rightFlipper.pressed = false;
  resetBallToPlunger();
  updateHud();
  setStatus("Table reset. Press Start when you want back in.");
}

function loseBall() {
  if (!state.running || state.gameOver) {
    return;
  }
  state.ballsLeft -= 1;
  updateHud();
  state.heatValue = Math.max(0, state.heatValue - 70);
  state.multiplier = 1 + Math.floor(state.heatValue / 90);
  if (audio) {
    audio.loseBall();
  }

  if (state.ballsLeft <= 0) {
    state.running = false;
    state.gameOver = true;
    ball.active = false;
    if (state.score > state.highScore) {
      state.highScore = state.score;
      localStorage.setItem("gangsterPinballHighScore", String(state.highScore));
    }
    updateHud();
    setStatus("Game over. The house keeps the money unless you come back hotter.");
    if (audio) {
      audio.gameOver();
    }
    return;
  }

  resetBallToPlunger();
  setStatus(`Ball drained. ${state.ballsLeft} left. Reload and try another run.`);
}

function launchBall() {
  if (!ball.inPlunger || !state.running || state.gameOver) {
    return;
  }
  const power = clamp(state.launcherCharge, 0.18, 1);
  ball.inPlunger = false;
  ball.vx = -120 - power * 110;
  ball.vy = -900 - power * 880;
  state.launcherCharge = 0;
  if (audio) {
    audio.launch(power);
  }
  setStatus("Ball launched. Work the flippers and chase the lit action.");
}

function setFlipperPressed(side, pressed) {
  if (side === "left") {
    if (leftFlipper.pressed !== pressed && pressed && audio) {
      audio.flipper();
    }
    leftFlipper.pressed = pressed;
    state.leftPressed = pressed;
  } else {
    if (rightFlipper.pressed !== pressed && pressed && audio) {
      audio.flipper();
    }
    rightFlipper.pressed = pressed;
    state.rightPressed = pressed;
  }
}

function setLaunchHeld(pressed) {
  state.launchHeld = pressed;
  if (!pressed && state.launcherCharge > 0) {
    launchBall();
  }
}

function handleKey(event, down) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowdown", " ", "enter", "a", "d", "s"].includes(key) || event.key === " ") {
    event.preventDefault();
  }

  if (key === "arrowleft" || key === "a") {
    setFlipperPressed("left", down);
  }
  if (key === "arrowright" || key === "d") {
    setFlipperPressed("right", down);
  }
  if (key === "arrowdown" || key === "s") {
    setLaunchHeld(down);
  }
  if (down && key === "enter") {
    startGame();
  }
  if (down && event.key === " ") {
    if (state.gameOver || !state.running) {
      startGame();
    }
  }
}

function pointerPress(element, onDown, onUp) {
  const release = () => {
    element.classList.remove("active");
    onUp();
  };

  element.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    element.classList.add("active");
    onDown();
  });
  element.addEventListener("pointerup", release);
  element.addEventListener("pointercancel", release);
  element.addEventListener("pointerleave", release);
}

function updateFlipper(flipper, dt) {
  const target = flipper.pressed ? flipper.activeAngle : flipper.restAngle;
  const diff = target - flipper.angle;
  const maxStep = (flipper.pressed ? 13 : 10) * dt;
  flipper.angularVelocity = clamp(diff / Math.max(dt, 0.001), -16, 16);
  flipper.angle += clamp(diff, -maxStep, maxStep);
}

function flipperTip(flipper) {
  return {
    x: flipper.pivot.x + Math.cos(flipper.angle) * flipper.length,
    y: flipper.pivot.y + Math.sin(flipper.angle) * flipper.length
  };
}

function collideCircleCircle(obj, targetX, targetY, targetRadius) {
  const dx = obj.x - targetX;
  const dy = obj.y - targetY;
  const dist = Math.hypot(dx, dy);
  const minDist = obj.r + targetRadius;
  if (dist > 0 && dist < minDist) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    obj.x += nx * overlap;
    obj.y += ny * overlap;
    const velocityAlongNormal = obj.vx * nx + obj.vy * ny;
    if (velocityAlongNormal < 0) {
      obj.vx -= 1.85 * velocityAlongNormal * nx;
      obj.vy -= 1.85 * velocityAlongNormal * ny;
    }
    return { hit: true, nx, ny, impact: Math.abs(velocityAlongNormal) };
  }
  return { hit: false };
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return {
    x: x1 + dx * t,
    y: y1 + dy * t,
    t
  };
}

function collideBallWithSegment(obj, x1, y1, x2, y2, bounce = 0.9, push = 0) {
  const closest = closestPointOnSegment(obj.x, obj.y, x1, y1, x2, y2);
  const dx = obj.x - closest.x;
  const dy = obj.y - closest.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < obj.r) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = obj.r - dist + 0.1;
    obj.x += nx * overlap;
    obj.y += ny * overlap;
    const velAlongNormal = obj.vx * nx + obj.vy * ny;
    if (velAlongNormal < 0) {
      obj.vx -= (1 + bounce) * velAlongNormal * nx;
      obj.vy -= (1 + bounce) * velAlongNormal * ny;
    }
    obj.vx += nx * push;
    obj.vy += ny * push;
    return Math.abs(velAlongNormal);
  }
  return 0;
}

function collideBallWithFlipper(flipper) {
  const tip = flipperTip(flipper);
  const impact = collideBallWithSegment(ball, flipper.pivot.x, flipper.pivot.y, tip.x, tip.y, 1.08, 0);
  if (!impact) {
    return;
  }

  const tangentX = Math.cos(flipper.angle);
  const tangentY = Math.sin(flipper.angle);
  const swing = flipper.angularVelocity * flipper.length * 0.72;
  ball.vx += tangentX * swing;
  ball.vy += tangentY * swing;

  if (flipper.side === "left" && flipper.pressed) {
    ball.vx += 70;
    ball.vy -= 160;
  }
  if (flipper.side === "right" && flipper.pressed) {
    ball.vx -= 70;
    ball.vy -= 160;
  }

  state.cameraShake = Math.max(state.cameraShake, 4);
  if (audio) {
    audio.wallHit(Math.min(3, impact / 200));
  }
}

function polygonContainsPoint(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersects = yi > point.y !== yj > point.y
      && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function updatePhysics(dt) {
  state.lampsPulse += dt * 2.4;
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  state.cameraShake = Math.max(0, state.cameraShake - dt * 12);
  state.heatValue = Math.max(0, state.heatValue - dt * 5.2);
  state.multiplier = 1 + Math.floor(state.heatValue / 90);
  updateHud();

  updateFlipper(leftFlipper, dt);
  updateFlipper(rightFlipper, dt);

  if (!state.running || !ball.active) {
    return;
  }

  if (state.ballReadyTimer > 0) {
    state.ballReadyTimer -= dt;
  }

  if (ball.inPlunger) {
    state.launcherCharge = state.launchHeld ? clamp(state.launcherCharge + dt * 0.8, 0, 1) : 0;
    ball.x = 748;
    ball.y = 1184 + state.launcherCharge * 108;
    return;
  }

  ball.vy += 840 * dt;
  ball.vx *= 0.999;
  ball.vy *= 0.9994;

  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 10) {
    ball.trail.shift();
  }

  for (const bumper of bumpers) {
    bumper.glow = Math.max(0, bumper.glow - dt * 3.5);
    const collision = collideCircleCircle(ball, bumper.x, bumper.y, bumper.r);
    if (collision.hit) {
      const boost = 260;
      ball.vx += collision.nx * boost;
      ball.vy += collision.ny * boost - 40;
      bumper.glow = 1;
      state.cameraShake = Math.max(state.cameraShake, 10);
      addScore(bumper.score, `${bumper.label} bumper`);
      if (audio) {
        audio.bumper(Math.min(1.5, collision.impact / 220));
      }
    }
  }

  for (const segment of wallSegments) {
    const impact = collideBallWithSegment(ball, segment.x1, segment.y1, segment.x2, segment.y2, 0.94, 0);
    if (impact && audio) {
      audio.wallHit(Math.min(3, impact / 180));
    }
  }

  for (const guide of guides) {
    const impact = collideBallWithSegment(ball, guide.x1, guide.y1, guide.x2, guide.y2, 0.9, 18);
    if (impact && audio) {
      audio.wallHit(impact / 180);
    }
  }

  for (const arc of arcs) {
    const dx = ball.x - arc.x;
    const dy = ball.y - arc.y;
    const angle = Math.atan2(dy, dx);
    const normalized = angle < 0 ? angle + Math.PI * 2 : angle;
    const start = arc.start < 0 ? arc.start + Math.PI * 2 : arc.start;
    const dist = Math.hypot(dx, dy);
    const target = arc.r - ball.r;
    if (normalized >= start || normalized <= (arc.end - Math.PI * 2)) {
      if (dist > target) {
        const nx = dx / dist;
        const ny = dy / dist;
        ball.x = arc.x + nx * target;
        ball.y = arc.y + ny * target;
        const velAlong = ball.vx * nx + ball.vy * ny;
        if (velAlong > 0) {
          ball.vx -= 1.82 * velAlong * nx;
          ball.vy -= 1.82 * velAlong * ny;
        }
      }
    }
  }

  collideBallWithFlipper(leftFlipper);
  collideBallWithFlipper(rightFlipper);

  for (let i = 0; i < slings.length; i += 1) {
    const sling = slings[i];
    if (polygonContainsPoint(ball, sling)) {
      ball.vy -= 280;
      ball.vx += i === 0 ? 180 : -180;
      addScore(110, "Side sling");
      state.cameraShake = Math.max(state.cameraShake, 8);
      if (audio) {
        audio.bumper(0.8);
      }
    }
  }

  for (const target of targets) {
    target.lit = Math.max(0, target.lit - dt * 2.6);
    const left = target.x - target.w / 2;
    const right = target.x + target.w / 2;
    const top = target.y - target.h / 2;
    const bottom = target.y + target.h / 2;
    const closestX = clamp(ball.x, left, right);
    const closestY = clamp(ball.y, top, bottom);
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    if (dx * dx + dy * dy < ball.r * ball.r) {
      if (Math.abs(dx) > Math.abs(dy)) {
        ball.vx *= -0.92;
        ball.x += dx > 0 ? 6 : -6;
      } else {
        ball.vy *= -0.92;
        ball.y += dy > 0 ? 6 : -6;
      }
      target.lit = 1;
      addScore(target.score, `${target.label} target`);
    }
  }

  for (const lane of spinnerLanes) {
    lane.lit = Math.max(0, lane.lit - dt * 2.2);
    if (
      ball.x > lane.x
      && ball.x < lane.x + lane.w
      && ball.y > lane.y
      && ball.y < lane.y + lane.h
    ) {
      lane.lit = 1;
      state.heatValue = clamp(state.heatValue + dt * 95, 0, 320);
      if (Math.random() < 0.08) {
        addScore(lane.score, `${lane.label} lane`);
      }
    }
  }

  if (ball.x < ball.r + 78) {
    ball.x = ball.r + 78;
    ball.vx = Math.abs(ball.vx) * 0.92;
  }
  if (ball.x > 786 - ball.r && ball.y > 130) {
    ball.x = 786 - ball.r;
    ball.vx = -Math.abs(ball.vx) * 0.92;
  }

  if (ball.y < ball.r + 102) {
    ball.y = ball.r + 102;
    ball.vy = Math.abs(ball.vy) * 0.92;
  }

  if (ball.y > H + 60) {
    loseBall();
  }

  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem("gangsterPinballHighScore", String(state.highScore));
    updateHud();
  }
}

function drawBackground() {
  ctx.clearRect(0, 0, W, H);

  const shakeX = (Math.random() - 0.5) * state.cameraShake;
  const shakeY = (Math.random() - 0.5) * state.cameraShake;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  const tableGradient = ctx.createLinearGradient(0, 0, 0, H);
  tableGradient.addColorStop(0, "#140304");
  tableGradient.addColorStop(0.38, "#090909");
  tableGradient.addColorStop(1, "#020202");
  ctx.fillStyle = tableGradient;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 230, 40, W / 2, 230, 460);
  glow.addColorStop(0, "rgba(176, 22, 33, 0.18)");
  glow.addColorStop(0.45, "rgba(176, 22, 33, 0.05)");
  glow.addColorStop(1, "rgba(176, 22, 33, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 8;
  ctx.strokeRect(22, 22, W - 44, H - 44);

  drawTableArt();
  drawUpperArch();
  drawLanes();
  drawTargets();
  drawBumpers();
  drawSlings();
  drawFlippers();
  drawBall();
  drawOverlayLights();
  drawCabinetText();

  ctx.restore();
}

function drawUpperArch() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(450, 172, 345, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 20;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(450, 172, 337, Math.PI * 1.05, Math.PI * 1.95);
  ctx.strokeStyle = "rgba(207, 24, 41, 0.62)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function drawTableArt() {
  ctx.save();

  const felt = ctx.createLinearGradient(0, 120, 0, H);
  felt.addColorStop(0, "rgba(84, 8, 14, 0.34)");
  felt.addColorStop(0.55, "rgba(18, 18, 18, 0.18)");
  felt.addColorStop(1, "rgba(3, 3, 3, 0.22)");
  ctx.fillStyle = felt;
  ctx.fillRect(92, 104, 692, 1208);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
  ctx.lineWidth = 2;
  for (let y = 170; y < 1220; y += 96) {
    ctx.beginPath();
    ctx.moveTo(132, y);
    ctx.lineTo(724, y);
    ctx.stroke();
  }

  const signGlow = 0.55 + Math.sin(state.lampsPulse * 2) * 0.12;
  ctx.fillStyle = `rgba(228, 32, 36, ${signGlow})`;
  ctx.font = "900 70px Palatino Linotype";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(187, 28, 32, 0.85)";
  ctx.shadowBlur = 28;
  ctx.fillText("NO MERCY", 450, 142);

  ctx.shadowBlur = 8;
  ctx.fillStyle = "rgba(255, 255, 255, 0.94)";
  ctx.font = "700 25px Trebuchet MS";
  ctx.fillText("HIGH STAKES  |  HOUSE RULES  |  MIDNIGHT ONLY", 450, 188);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "700 126px Palatino Linotype";
  ctx.translate(450, 728);
  ctx.rotate(-0.08);
  ctx.fillText("BOSS", 0, 0);
  ctx.rotate(0.08);
  ctx.translate(-450, -728);
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = "800 32px Palatino Linotype";
  ctx.fillText("GARBAGE RUN", 230, 668);
  ctx.fillText("CARD SHARK", 670, 668);

  ctx.strokeStyle = "rgba(177, 20, 31, 0.44)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(166, 636);
  ctx.lineTo(296, 636);
  ctx.moveTo(604, 636);
  ctx.lineTo(734, 636);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 3;
  ctx.strokeRect(110, 112, 680, 1180);

  ctx.restore();
}

function drawTargets() {
  ctx.save();
  ctx.textAlign = "center";
  for (const target of targets) {
    const glow = target.lit;
    ctx.fillStyle = `rgba(60, 5, 16, ${0.88 + glow * 0.08})`;
    ctx.strokeStyle = glow > 0
      ? "rgba(255, 211, 123, 0.95)"
      : "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = glow > 0 ? 4 : 2;
    ctx.shadowColor = glow > 0 ? "rgba(255, 69, 119, 0.8)" : "transparent";
    ctx.shadowBlur = glow > 0 ? 18 : 0;
    roundRect(target.x - target.w / 2, target.y - target.h / 2, target.w, target.h, 14, true, true);
    ctx.shadowBlur = 0;

    ctx.fillStyle = glow > 0 ? "#fff3d8" : "rgba(255, 242, 219, 0.8)";
    ctx.font = "800 22px Trebuchet MS";
    ctx.fillText(target.label, target.x, target.y + 8);
  }
  ctx.restore();
}

function drawLanes() {
  ctx.save();
  ctx.textAlign = "center";
  for (const lane of spinnerLanes) {
    const lit = lane.lit;
    ctx.fillStyle = lit > 0
      ? "rgba(177, 20, 31, 0.22)"
      : "rgba(255, 255, 255, 0.03)";
    ctx.strokeStyle = lit > 0
      ? "rgba(255, 191, 85, 0.95)"
      : "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 3;
    roundRect(lane.x, lane.y, lane.w, lane.h, 26, true, true);

    ctx.fillStyle = lit > 0 ? "#fff2d7" : "rgba(255, 242, 219, 0.65)";
    ctx.font = "800 21px Trebuchet MS";
    ctx.save();
    ctx.translate(lane.x + lane.w / 2, lane.y + lane.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(lane.label, 0, 8);
    ctx.restore();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(716, 126, 68, 1150);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 3;
  ctx.strokeRect(716, 126, 68, 1150);
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.font = "700 24px Trebuchet MS";
  ctx.fillText("PLUNGER", 750, 220);

  if (ball.inPlunger) {
    ctx.fillStyle = "rgba(246, 191, 81, 0.48)";
    ctx.fillRect(726, 1260 - state.launcherCharge * 160, 48, state.launcherCharge * 160);
  }
  ctx.restore();
}

function drawBumpers() {
  ctx.save();
  ctx.textAlign = "center";
  for (const bumper of bumpers) {
    const pulse = 0.76 + Math.sin(state.lampsPulse * 3 + bumper.x * 0.01) * 0.08;
    const glowAlpha = 0.22 + bumper.glow * 0.35;
    const outer = ctx.createRadialGradient(bumper.x, bumper.y, 14, bumper.x, bumper.y, bumper.r + 34);
    outer.addColorStop(0, `rgba(255, 255, 255, ${0.2 + bumper.glow * 0.24})`);
    outer.addColorStop(0.32, `${bumper.color}${Math.round((0.78 + bumper.glow * 0.18) * 255).toString(16).padStart(2, "0")}`);
    outer.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r + 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = bumper.color;
    ctx.shadowBlur = 24 + bumper.glow * 30;
    ctx.fillStyle = bumper.color;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255, 244, 224, ${0.94 * pulse})`;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r * 0.56, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#311015";
    ctx.font = "900 19px Trebuchet MS";
    ctx.fillText(bumper.label, bumper.x, bumper.y + 7);

    ctx.strokeStyle = `rgba(255, 255, 255, ${glowAlpha + 0.12})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r + 9, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSlings() {
  ctx.save();
  slings.forEach((sling, index) => {
    ctx.beginPath();
    ctx.moveTo(sling[0].x, sling[0].y);
    ctx.lineTo(sling[1].x, sling[1].y);
    ctx.lineTo(sling[2].x, sling[2].y);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(sling[0].x, sling[0].y, sling[1].x, sling[1].y);
    gradient.addColorStop(0, index === 0 ? "#b51223" : "#8d101a");
    gradient.addColorStop(1, "#b88a34");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  ctx.restore();
}

function drawFlippers() {
  drawSingleFlipper(leftFlipper, "#bf1d2a");
  drawSingleFlipper(rightFlipper, "#a3121e");
}

function drawSingleFlipper(flipper, color) {
  const tip = flipperTip(flipper);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineWidth = 28;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(flipper.pivot.x, flipper.pivot.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(flipper.pivot.x, flipper.pivot.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  ctx.fillStyle = "#fff0df";
  ctx.beginPath();
  ctx.arc(flipper.pivot.x, flipper.pivot.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBall() {
  if (!ball.active) {
    return;
  }

  ctx.save();
  for (let i = 0; i < ball.trail.length; i += 1) {
    const p = ball.trail[i];
    const alpha = i / ball.trail.length;
    ctx.fillStyle = `rgba(180, 25, 36, ${alpha * 0.12})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, ball.r * alpha, 0, Math.PI * 2);
    ctx.fill();
  }

  const gradient = ctx.createRadialGradient(ball.x - 4, ball.y - 8, 3, ball.x, ball.y, ball.r + 6);
  gradient.addColorStop(0, "#fffefb");
  gradient.addColorStop(0.45, "#f7dabb");
  gradient.addColorStop(1, "#b47848");
  ctx.shadowColor = "rgba(255, 240, 220, 0.7)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOverlayLights() {
  ctx.save();
  const alpha = 0.32 + Math.sin(state.lampsPulse * 4) * 0.12;
  ctx.fillStyle = `rgba(196, 28, 37, ${alpha})`;
  ctx.fillRect(110, 96, 14, 28);
  ctx.fillRect(776, 96, 14, 28);
  ctx.fillStyle = `rgba(255, 201, 104, ${alpha})`;
  ctx.fillRect(160, 98, 14, 28);
  ctx.fillRect(726, 98, 14, 28);
  ctx.fillStyle = `rgba(197, 186, 173, ${alpha * 0.82})`;
  ctx.fillRect(430, 90, 40, 14);
  ctx.restore();
}

function drawCabinetText() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
  ctx.font = "700 23px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("LEFT BANK", 128, 1018);
  ctx.textAlign = "right";
  ctx.fillText("RIGHT BANK", 772, 1018);

  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.font = "700 24px Palatino Linotype";
  ctx.fillText("HOLD TO LAUNCH", 450, 1300);

  if (state.flashTimer > 0) {
    ctx.globalAlpha = state.flashTimer * 2.4;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 42px Palatino Linotype";
    ctx.fillText(`HOT STREAK x${state.multiplier}`, 450, 96);
  }

  if (!state.running && !state.gameOver) {
    ctx.fillStyle = "rgba(8, 3, 4, 0.44)";
    roundRect(196, 578, 508, 164, 28, true, false);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 56px Palatino Linotype";
    ctx.fillText("PRESS START", 450, 648);
    ctx.font = "700 24px Trebuchet MS";
    ctx.fillText("Then hold launch and release to send the ball up the rail.", 450, 692);
  }

  if (state.gameOver) {
    ctx.fillStyle = "rgba(10, 3, 4, 0.6)";
    roundRect(182, 544, 536, 226, 30, true, false);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 64px Palatino Linotype";
    ctx.fillText("GAME OVER", 450, 626);
    ctx.font = "800 28px Trebuchet MS";
    ctx.fillText(`Final Take: ${state.score.toLocaleString()}`, 450, 672);
    ctx.fillText("Press Start for another midnight run.", 450, 714);
  }
  ctx.restore();
}

function roundRect(x, y, width, height, radius, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function loop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }

  let delta = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  delta = Math.min(delta, MAX_DT);

  updatePhysics(delta || DT);
  drawBackground();
  requestAnimationFrame(loop);
}

startButton.addEventListener("click", startGame);
resetButton.addEventListener("click", resetTable);
audioButton.addEventListener("click", async () => {
  if (!audio) {
    audio = makeAudioEngine();
  }
  if (audio) {
    await audio.unlock();
    state.audioEnabled = !state.audioEnabled;
    audio.toggle(state.audioEnabled);
  } else {
    state.audioEnabled = false;
  }
  audioButton.textContent = `Audio: ${state.audioEnabled ? "On" : "Off"}`;
  setStatus(state.audioEnabled
    ? "Audio is live. Arcade hits up front, lounge band in the back."
    : "Audio muted. The room is still dangerous, just quieter.");
});

window.addEventListener("keydown", (event) => handleKey(event, true), { passive: false });
window.addEventListener("keyup", (event) => handleKey(event, false), { passive: false });

pointerPress(leftFlipperButton, () => setFlipperPressed("left", true), () => setFlipperPressed("left", false));
pointerPress(rightFlipperButton, () => setFlipperPressed("right", true), () => setFlipperPressed("right", false));
pointerPress(launchButton, () => setLaunchHeld(true), () => setLaunchHeld(false));

updateHud();
resetBallToPlunger();
audioButton.textContent = `Audio: ${state.audioEnabled ? "On" : "Off"}`;
requestAnimationFrame(loop);
