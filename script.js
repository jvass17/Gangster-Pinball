const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreValue = document.getElementById("scoreValue");
const highScoreValue = document.getElementById("highScoreValue");
const ballsValue = document.getElementById("ballsValue");
const modeValue = document.getElementById("modeValue");
const statusText = document.getElementById("statusText");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const audioButton = document.getElementById("audioButton");
const leftFlipperButton = document.getElementById("leftFlipperButton");
const rightFlipperButton = document.getElementById("rightFlipperButton");
const launchButton = document.getElementById("launchButton");

const W = canvas.width;
const H = canvas.height;
const DEG = Math.PI / 180;
const MAX_DT = 1 / 30;

const palette = {
  white: "#fdf9ff",
  pink: "#ff4fc3",
  orange: "#ff7c3f",
  gold: "#ffd34f",
  aqua: "#41f0ff",
  lime: "#8fff4d",
  violet: "#7a4dff",
  deep: "#17052b"
};

const state = {
  running: false,
  paused: false,
  gameOver: false,
  audioEnabled: true,
  score: 0,
  highScore: Number(localStorage.getItem("neonSyndicateHighScore") || 0),
  ballsLeft: 3,
  currentMode: "Ready",
  status: "Press Start, charge the launcher, and survive the candy-bright heat.",
  lastTime: 0,
  launcherCharge: 0,
  launchHeld: false,
  lampsTime: 0,
  flashTimer: 0,
  cameraShake: 0,
  combo: 0,
  comboTimer: 0,
  sparkles: [],
  bursts: []
};

const ball = {
  x: 748,
  y: 1188,
  vx: 0,
  vy: 0,
  r: 15,
  active: true,
  inPlunger: true,
  trail: []
};

const leftFlipper = {
  pivot: { x: 282, y: 1216 },
  length: 152,
  restAngle: 25 * DEG,
  activeAngle: -24 * DEG,
  angle: 25 * DEG,
  pressed: false,
  angularVelocity: 0,
  glow: 0
};

const rightFlipper = {
  pivot: { x: 618, y: 1216 },
  length: 152,
  restAngle: Math.PI - 25 * DEG,
  activeAngle: Math.PI + 24 * DEG,
  angle: Math.PI - 25 * DEG,
  pressed: false,
  angularVelocity: 0,
  glow: 0
};

const bumpers = [
  { x: 272, y: 340, r: 44, color: palette.aqua, ring: palette.white, score: 150, glow: 0, label: "POP" },
  { x: 452, y: 290, r: 48, color: palette.orange, ring: palette.gold, score: 200, glow: 0, label: "JAM" },
  { x: 632, y: 342, r: 44, color: palette.pink, ring: palette.white, score: 150, glow: 0, label: "BLAST" },
  { x: 360, y: 516, r: 38, color: palette.lime, ring: palette.white, score: 250, glow: 0, label: "ZIP" },
  { x: 544, y: 534, r: 38, color: palette.violet, ring: palette.white, score: 250, glow: 0, label: "STAR" }
];

const targets = [
  { x: 178, y: 258, w: 40, h: 98, label: "1", color: palette.aqua, lit: 0, score: 300 },
  { x: 236, y: 238, w: 40, h: 98, label: "2", color: palette.pink, lit: 0, score: 300 },
  { x: 664, y: 238, w: 40, h: 98, label: "3", color: palette.gold, lit: 0, score: 300 },
  { x: 722, y: 258, w: 40, h: 98, label: "4", color: palette.aqua, lit: 0, score: 300 },
  { x: 188, y: 708, w: 34, h: 96, label: "RAMP", color: palette.orange, lit: 0, score: 380 },
  { x: 712, y: 708, w: 34, h: 96, label: "GLOW", color: palette.lime, lit: 0, score: 380 }
];

const rolloverLanes = [
  { x: 254, y: 174, w: 96, h: 28, lit: 0, score: 500, label: "ACE", color: palette.aqua },
  { x: 450, y: 156, w: 104, h: 28, lit: 0, score: 600, label: "SUGAR", color: palette.gold },
  { x: 646, y: 174, w: 96, h: 28, lit: 0, score: 500, label: "GLOW", color: palette.pink }
];

const sideLanes = [
  { x: 164, y: 456, w: 64, h: 278, score: 120, color: palette.aqua, lit: 0, label: "SIDE" },
  { x: 672, y: 456, w: 64, h: 278, score: 120, color: palette.lime, lit: 0, label: "RIDE" }
];

const ramps = [
  { color: palette.aqua, points: [{ x: 180, y: 980 }, { x: 212, y: 826 }, { x: 294, y: 592 }, { x: 416, y: 390 }] },
  { color: palette.pink, points: [{ x: 716, y: 982 }, { x: 688, y: 816 }, { x: 602, y: 588 }, { x: 488, y: 406 }] }
];

const slings = [
  [{ x: 188, y: 1118 }, { x: 286, y: 1046 }, { x: 338, y: 1122 }],
  [{ x: 712, y: 1118 }, { x: 614, y: 1046 }, { x: 562, y: 1122 }]
];

const wallSegments = [
  { x1: 118, y1: 134, x2: 94, y2: 322 },
  { x1: 94, y1: 322, x2: 102, y2: 814 },
  { x1: 102, y1: 814, x2: 122, y2: 1016 },
  { x1: 122, y1: 1016, x2: 216, y2: 1160 },
  { x1: 782, y1: 134, x2: 806, y2: 324 },
  { x1: 806, y1: 324, x2: 796, y2: 1100 },
  { x1: 214, y1: 1160, x2: 304, y2: 1160 },
  { x1: 596, y1: 1160, x2: 686, y2: 1160 },
  { x1: 750, y1: 1260, x2: 750, y2: 156 }
];

const guides = [
  { x1: 198, y1: 1124, x2: 154, y2: 1298 },
  { x1: 702, y1: 1124, x2: 746, y2: 1298 }
];

const topArc = { x: 450, y: 172, r: 344, start: Math.PI * 1.05, end: Math.PI * 1.95 };

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
  master.gain.value = 0.8;
  musicBus.gain.value = 0.2;
  sfxBus.gain.value = 0.9;
  musicBus.connect(master);
  sfxBus.connect(master);
  master.connect(context.destination);

  let musicStarted = false;
  let nextTime = 0;
  let beatIndex = 0;
  let loopId = 0;

  const progression = [
    { root: 196.0, third: 246.94, fifth: 293.66, bass: 98.0 },
    { root: 220.0, third: 277.18, fifth: 329.63, bass: 110.0 },
    { root: 246.94, third: 311.13, fifth: 369.99, bass: 123.47 },
    { root: 220.0, third: 261.63, fifth: 329.63, bass: 110.0 }
  ];

  function env(bus, start, attack, hold, release, amount) {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(amount, start + attack);
    gain.gain.setValueAtTime(amount, start + attack + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + attack + hold + release);
    gain.connect(bus);
    return gain;
  }

  function tone(bus, type, freq, start, duration, amount, detune = 0, lowpass = 2200) {
    const osc = context.createOscillator();
    const filter = context.createBiquadFilter();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    osc.detune.value = detune;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(lowpass, start);
    const gain = env(bus, start, 0.01, duration * 0.4, duration * 0.6, amount);
    osc.connect(filter);
    filter.connect(gain);
    osc.start(start);
    osc.stop(start + duration + 0.08);
  }

  function noise(start, duration, amount, highpass = 1800) {
    const buffer = context.createBuffer(1, Math.max(1, context.sampleRate * duration), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    const src = context.createBufferSource();
    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(highpass, start);
    const gain = env(sfxBus, start, 0.002, duration * 0.12, duration * 0.72, amount);
    src.buffer = buffer;
    src.connect(filter);
    filter.connect(gain);
    src.start(start);
    src.stop(start + duration);
  }

  function scheduleMusic() {
    if (!musicStarted || !state.audioEnabled) {
      return;
    }
    while (nextTime < context.currentTime + 0.45) {
      const beatDur = 0.24;
      const beat = beatIndex % 8;
      const chord = progression[Math.floor(beatIndex / 8) % progression.length];
      tone(musicBus, "triangle", chord.bass, nextTime, 0.18, beat === 0 || beat === 4 ? 0.1 : 0.075, -90, 900);
      if (beat % 2 === 0) {
        tone(musicBus, "triangle", chord.root, nextTime, 0.18, 0.04, 0, 1900);
        tone(musicBus, "triangle", chord.third, nextTime + 0.02, 0.16, 0.032, 0, 1900);
        tone(musicBus, "triangle", chord.fifth, nextTime + 0.04, 0.14, 0.028, 0, 1900);
      }
      if (beat === 1 || beat === 5) {
        tone(musicBus, "sawtooth", chord.fifth * 2, nextTime + 0.02, 0.14, 0.023, 6, 2400);
      }
      if (beat === 3 || beat === 7) {
        tone(musicBus, "square", chord.third * 2, nextTime + 0.03, 0.12, 0.018, 0, 1600);
      }
      if (beat % 2 === 0) {
        noise(nextTime + 0.02, 0.04, 0.016, 3200);
      }
      nextTime += beatDur;
      beatIndex += 1;
    }
    loopId = requestAnimationFrame(scheduleMusic);
  }

  return {
    async unlock() {
      if (context.state === "suspended") {
        await context.resume();
      }
      if (!musicStarted) {
        musicStarted = true;
        nextTime = context.currentTime + 0.05;
        beatIndex = 0;
        cancelAnimationFrame(loopId);
        scheduleMusic();
      }
    },
    toggle(enabled) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.linearRampToValueAtTime(enabled ? 0.8 : 0.0001, context.currentTime + 0.1);
      if (enabled) {
        scheduleMusic();
      }
    },
    start() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "square", 480, now, 0.08, 0.1);
      tone(sfxBus, "square", 720, now + 0.07, 0.08, 0.08);
      tone(sfxBus, "triangle", 960, now + 0.14, 0.1, 0.07);
    },
    flipper() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      noise(now, 0.03, 0.07, 2600);
      tone(sfxBus, "square", 230, now, 0.05, 0.06, 0, 2000);
    },
    bumper(intensity = 1) {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 260 + intensity * 120, now, 0.08, 0.08, 0, 2400);
      tone(sfxBus, "square", 620 + intensity * 160, now + 0.03, 0.1, 0.06, 0, 2200);
    },
    lane() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 700, now, 0.06, 0.05);
      tone(sfxBus, "triangle", 930, now + 0.04, 0.07, 0.045);
    },
    launch(power) {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "sawtooth", 150 + power * 130, now, 0.14, 0.06, 5, 1800);
      noise(now + 0.02, 0.06, 0.05, 2200);
    },
    wall(speed = 1) {
      if (!state.audioEnabled) {
        return;
      }
      tone(sfxBus, "square", 130 + speed * 30, context.currentTime, 0.03, 0.03, 0, 1700);
    },
    drain() {
      if (!state.audioEnabled) {
        return;
      }
      const now = context.currentTime;
      tone(sfxBus, "triangle", 240, now, 0.12, 0.08);
      tone(sfxBus, "triangle", 180, now + 0.13, 0.16, 0.07);
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setStatus(text) {
  state.status = text;
  statusText.textContent = text;
}

function setMode(text) {
  state.currentMode = text;
  modeValue.textContent = text;
}

function updateHud() {
  scoreValue.textContent = state.score.toLocaleString();
  highScoreValue.textContent = state.highScore.toLocaleString();
  ballsValue.textContent = String(state.ballsLeft);
  modeValue.textContent = state.currentMode;
}

function addBurst(x, y, color, count, speed = 280, life = 0.55) {
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.35;
    const magnitude = speed * (0.4 + Math.random() * 0.9);
    state.bursts.push({
      x,
      y,
      vx: Math.cos(angle) * magnitude,
      vy: Math.sin(angle) * magnitude,
      life,
      maxLife: life,
      size: 3 + Math.random() * 6,
      color
    });
  }
}

function addSparkleBand(x, y, color) {
  for (let i = 0; i < 12; i += 1) {
    state.sparkles.push({
      x: x + (Math.random() - 0.5) * 36,
      y: y + (Math.random() - 0.5) * 36,
      radius: 4 + Math.random() * 10,
      life: 0.4 + Math.random() * 0.45,
      maxLife: 0.4 + Math.random() * 0.45,
      color
    });
  }
}

function award(points, message, color = palette.gold) {
  let bonus = points;
  if (state.combo > 1) {
    bonus += Math.round(points * Math.min(0.45, state.combo * 0.05));
  }
  state.score += bonus;
  state.combo += 1;
  state.comboTimer = 3;
  state.flashTimer = 0.25;
  setStatus(`${message} +${bonus.toLocaleString()}`);
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem("neonSyndicateHighScore", String(state.highScore));
  }
  updateHud();
  addSparkleBand(ball.x, ball.y, color);
}

function resetBallToPlunger() {
  ball.x = 748;
  ball.y = 1188;
  ball.vx = 0;
  ball.vy = 0;
  ball.active = true;
  ball.inPlunger = true;
  ball.trail.length = 0;
  state.launcherCharge = 0;
}

function resetRun() {
  state.running = false;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.ballsLeft = 3;
  state.combo = 0;
  state.comboTimer = 0;
  state.flashTimer = 0;
  state.cameraShake = 0;
  state.bursts.length = 0;
  state.sparkles.length = 0;
  leftFlipper.pressed = false;
  rightFlipper.pressed = false;
  state.launchHeld = false;
  setMode("Ready");
  setStatus("Press Start, charge the launcher, and survive the candy-bright heat.");
  bumpers.forEach((bumper) => {
    bumper.glow = 0;
  });
  targets.forEach((target) => {
    target.lit = 0;
  });
  rolloverLanes.forEach((lane) => {
    lane.lit = 0;
  });
  sideLanes.forEach((lane) => {
    lane.lit = 0;
  });
  resetBallToPlunger();
  updateHud();
}

function startGame() {
  if (!audio) {
    audio = makeAudioEngine();
  }
  if (audio) {
    audio.unlock();
    audio.start();
  }
  state.running = true;
  state.paused = false;
  state.gameOver = false;
  state.score = 0;
  state.ballsLeft = 3;
  state.combo = 0;
  state.comboTimer = 0;
  state.bursts.length = 0;
  state.sparkles.length = 0;
  setMode("Live");
  setStatus("Table hot. Charge the launch and start chaining lanes.");
  bumpers.forEach((bumper) => {
    bumper.glow = 0;
  });
  targets.forEach((target) => {
    target.lit = 0;
  });
  rolloverLanes.forEach((lane) => {
    lane.lit = 0;
  });
  sideLanes.forEach((lane) => {
    lane.lit = 0;
  });
  resetBallToPlunger();
  updateHud();
}

function pauseGame() {
  if (!state.running || state.gameOver) {
    return;
  }
  state.paused = !state.paused;
  setMode(state.paused ? "Paused" : "Live");
  setStatus(state.paused ? "Paused. Catch your breath." : "Back in action.");
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
  updateHud();
}

function loseBall() {
  if (!state.running || state.gameOver) {
    return;
  }
  state.ballsLeft -= 1;
  state.combo = 0;
  state.comboTimer = 0;
  if (audio) {
    audio.drain();
  }
  if (state.ballsLeft <= 0) {
    state.running = false;
    state.gameOver = true;
    ball.active = false;
    setMode("Game Over");
    setStatus("Game over. Reset or start again for another run.");
    updateHud();
    return;
  }
  resetBallToPlunger();
  setMode("Reload");
  setStatus(`Ball lost. ${state.ballsLeft} left. Recharge and fire again.`);
  updateHud();
}

function launchBall() {
  if (!ball.inPlunger || !state.running || state.paused) {
    return;
  }
  const power = clamp(state.launcherCharge, 0.2, 1);
  ball.inPlunger = false;
  ball.vx = -120 - power * 120;
  ball.vy = -980 - power * 920;
  state.launcherCharge = 0;
  setMode("Live");
  setStatus("Ball flying. Chase the bright lanes and crystal bumpers.");
  if (audio) {
    audio.launch(power);
  }
}

function setFlipperPressed(side, pressed) {
  const flipper = side === "left" ? leftFlipper : rightFlipper;
  if (flipper.pressed !== pressed && pressed && audio) {
    audio.flipper();
  }
  flipper.pressed = pressed;
  flipper.glow = pressed ? 1 : flipper.glow;
}

function setLaunchHeld(pressed) {
  state.launchHeld = pressed;
  if (!pressed && state.launcherCharge > 0) {
    launchBall();
  }
}

function handleKey(event, down) {
  const key = event.key.toLowerCase();
  if (["arrowleft", "arrowright", "arrowdown", "a", "d", "s", "p", " "].includes(key) || event.key === " ") {
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
  if (down && key === "p") {
    pauseGame();
  }
  if (down && (key === "enter" || event.key === " ")) {
    if (!state.running || state.gameOver) {
      startGame();
    }
  }
}

function bindTouchControl(button, onDown, onUp) {
  const release = () => {
    button.classList.remove("active");
    onUp();
  };
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    button.classList.add("active");
    onDown();
  });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
}

function updateFlipper(flipper, dt) {
  const target = flipper.pressed ? flipper.activeAngle : flipper.restAngle;
  const diff = target - flipper.angle;
  const maxStep = (flipper.pressed ? 14 : 11) * dt;
  flipper.angularVelocity = clamp(diff / Math.max(dt, 0.001), -18, 18);
  flipper.angle += clamp(diff, -maxStep, maxStep);
  flipper.glow = Math.max(0, flipper.glow - dt * 2.5);
}

function flipperTip(flipper) {
  return {
    x: flipper.pivot.x + Math.cos(flipper.angle) * flipper.length,
    y: flipper.pivot.y + Math.sin(flipper.angle) * flipper.length
  };
}

function closestPointOnSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : clamp(((px - x1) * dx + (py - y1) * dy) / lenSq, 0, 1);
  return { x: x1 + dx * t, y: y1 + dy * t };
}

function collideBallWithSegment(obj, x1, y1, x2, y2, bounce = 0.92, push = 0) {
  const point = closestPointOnSegment(obj.x, obj.y, x1, y1, x2, y2);
  const dx = obj.x - point.x;
  const dy = obj.y - point.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 0 && dist < obj.r) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = obj.r - dist + 0.1;
    obj.x += nx * overlap;
    obj.y += ny * overlap;
    const velocity = obj.vx * nx + obj.vy * ny;
    if (velocity < 0) {
      obj.vx -= (1 + bounce) * velocity * nx;
      obj.vy -= (1 + bounce) * velocity * ny;
    }
    obj.vx += nx * push;
    obj.vy += ny * push;
    return Math.abs(velocity);
  }
  return 0;
}

function collideCircleCircle(obj, cx, cy, radius) {
  const dx = obj.x - cx;
  const dy = obj.y - cy;
  const dist = Math.hypot(dx, dy);
  const minDist = obj.r + radius;
  if (dist > 0 && dist < minDist) {
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;
    obj.x += nx * overlap;
    obj.y += ny * overlap;
    const velocity = obj.vx * nx + obj.vy * ny;
    if (velocity < 0) {
      obj.vx -= 1.9 * velocity * nx;
      obj.vy -= 1.9 * velocity * ny;
    }
    return { hit: true, nx, ny, impact: Math.abs(velocity) };
  }
  return { hit: false };
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

function updateParticles(dt) {
  state.sparkles = state.sparkles.filter((particle) => {
    particle.life -= dt;
    particle.radius += dt * 12;
    return particle.life > 0;
  });

  state.bursts = state.bursts.filter((particle) => {
    particle.life -= dt;
    particle.vy += 380 * dt;
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.size *= 0.988;
    return particle.life > 0;
  });
}

function updatePhysics(dt) {
  state.lampsTime += dt * 2.6;
  state.flashTimer = Math.max(0, state.flashTimer - dt);
  state.cameraShake = Math.max(0, state.cameraShake - dt * 14);
  state.comboTimer = Math.max(0, state.comboTimer - dt);
  if (state.comboTimer === 0) {
    state.combo = 0;
  }

  updateParticles(dt);
  updateFlipper(leftFlipper, dt);
  updateFlipper(rightFlipper, dt);
  bumpers.forEach((bumper) => {
    bumper.glow = Math.max(0, bumper.glow - dt * 3.4);
  });
  targets.forEach((target) => {
    target.lit = Math.max(0, target.lit - dt * 2.4);
  });
  rolloverLanes.forEach((lane) => {
    lane.lit = Math.max(0, lane.lit - dt * 1.9);
  });
  sideLanes.forEach((lane) => {
    lane.lit = Math.max(0, lane.lit - dt * 1.8);
  });

  if (!state.running || state.paused || !ball.active) {
    return;
  }

  if (ball.inPlunger) {
    state.launcherCharge = state.launchHeld ? clamp(state.launcherCharge + dt * 0.85, 0, 1) : 0;
    ball.x = 748;
    ball.y = 1188 + state.launcherCharge * 102;
    return;
  }

  ball.vy += 820 * dt;
  ball.vx *= 0.9992;
  ball.vy *= 0.99935;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 14) {
    ball.trail.shift();
  }

  for (const bumper of bumpers) {
    const collision = collideCircleCircle(ball, bumper.x, bumper.y, bumper.r);
    if (collision.hit) {
      bumper.glow = 1;
      ball.vx += collision.nx * 260;
      ball.vy += collision.ny * 260 - 60;
      state.cameraShake = Math.max(state.cameraShake, 10);
      award(bumper.score, `${bumper.label} bumper`, bumper.color);
      addBurst(bumper.x, bumper.y, bumper.color, 14, 260, 0.55);
      if (audio) {
        audio.bumper(Math.min(1.4, collision.impact / 220));
      }
    }
  }

  for (const lane of rolloverLanes) {
    if (ball.x > lane.x - lane.w / 2 && ball.x < lane.x + lane.w / 2 && ball.y > lane.y - 20 && ball.y < lane.y + 18) {
      if (lane.lit <= 0.02) {
        lane.lit = 1;
        award(lane.score, `${lane.label} lane`, lane.color);
        addBurst(lane.x, lane.y, lane.color, 10, 170, 0.45);
        if (audio) {
          audio.lane();
        }
      }
    }
  }

  if (rolloverLanes.every((lane) => lane.lit > 0.55)) {
    rolloverLanes.forEach((lane) => {
      lane.lit = 0.3;
    });
    award(1600, "Jackpot circuit complete", palette.gold);
    setMode("Jackpot");
    addBurst(450, 218, palette.gold, 30, 320, 0.8);
  } else if (!state.paused && !state.gameOver) {
    setMode(ball.inPlunger ? "Ready" : "Live");
  }

  for (const lane of sideLanes) {
    if (ball.x > lane.x && ball.x < lane.x + lane.w && ball.y > lane.y && ball.y < lane.y + lane.h) {
      lane.lit = 1;
      if (Math.random() < 0.09) {
        award(lane.score, `${lane.label} lane`, lane.color);
        if (audio) {
          audio.lane();
        }
      }
    }
  }

  for (const target of targets) {
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
        ball.vx *= -0.94;
        ball.x += dx > 0 ? 5 : -5;
      } else {
        ball.vy *= -0.94;
        ball.y += dy > 0 ? 5 : -5;
      }
      if (target.lit < 0.2) {
        target.lit = 1;
        award(target.score, `${target.label} target`, target.color);
        addBurst(target.x, target.y, target.color, 12, 210, 0.5);
      }
    }
  }

  for (const segment of wallSegments) {
    const impact = collideBallWithSegment(ball, segment.x1, segment.y1, segment.x2, segment.y2, 0.94, 0);
    if (impact && audio) {
      audio.wall(Math.min(3, impact / 180));
    }
  }

  for (const guide of guides) {
    const impact = collideBallWithSegment(ball, guide.x1, guide.y1, guide.x2, guide.y2, 0.92, 20);
    if (impact && audio) {
      audio.wall(impact / 180);
    }
  }

  const dxArc = ball.x - topArc.x;
  const dyArc = ball.y - topArc.y;
  const distArc = Math.hypot(dxArc, dyArc);
  const angleArc = Math.atan2(dyArc, dxArc);
  if ((angleArc >= topArc.start || angleArc <= topArc.end - Math.PI * 2) && distArc > topArc.r - ball.r) {
    const nx = dxArc / distArc;
    const ny = dyArc / distArc;
    ball.x = topArc.x + nx * (topArc.r - ball.r);
    ball.y = topArc.y + ny * (topArc.r - ball.r);
    const vel = ball.vx * nx + ball.vy * ny;
    if (vel > 0) {
      ball.vx -= 1.8 * vel * nx;
      ball.vy -= 1.8 * vel * ny;
    }
  }

  collideBallWithFlipper(leftFlipper, "left");
  collideBallWithFlipper(rightFlipper, "right");

  for (let i = 0; i < slings.length; i += 1) {
    if (polygonContainsPoint(ball, slings[i])) {
      ball.vy -= 300;
      ball.vx += i === 0 ? 190 : -190;
      award(180, "Sling pop", i === 0 ? palette.aqua : palette.pink);
      addBurst(ball.x, ball.y, i === 0 ? palette.aqua : palette.pink, 10, 180, 0.42);
      if (audio) {
        audio.bumper(0.7);
      }
    }
  }

  if (ball.x < ball.r + 82) {
    ball.x = ball.r + 82;
    ball.vx = Math.abs(ball.vx) * 0.92;
  }
  if (ball.x > 786 - ball.r && ball.y > 118) {
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

  updateHud();
}

function collideBallWithFlipper(flipper, side) {
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
  if (side === "left" && flipper.pressed) {
    ball.vx += 60;
    ball.vy -= 170;
  }
  if (side === "right" && flipper.pressed) {
    ball.vx -= 60;
    ball.vy -= 170;
  }
  flipper.glow = 1;
  state.cameraShake = Math.max(state.cameraShake, 5);
}

function drawRoundedRect(x, y, width, height, radius, fill = true, stroke = true) {
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

function drawGlowLine(points, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = color;
  ctx.shadowBlur = width * 1.2;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawTable() {
  const shakeX = (Math.random() - 0.5) * state.cameraShake;
  const shakeY = (Math.random() - 0.5) * state.cameraShake;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.translate(shakeX, shakeY);

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#57218a");
  bg.addColorStop(0.42, "#2c0f4c");
  bg.addColorStop(1, "#10051b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(450, 240, 60, 450, 240, 420);
  glow.addColorStop(0, "rgba(255,255,255,0.2)");
  glow.addColorStop(0.3, "rgba(255,79,195,0.2)");
  glow.addColorStop(0.58, "rgba(65,240,255,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  const frame = ctx.createLinearGradient(0, 120, 0, H);
  frame.addColorStop(0, "rgba(255,255,255,0.06)");
  frame.addColorStop(1, "rgba(255,255,255,0.01)");
  ctx.fillStyle = frame;
  ctx.fillRect(92, 108, 694, 1190);

  drawGlowLine([{ x: 120, y: 116 }, { x: 780, y: 116 }], "rgba(255,255,255,0.12)", 3);
  drawGlowLine(ramps[0].points, "rgba(65,240,255,0.65)", 12);
  drawGlowLine(ramps[1].points, "rgba(255,79,195,0.65)", 12);
  drawGlowLine(ramps[0].points, "rgba(255,255,255,0.35)", 3);
  drawGlowLine(ramps[1].points, "rgba(255,255,255,0.35)", 3);

  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 120px Georgia";
  ctx.textAlign = "center";
  ctx.translate(450, 760);
  ctx.rotate(-0.08);
  ctx.fillText("SYNDICATE", 0, 0);
  ctx.restore();

  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.font = "900 70px Georgia";
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(255,79,195,0.55)";
  ctx.shadowBlur = 24;
  ctx.fillText("NEON NIGHT", 450, 142);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.font = "800 28px Trebuchet MS";
  ctx.fillText("CRYSTAL JACKPOT  •  SUGAR RUSH TABLE  •  MIDNIGHT MODE", 450, 188);

  drawRolloverLanes();
  drawSideLanes();
  drawTargets();
  drawBumpers();
  drawSlings();
  drawFlippers();
  drawLauncher();
  drawParticles();
  drawBall();
  drawTableText();
  drawOverlay();

  ctx.restore();
}

function drawRolloverLanes() {
  ctx.save();
  ctx.textAlign = "center";
  for (const lane of rolloverLanes) {
    const alpha = 0.2 + lane.lit * 0.55;
    ctx.fillStyle = lane.lit > 0 ? `${lane.color}44` : "rgba(255,255,255,0.05)";
    ctx.strokeStyle = lane.lit > 0 ? lane.color : "rgba(255,255,255,0.16)";
    ctx.lineWidth = 3;
    ctx.shadowColor = lane.color;
    ctx.shadowBlur = lane.lit > 0 ? 18 : 0;
    drawRoundedRect(lane.x - lane.w / 2, lane.y - lane.h / 2, lane.w, lane.h, 16, true, true);
    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,255,255,${0.8 + alpha * 0.2})`;
    ctx.font = "800 18px Trebuchet MS";
    ctx.fillText(lane.label, lane.x, lane.y + 6);
  }
  ctx.restore();
}

function drawSideLanes() {
  ctx.save();
  for (const lane of sideLanes) {
    ctx.fillStyle = lane.lit > 0 ? `${lane.color}30` : "rgba(255,255,255,0.03)";
    ctx.strokeStyle = lane.lit > 0 ? lane.color : "rgba(255,255,255,0.1)";
    ctx.lineWidth = 2;
    drawRoundedRect(lane.x, lane.y, lane.w, lane.h, 24, true, true);
    ctx.save();
    ctx.translate(lane.x + lane.w / 2, lane.y + lane.h / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.font = "800 20px Trebuchet MS";
    ctx.fillText(lane.label, 0, 7);
    ctx.restore();
  }
  ctx.restore();
}

function drawTargets() {
  ctx.save();
  ctx.textAlign = "center";
  for (const target of targets) {
    ctx.fillStyle = target.lit > 0 ? `${target.color}50` : "rgba(255,255,255,0.05)";
    ctx.strokeStyle = target.lit > 0 ? target.color : "rgba(255,255,255,0.18)";
    ctx.lineWidth = target.lit > 0 ? 4 : 2;
    ctx.shadowColor = target.color;
    ctx.shadowBlur = target.lit > 0 ? 18 : 0;
    drawRoundedRect(target.x - target.w / 2, target.y - target.h / 2, target.w, target.h, 14, true, true);
    ctx.shadowBlur = 0;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.font = target.label.length > 2 ? "800 18px Trebuchet MS" : "900 24px Trebuchet MS";
    ctx.fillText(target.label, target.x, target.y + 8);
  }
  ctx.restore();
}

function drawBumpers() {
  ctx.save();
  ctx.textAlign = "center";
  for (const bumper of bumpers) {
    const pulse = 0.75 + Math.sin(state.lampsTime * 5 + bumper.x * 0.01) * 0.12;
    const outer = ctx.createRadialGradient(bumper.x, bumper.y, 12, bumper.x, bumper.y, bumper.r + 42);
    outer.addColorStop(0, "rgba(255,255,255,0.5)");
    outer.addColorStop(0.24, `${bumper.color}cc`);
    outer.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = outer;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r + 42, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = bumper.color;
    ctx.shadowBlur = 22 + bumper.glow * 24;
    ctx.fillStyle = bumper.color;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(255,255,255,${0.82 * pulse})`;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r * 0.58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = bumper.ring;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(bumper.x, bumper.y, bumper.r + 9, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#22051f";
    ctx.font = "900 17px Trebuchet MS";
    ctx.fillText(bumper.label, bumper.x, bumper.y + 6);
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
    gradient.addColorStop(0, index === 0 ? palette.aqua : palette.pink);
    gradient.addColorStop(1, palette.orange);
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.65;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(255,255,255,0.64)";
    ctx.lineWidth = 4;
    ctx.stroke();
  });
  ctx.restore();
}

function drawFlippers() {
  drawSingleFlipper(leftFlipper, palette.aqua);
  drawSingleFlipper(rightFlipper, palette.pink);
}

function drawSingleFlipper(flipper, color) {
  const tip = flipperTip(flipper);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = 30;
  ctx.strokeStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 24 + flipper.glow * 16;
  ctx.beginPath();
  ctx.moveTo(flipper.pivot.x, flipper.pivot.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(flipper.pivot.x, flipper.pivot.y);
  ctx.lineTo(tip.x, tip.y);
  ctx.stroke();

  ctx.fillStyle = "#fffefc";
  ctx.beginPath();
  ctx.arc(flipper.pivot.x, flipper.pivot.y, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLauncher() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fillRect(716, 126, 68, 1152);
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 3;
  ctx.strokeRect(716, 126, 68, 1152);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "800 22px Trebuchet MS";
  ctx.textAlign = "center";
  ctx.fillText("LAUNCH", 750, 220);
  if (ball.inPlunger) {
    const chargeHeight = state.launcherCharge * 170;
    const gradient = ctx.createLinearGradient(0, 1260 - chargeHeight, 0, 1260);
    gradient.addColorStop(0, "rgba(255,211,79,0.95)");
    gradient.addColorStop(1, "rgba(255,79,195,0.95)");
    ctx.fillStyle = gradient;
    ctx.fillRect(726, 1260 - chargeHeight, 48, chargeHeight);
  }
  ctx.restore();
}

function drawParticles() {
  ctx.save();
  state.sparkles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = `${particle.color}${Math.round(alpha * 120).toString(16).padStart(2, "0")}`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
  state.bursts.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;
    ctx.fillStyle = `${particle.color}${Math.round(alpha * 180).toString(16).padStart(2, "0")}`;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  });
  ctx.restore();
}

function drawBall() {
  if (!ball.active) {
    return;
  }
  ctx.save();
  for (let i = 0; i < ball.trail.length; i += 1) {
    const point = ball.trail[i];
    const alpha = i / ball.trail.length;
    ctx.fillStyle = `rgba(255,255,255,${alpha * 0.12})`;
    ctx.beginPath();
    ctx.arc(point.x, point.y, ball.r * alpha * 0.95, 0, Math.PI * 2);
    ctx.fill();
  }
  const gradient = ctx.createRadialGradient(ball.x - 4, ball.y - 7, 2, ball.x, ball.y, ball.r + 6);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.45, "#f6dcff");
  gradient.addColorStop(1, "#a774d2");
  ctx.shadowColor = "rgba(255,255,255,0.85)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTableText() {
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "800 22px Trebuchet MS";
  ctx.textAlign = "left";
  ctx.fillText("LEFT ORBIT", 122, 1020);
  ctx.textAlign = "right";
  ctx.fillText("RIGHT ORBIT", 776, 1020);
  ctx.textAlign = "center";
  ctx.font = "700 24px Georgia";
  ctx.fillText("HOLD TO CHARGE LAUNCH", 450, 1302);
  if (state.flashTimer > 0) {
    ctx.globalAlpha = state.flashTimer * 2;
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 42px Georgia";
    ctx.fillText(`COMBO x${Math.max(1, state.combo)}`, 450, 90);
  }
  ctx.restore();
}

function drawOverlay() {
  if (state.paused || state.gameOver || !state.running) {
    ctx.save();
    ctx.fillStyle = "rgba(6, 3, 14, 0.56)";
    drawRoundedRect(170, 560, 560, 210, 28, true, false);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    if (!state.running && !state.gameOver) {
      ctx.font = "900 56px Georgia";
      ctx.fillText("PRESS START", 450, 646);
      ctx.font = "700 24px Trebuchet MS";
      ctx.fillText("Launch into a bright modern arcade run.", 450, 694);
    } else if (state.paused) {
      ctx.font = "900 56px Georgia";
      ctx.fillText("PAUSED", 450, 646);
      ctx.font = "700 24px Trebuchet MS";
      ctx.fillText("Hit Pause again or press P to continue.", 450, 694);
    } else if (state.gameOver) {
      ctx.font = "900 56px Georgia";
      ctx.fillText("GAME OVER", 450, 632);
      ctx.font = "800 28px Trebuchet MS";
      ctx.fillText(`Final Score ${state.score.toLocaleString()}`, 450, 676);
      ctx.font = "700 22px Trebuchet MS";
      ctx.fillText("Press Start for a fresh run.", 450, 716);
    }
    ctx.restore();
  }
}

function gameLoop(timestamp) {
  if (!state.lastTime) {
    state.lastTime = timestamp;
  }
  let dt = (timestamp - state.lastTime) / 1000;
  state.lastTime = timestamp;
  dt = Math.min(dt, MAX_DT);
  updatePhysics(dt);
  drawTable();
  requestAnimationFrame(gameLoop);
}

startButton.addEventListener("click", startGame);
pauseButton.addEventListener("click", pauseGame);
resetButton.addEventListener("click", () => {
  resetRun();
  pauseButton.textContent = "Pause";
});
audioButton.addEventListener("click", async () => {
  if (!audio) {
    audio = makeAudioEngine();
  }
  if (audio) {
    await audio.unlock();
  }
  state.audioEnabled = !state.audioEnabled;
  if (audio) {
    audio.toggle(state.audioEnabled);
  }
  audioButton.textContent = state.audioEnabled ? "Audio On" : "Audio Off";
  setStatus(state.audioEnabled ? "Audio on. Bright arcade energy restored." : "Audio off. Visual-only run.");
});

window.addEventListener("keydown", (event) => handleKey(event, true), { passive: false });
window.addEventListener("keyup", (event) => handleKey(event, false), { passive: false });

bindTouchControl(leftFlipperButton, () => setFlipperPressed("left", true), () => setFlipperPressed("left", false));
bindTouchControl(rightFlipperButton, () => setFlipperPressed("right", true), () => setFlipperPressed("right", false));
bindTouchControl(launchButton, () => setLaunchHeld(true), () => setLaunchHeld(false));

resetRun();
audioButton.textContent = state.audioEnabled ? "Audio On" : "Audio Off";
requestAnimationFrame(gameLoop);
