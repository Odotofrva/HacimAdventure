const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const messageEl = document.getElementById('message');
const crystalEl = document.getElementById('crystalCount');
const keyEl = document.getElementById('keyStatus');
const movesEl = document.getElementById('moveCount');
const stageNumberEl = document.getElementById('stageNumber');
const stageNameEl = document.getElementById('stageName');
const stageSizeEl = document.getElementById('stageSize');
const missionTextEl = document.getElementById('missionText');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');
const victoryOverlay = document.getElementById('victoryOverlay');
const aboutBtn = document.getElementById('aboutBtn');
const aboutModal = document.getElementById('aboutModal');
const aboutClose = document.getElementById('aboutClose');

const TILE_SIZE = 64;
const VIEW_COLS = 12;
const VIEW_ROWS = 9;
const TOTAL_LEVELS = 40;

const TILE = {
  FLOOR: 0,
  WALL: 1,
  CRYSTAL: 2,
  RED_KEY: 3,
  RED_DOOR: 4,
  EXIT: 5,
  WATER: 6,
  DISK: 7,
  TRAP: 8,
  ICE: 9,
  USB: 10,
  COMPUTER: 11,
  CODE_DOOR: 12,
  BATTERY: 13,
  BLUEPRINT: 14
};

const THEME_NAMES = [
  'The First Gate','Circuit Courtyard','Lost Disk Path','Neon Lock Room','Pa-Pa\'s Workshop',
  'Firewall Alley','Debug Dungeon','Crystal Grid','Bot Patrol','Memory Vault',
  'Blue Key Sector','Red Door Maze','Static Waterway','Ice Circuit','Glitch Hall','Shadow Terminal',
  'Core Labyrinth','The Broken Server','Final Upload','The Golden Floppy','Solar Arcade','Bronx Byte Tunnel',
  'Neon Subway','Cloud Backup Bay','USB Shrine','Code Terminal Lab','Signal Tower','Quantum Closet',
  'Retro Boot Sector','Encrypted Garden','Voltage Market','Server Rain District','Patch Note Plaza','Blackout Bridge',
  'RoboTechi Foundry','AI Mirror Room','Malware Moonbase','Final Firewall','Master Upload','Hacim Victory Core'
];

const PALETTES = [
  ['#090d1e','#160b2d','#21284f','#31d7ff','#0d1430'], ['#05130f','#0b2b1f','#163f38','#65ff9a','#0b1e1a'],
  ['#170b08','#34190c','#583018','#f6c84c','#1d110b'], ['#13071d','#2a0b40','#4b2178','#ff4ffd','#1a0d2b'],
  ['#111214','#2a2417','#4c432a','#f6c84c','#171712'], ['#1a0608','#3b0810','#631827','#ff3d5a','#210a0d'],
  ['#061015','#102b38','#1a475a','#31d7ff','#0a1a22'], ['#06151f','#061f3a','#123c68','#31d7ff','#081827'],
  ['#100910','#261225','#4b2446','#ff3d5a','#180e18'], ['#0d0c18','#222044','#333064','#9d5cff','#121226']
];
const THEMES = THEME_NAMES.map((name, i) => {
  const p = PALETTES[i % PALETTES.length];
  return { name, bg1: p[0], bg2: p[1], wall: p[2], accent: p[3], floor: p[4] };
});

function buildLevel(stage) {
  const width = 10 + Math.floor((stage - 1) * 0.55);
  const height = 7 + Math.floor((stage - 1) * 0.38);
  const map = Array.from({ length: height }, (_, y) => Array.from({ length: width }, (_, x) =>
    x === 0 || y === 0 || x === width - 1 || y === height - 1 ? TILE.WALL : TILE.FLOOR
  ));

  for (let x = 3; x < width - 3; x += 4) {
    const gap = 1 + ((stage + x) % (height - 2));
    for (let y = 1; y < height - 1; y++) if (y !== gap && y !== gap + 1) map[y][x] = TILE.WALL;
  }
  for (let y = 4; y < height - 3; y += 4) {
    const gap = 1 + ((stage * 2 + y) % (width - 2));
    for (let x = 1; x < width - 1; x++) if (x !== gap && x !== gap + 1) map[y][x] = TILE.WALL;
  }

  const start = { x: 1, y: 1 };
  const exit = { x: width - 2, y: height - 2 };
  const redDoor = { x: width - 2, y: height - 3 };
  const codeDoor = { x: width - 2, y: height - 4 };
  const key = { x: Math.max(2, Math.floor(width / 2)), y: 1 };
  const usb = { x: Math.max(2, Math.floor(width / 3)), y: Math.max(2, Math.floor(height / 2)) };
  const computer = { x: Math.max(2, width - 4), y: Math.max(2, Math.floor(height / 2)) };

  // Guaranteed main path to all objective gates.
  for (let x = 1; x < width - 1; x++) map[1][x] = TILE.FLOOR;
  for (let y = 1; y < height - 1; y++) map[y][width - 2] = TILE.FLOOR;
  for (let x = Math.min(usb.x, computer.x); x <= Math.max(usb.x, computer.x); x++) map[usb.y][x] = TILE.FLOOR;
  for (let y = 1; y <= usb.y; y++) map[y][usb.x] = TILE.FLOOR;
  for (let y = 1; y <= computer.y; y++) map[y][computer.x] = TILE.FLOOR;

  map[start.y][start.x] = TILE.FLOOR;
  map[exit.y][exit.x] = TILE.EXIT;
  map[redDoor.y][redDoor.x] = TILE.RED_DOOR;
  map[key.y][key.x] = TILE.RED_KEY;

  const hasCodePuzzle = stage >= 25;
  if (hasCodePuzzle) {
    map[usb.y][usb.x] = TILE.USB;
    map[computer.y][computer.x] = TILE.COMPUTER;
    map[codeDoor.y][codeDoor.x] = TILE.CODE_DOOR;
  }

  if (stage === 20 || stage === 40) {
    const disk = { x: Math.max(2, width - 5), y: Math.max(2, height - 4) };
    map[disk.y][disk.x] = TILE.DISK;
  }
  if (stage >= 30) {
    const battery = { x: 2 + (stage % Math.max(2, width - 5)), y: 2 };
    if (map[battery.y][battery.x] === TILE.FLOOR) map[battery.y][battery.x] = TILE.BATTERY;
  }
  if (stage >= 34) {
    const blueprint = { x: 2, y: Math.max(2, height - 4) };
    if (map[blueprint.y][blueprint.x] === TILE.FLOOR) map[blueprint.y][blueprint.x] = TILE.BLUEPRINT;
  }

  const crystalCount = Math.min(5 + Math.floor(stage / 2), 24);
  const safeCells = getReachableCells(map, start, { redKey: false, code: false, usb: false })
    .filter(c => map[c.y][c.x] === TILE.FLOOR && !(c.x === start.x && c.y === start.y));
  let placed = 0;
  let cursor = stage * 3;
  while (placed < crystalCount && safeCells.length) {
    const cell = safeCells[cursor % safeCells.length];
    if (map[cell.y][cell.x] === TILE.FLOOR) { map[cell.y][cell.x] = TILE.CRYSTAL; placed++; }
    cursor += 5;
    if (cursor > safeCells.length * 12 && placed < crystalCount) break;
  }

  // Add hazards only on non-critical floor cells.
  if (stage >= 6) {
    for (let i = 0; i < Math.min(stage - 4, 10); i++) {
      const x = 2 + ((stage + i * 4) % Math.max(2, width - 4));
      const y = 2 + ((stage * 2 + i * 3) % Math.max(2, height - 4));
      if (map[y][x] === TILE.FLOOR) map[y][x] = stage >= 14 && i % 2 ? TILE.ICE : TILE.TRAP;
    }
  }
  if (stage >= 13) {
    for (let i = 0; i < Math.min(stage - 10, 9); i++) {
      const x = 2 + ((stage * 5 + i * 3) % Math.max(2, width - 4));
      const y = 2 + ((stage + i * 5) % Math.max(2, height - 4));
      if (map[y][x] === TILE.FLOOR) map[y][x] = TILE.WATER;
    }
  }

  const bots = [];
  const botCount = Math.min(Math.floor(stage / 4) + 1, 7);
  for (let i = 0; i < botCount; i++) {
    const x = Math.max(2, width - 3 - i * 2);
    const y = Math.min(height - 3, 2 + i * 2);
    if (map[y][x] === TILE.FLOOR) bots.push({ x, y, dir: i % 2 === 0 ? -1 : 1, axis: i % 3 === 0 ? 'y' : 'x' });
  }

  const level = { stage, name: THEMES[stage - 1].name, theme: THEMES[stage - 1], width, height, requiredCrystals: countTiles(map, TILE.CRYSTAL), start, map, bots, hasCodePuzzle };
  validateLevel(level);
  return level;
}

function countTiles(map, tile) { return map.flat().filter(t => t === tile).length; }
function getReachableCells(map, start, inv) {
  const h = map.length, w = map[0].length;
  const seen = new Set([`${start.x},${start.y}`]);
  const q = [{ ...start }];
  const cells = [];
  while (q.length) {
    const p = q.shift(); cells.push(p);
    [[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy]) => {
      const x = p.x + dx, y = p.y + dy, t = map[y]?.[x];
      if (t === undefined || t === TILE.WALL) return;
      if (t === TILE.RED_DOOR && !inv.redKey) return;
      if (t === TILE.CODE_DOOR && !inv.code) return;
      const k = `${x},${y}`; if (!seen.has(k)) { seen.add(k); q.push({x,y}); }
    });
  }
  return cells;
}
function validateLevel(level) {
  const m = level.map;
  const assert = (condition, text) => { if (!condition) console.warn(`Stage ${level.stage} validation: ${text}`); };
  assert(countTiles(m, TILE.CRYSTAL) >= 1, 'missing crystals');
  assert(countTiles(m, TILE.RED_KEY) === 1, 'missing red key');
  assert(countTiles(m, TILE.RED_DOOR) === 1, 'missing red door');
  assert(countTiles(m, TILE.EXIT) === 1, 'missing exit');
  if (level.hasCodePuzzle) {
    assert(countTiles(m, TILE.USB) === 1, 'missing USB stick');
    assert(countTiles(m, TILE.COMPUTER) === 1, 'missing computer terminal');
    assert(countTiles(m, TILE.CODE_DOOR) === 1, 'missing code door');
  }
}

const levels = Array.from({ length: TOTAL_LEVELS }, (_, i) => buildLevel(i + 1));
let currentLevelIndex = 0;
let levelData, level, player, crystals, hasRedKey, hasUsb, hasDoorCode, hasBattery, hasBlueprint, moves, gameState, bots;
let botBubble = null;
let botBubbleCooldown = 0;
let mobileMoveTimer = null;
let audioCtx = null;
let redirectTimer = null;

const BOT_CHAT_LINES = ["Ahhh.. that's close", 'Back up, Hacim!', 'I see you...', 'Too close to the bot zone.', 'Careful, young builder.', 'Glitch bot activated!', 'One more step...'];

function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function playTone(freq, start, duration, type = 'square', gainValue = 0.08) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime + start);
  gain.gain.setValueAtTime(gainValue, audioCtx.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + duration);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration);
}
function playLoseSound() {
  ensureAudio();
  playTone(220, 0, 0.16, 'sawtooth', 0.09);
  playTone(160, 0.13, 0.18, 'square', 0.08);
  playTone(92, 0.28, 0.32, 'triangle', 0.1);
}
function playVictorySound() {
  ensureAudio();
  [392, 523, 659, 784, 1046].forEach((freq, i) => playTone(freq, i * 0.12, 0.22, 'square', 0.07));
}
function showVictoryScreen() {
  gameState = 'complete';
  playVictorySound();
  setMessage('YOU FOUND THE PA-PA FLOPPY DISK');
  victoryOverlay.classList.add('show');
  if (redirectTimer) clearTimeout(redirectTimer);
  redirectTimer = setTimeout(() => {
    window.location.href = 'https://odotnyc.xyz';
  }, 4500);
}

function loadLevel(index) {
  if (redirectTimer) { clearTimeout(redirectTimer); redirectTimer = null; }
  victoryOverlay.classList.remove('show');
  currentLevelIndex = index;
  levelData = levels[currentLevelIndex];
  level = levelData.map.map(row => [...row]);
  player = { ...levelData.start };
  crystals = 0; hasRedKey = false; hasUsb = false; hasDoorCode = false; hasBattery = false; hasBlueprint = false; moves = 0;
  bots = levelData.bots.map(bot => ({ ...bot }));
  botBubble = null; botBubbleCooldown = 0; gameState = 'ready';
  updateUI(); setMessage(`Stage ${levelData.stage}: ${levelData.name}. Press Start.`); draw();
}
function startGame() { ensureAudio(); gameState = 'playing'; setMessage(stageMission()); draw(); }
function stageMission() {
  let text = `Collect ${levelData.requiredCrystals} crystals, get the red key, and reach the exit.`;
  if (levelData.hasCodePuzzle) text += ' Find the USB stick, connect it to the computer, then use the code to unlock the code door.';
  if (levelData.stage >= 30) text += ' Optional items like batteries and blueprints add bonus story flavor.';
  return text;
}
function updateUI() {
  crystalEl.textContent = `${crystals}/${levelData.requiredCrystals}`;
  const extras = [hasRedKey ? 'Red Key' : 'No Key'];
  if (levelData.hasCodePuzzle) extras.push(hasUsb ? 'USB' : 'Need USB', hasDoorCode ? 'Code' : 'No Code');
  keyEl.textContent = extras.join(' / ');
  movesEl.textContent = moves;
  stageNumberEl.textContent = `Stage ${String(levelData.stage).padStart(2, '0')}`;
  stageNameEl.textContent = levelData.name;
  stageSizeEl.textContent = `${levelData.width} x ${levelData.height} Grid`;
  missionTextEl.textContent = stageMission();
}
function setMessage(text) { messageEl.textContent = text; }
function camera() {
  const maxCamX = Math.max(0, levelData.width - VIEW_COLS), maxCamY = Math.max(0, levelData.height - VIEW_ROWS);
  return { x: Math.max(0, Math.min(maxCamX, player.x - Math.floor(VIEW_COLS / 2))), y: Math.max(0, Math.min(maxCamY, player.y - Math.floor(VIEW_ROWS / 2))) };
}
function drawRoundedRect(x, y, w, h, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
function draw() {
  const theme = levelData.theme;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height); gradient.addColorStop(0, theme.bg1); gradient.addColorStop(1, theme.bg2); ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cam = camera();
  for (let y = 0; y < VIEW_ROWS; y++) for (let x = 0; x < VIEW_COLS; x++) { const mx = cam.x + x, my = cam.y + y; if (level[my]?.[mx] !== undefined) drawTile(x, y, level[my][mx]); }
  bots.forEach(bot => drawBot(bot.x - cam.x, bot.y - cam.y)); drawPlayer(player.x - cam.x, player.y - cam.y); drawBotBubble(cam);
  ctx.fillStyle = 'rgba(255,255,255,0.08)'; for (let x = 0; x <= VIEW_COLS; x++) ctx.fillRect(x * TILE_SIZE, 0, 1, VIEW_ROWS * TILE_SIZE); for (let y = 0; y <= VIEW_ROWS; y++) ctx.fillRect(0, y * TILE_SIZE, VIEW_COLS * TILE_SIZE, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(12, 12, 230, 34); ctx.fillStyle = theme.accent; ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'left'; ctx.fillText(`Stage ${levelData.stage}/${TOTAL_LEVELS}`, 24, 35);
}
function drawBotBubble(cam) {
  if (!botBubble || Date.now() > botBubble.expiresAt) { botBubble = null; return; }
  const bx = botBubble.x - cam.x, by = botBubble.y - cam.y; if (bx < 0 || by < 0 || bx >= VIEW_COLS || by >= VIEW_ROWS) return;
  const text = botBubble.text, px = bx * TILE_SIZE + 32, py = by * TILE_SIZE - 8; ctx.font = 'bold 12px Orbitron'; const width = Math.min(220, Math.max(120, ctx.measureText(text).width + 28)); const height = 34; const x = Math.max(8, Math.min(canvas.width - width - 8, px - width / 2)); const y = Math.max(8, py - height);
  ctx.fillStyle = 'rgba(7, 9, 20, 0.92)'; ctx.strokeStyle = 'rgba(246, 200, 76, 0.95)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(x, y, width, height, 12); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#f6c84c'; ctx.textAlign = 'center'; ctx.fillText(text, x + width / 2, y + 22); ctx.beginPath(); ctx.moveTo(px - 7, y + height - 1); ctx.lineTo(px + 7, y + height - 1); ctx.lineTo(px, y + height + 8); ctx.closePath(); ctx.fill();
}
function maybeTriggerBotBubble() { if (!bots.length || botBubbleCooldown > 0) { botBubbleCooldown = Math.max(0, botBubbleCooldown - 1); return; } const nearby = bots.filter(b => Math.abs(b.x - player.x) + Math.abs(b.y - player.y) <= 2); if (!nearby.length) return; const bot = nearby[Math.floor(Math.random() * nearby.length)]; botBubble = { x: bot.x, y: bot.y, text: BOT_CHAT_LINES[Math.floor(Math.random() * BOT_CHAT_LINES.length)], expiresAt: Date.now() + 1600 }; botBubbleCooldown = 3; }
function drawTile(x, y, tile) {
  const theme = levelData.theme, px = x * TILE_SIZE, py = y * TILE_SIZE; drawRoundedRect(px + 3, py + 3, TILE_SIZE - 6, TILE_SIZE - 6, 10, theme.floor);
  if (tile === TILE.WALL) { drawRoundedRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8, 12, theme.wall); ctx.strokeStyle = `${theme.accent}88`; ctx.strokeRect(px + 12, py + 12, TILE_SIZE - 24, TILE_SIZE - 24); }
  if (tile === TILE.CRYSTAL) drawCrystal(px + 32, py + 32); if (tile === TILE.RED_KEY) drawKey(px, py); if (tile === TILE.RED_DOOR) drawDoor(px, py, '#5a1020', 'KEY'); if (tile === TILE.CODE_DOOR) drawDoor(px, py, '#1b356f', 'CODE'); if (tile === TILE.EXIT) drawExit(px, py); if (tile === TILE.DISK) drawDisk(px, py); if (tile === TILE.TRAP) drawTrap(px, py); if (tile === TILE.WATER) drawWater(px, py); if (tile === TILE.ICE) drawIce(px, py); if (tile === TILE.USB) drawUsb(px, py); if (tile === TILE.COMPUTER) drawComputer(px, py); if (tile === TILE.BATTERY) drawBattery(px, py); if (tile === TILE.BLUEPRINT) drawBlueprint(px, py);
}
function drawCrystal(cx, cy) { ctx.fillStyle = '#31d7ff'; ctx.beginPath(); ctx.moveTo(cx, cy - 18); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx, cy + 18); ctx.lineTo(cx - 16, cy); ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.stroke(); }
function drawKey(px, py) { ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.arc(px + 26, py + 31, 10, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(px + 34, py + 28, 20, 6); ctx.fillRect(px + 48, py + 28, 5, 13); ctx.fillRect(px + 41, py + 28, 5, 9); }
function drawDoor(px, py, color, label) { drawRoundedRect(px + 12, py + 8, TILE_SIZE - 24, TILE_SIZE - 14, 8, color); ctx.fillStyle = '#f6c84c'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'center'; ctx.fillText(label, px + 32, py + 38); }
function drawExit(px, py) { const pulse = 0.5 + Math.sin(Date.now() / 160) * 0.12; ctx.fillStyle = `rgba(101,255,154,${pulse})`; ctx.beginPath(); ctx.arc(px + 32, py + 32, 24, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#07140c'; ctx.font = 'bold 14px Orbitron'; ctx.textAlign = 'center'; ctx.fillText('EXIT', px + 32, py + 37); }
function drawDisk(px, py) { drawRoundedRect(px + 17, py + 13, 30, 38, 4, '#f6c84c'); ctx.fillStyle = '#221500'; ctx.fillRect(px + 23, py + 18, 18, 10); ctx.fillRect(px + 23, py + 37, 18, 8); }
function drawTrap(px, py) { ctx.fillStyle = '#ff3d5a'; ctx.beginPath(); ctx.moveTo(px + 32, py + 13); ctx.lineTo(px + 51, py + 49); ctx.lineTo(px + 13, py + 49); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#210507'; ctx.font = 'bold 16px Orbitron'; ctx.textAlign = 'center'; ctx.fillText('!', px + 32, py + 43); }
function drawWater(px, py) { drawRoundedRect(px + 8, py + 12, 48, 40, 10, '#0a5a7a'); ctx.strokeStyle = '#31d7ff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(px + 20 + i * 13, py + 30, 9, 0, Math.PI); ctx.stroke(); } }
function drawIce(px, py) { drawRoundedRect(px + 8, py + 8, 48, 48, 10, '#b8f4ff'); ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(px + 18, py + 20); ctx.lineTo(px + 46, py + 44); ctx.moveTo(px + 45, py + 18); ctx.lineTo(px + 20, py + 48); ctx.stroke(); }
function drawUsb(px, py) { drawRoundedRect(px + 19, py + 18, 27, 28, 5, '#d7d7e8'); ctx.fillStyle = '#31d7ff'; ctx.fillRect(px + 25, py + 12, 15, 8); ctx.fillStyle = '#07140c'; ctx.font = 'bold 10px Orbitron'; ctx.textAlign = 'center'; ctx.fillText('USB', px + 32, py + 37); }
function drawComputer(px, py) { drawRoundedRect(px + 10, py + 14, 44, 32, 6, '#111827'); ctx.fillStyle = '#65ff9a'; ctx.font = 'bold 9px Orbitron'; ctx.textAlign = 'center'; ctx.fillText('CODE', px + 32, py + 32); ctx.fillStyle = '#4b5563'; ctx.fillRect(px + 24, py + 47, 16, 5); }
function drawBattery(px, py) { drawRoundedRect(px + 18, py + 20, 28, 25, 4, '#65ff9a'); ctx.fillStyle = '#07140c'; ctx.fillRect(px + 25, py + 28, 14, 4); ctx.fillRect(px + 30, py + 23, 4, 14); }
function drawBlueprint(px, py) { drawRoundedRect(px + 15, py + 16, 34, 36, 4, '#1457a3'); ctx.strokeStyle = '#ffffff'; ctx.strokeRect(px + 21, py + 22, 22, 24); ctx.beginPath(); ctx.moveTo(px + 22, py + 35); ctx.lineTo(px + 42, py + 35); ctx.stroke(); }
function drawPlayer(x, y) { if (x < 0 || y < 0 || x >= VIEW_COLS || y >= VIEW_ROWS) return; const px = x * TILE_SIZE, py = y * TILE_SIZE; ctx.fillStyle = '#f6c84c'; ctx.beginPath(); ctx.arc(px + 32, py + 28, 16, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#9d5cff'; ctx.fillRect(px + 20, py + 40, 24, 14); ctx.fillStyle = '#07140c'; ctx.fillRect(px + 23, py + 25, 6, 4); ctx.fillRect(px + 35, py + 25, 6, 4); ctx.fillStyle = '#31d7ff'; ctx.fillRect(px + 20, py + 17, 24, 5); }
function drawBot(x, y) { if (x < 0 || y < 0 || x >= VIEW_COLS || y >= VIEW_ROWS) return; const px = x * TILE_SIZE, py = y * TILE_SIZE; drawRoundedRect(px + 13, py + 16, 38, 34, 8, '#ff3d5a'); ctx.fillStyle = '#070914'; ctx.fillRect(px + 21, py + 27, 8, 7); ctx.fillRect(px + 35, py + 27, 8, 7); ctx.fillStyle = '#f6c84c'; ctx.fillRect(px + 25, py + 41, 14, 3); }
function movePlayer(dx, dy) {
  if (gameState !== 'playing') return;
  const nx = player.x + dx, ny = player.y + dy, target = level[ny]?.[nx];
  if (target === undefined || target === TILE.WALL) return;
  if (target === TILE.RED_DOOR && !hasRedKey) { setMessage('The red gate needs a red key.'); return; }
  if (target === TILE.CODE_DOOR && !hasDoorCode) { setMessage('Code door locked. Find the USB and connect it to a computer.'); return; }
  if (target === TILE.EXIT && crystals < levelData.requiredCrystals) { setMessage(`Exit locked: ${crystals}/${levelData.requiredCrystals} crystals.`); return; }
  player.x = nx; player.y = ny; moves++;
  if (target === TILE.CRYSTAL) { crystals++; level[ny][nx] = TILE.FLOOR; setMessage('Crystal collected.'); }
  if (target === TILE.RED_KEY) { hasRedKey = true; level[ny][nx] = TILE.FLOOR; setMessage('Red key acquired.'); }
  if (target === TILE.RED_DOOR && hasRedKey) { level[ny][nx] = TILE.FLOOR; setMessage('Red gate opened.'); }
  if (target === TILE.USB) { hasUsb = true; level[ny][nx] = TILE.FLOOR; setMessage('USB stick collected. Find a computer terminal.'); }
  if (target === TILE.COMPUTER) { if (hasUsb) { hasDoorCode = true; level[ny][nx] = TILE.FLOOR; setMessage('USB connected. Door code downloaded.'); } else setMessage('Computer found. It needs a USB stick first.'); }
  if (target === TILE.CODE_DOOR && hasDoorCode) { level[ny][nx] = TILE.FLOOR; setMessage('Code door unlocked.'); }
  if (target === TILE.BATTERY) { hasBattery = true; level[ny][nx] = TILE.FLOOR; setMessage('Bonus battery collected.'); }
  if (target === TILE.BLUEPRINT) { hasBlueprint = true; level[ny][nx] = TILE.FLOOR; setMessage('Bonus blueprint collected.'); }
  if (target === TILE.DISK) { level[ny][nx] = TILE.FLOOR; setMessage("Pa-Pa's Golden Disk recovered. Reach the exit."); }
  if (target === TILE.TRAP) { loseGame('A glitch trap caught Hacim. Restart this stage.'); return; }
  if (target === TILE.WATER) setMessage('Static water slows the mission. Keep moving.');
  if (target === TILE.ICE) setMessage('Ice circuit tile. Slippery sector ahead.');
  if (target === TILE.EXIT && crystals >= levelData.requiredCrystals) { completeStage(); return; }
  updateBots(); maybeTriggerBotBubble(); checkCollision(); updateUI(); draw();
}
function updateBots() { bots.forEach(bot => { const dx = bot.axis === 'x' ? bot.dir : 0, dy = bot.axis === 'y' ? bot.dir : 0, nx = bot.x + dx, ny = bot.y + dy, next = level[ny]?.[nx]; if (next === undefined || [TILE.WALL, TILE.RED_DOOR, TILE.CODE_DOOR, TILE.EXIT, TILE.WATER].includes(next)) bot.dir *= -1; else { bot.x = nx; bot.y = ny; } }); }
function checkCollision() { if (bots.some(bot => bot.x === player.x && bot.y === player.y)) loseGame('A corrupted bot caught Hacim. Restart this stage.'); }
function loseGame(text) { gameState = 'lost'; botBubble = null; playLoseSound(); setMessage(text); updateUI(); draw(); }
function completeStage() { gameState = 'won'; updateUI(); draw(); if (currentLevelIndex === levels.length - 1) { showVictoryScreen(); return; } setMessage(`Stage ${levelData.stage} complete. Loading next stage...`); setTimeout(() => { loadLevel(currentLevelIndex + 1); startGame(); }, 900); }
window.addEventListener('keydown', (event) => { const key = event.key.toLowerCase(); if (['arrowup','w'].includes(key)) movePlayer(0,-1); if (['arrowdown','s'].includes(key)) movePlayer(0,1); if (['arrowleft','a'].includes(key)) movePlayer(-1,0); if (['arrowright','d'].includes(key)) movePlayer(1,0); });
startBtn.addEventListener('click', startGame); restartBtn.addEventListener('click', () => loadLevel(currentLevelIndex));
function moveByDirection(dir) { if (dir === 'up') movePlayer(0,-1); if (dir === 'down') movePlayer(0,1); if (dir === 'left') movePlayer(-1,0); if (dir === 'right') movePlayer(1,0); }
function stopMobileMove(button) { if (mobileMoveTimer) clearInterval(mobileMoveTimer); mobileMoveTimer = null; button?.classList.remove('is-pressed'); }
document.querySelectorAll('.mobile-controls button').forEach(button => { const dir = button.dataset.dir; button.addEventListener('pointerdown', event => { event.preventDefault(); stopMobileMove(); button.classList.add('is-pressed'); moveByDirection(dir); mobileMoveTimer = setInterval(() => moveByDirection(dir), 210); }); button.addEventListener('pointerup', () => stopMobileMove(button)); button.addEventListener('pointerleave', () => stopMobileMove(button)); button.addEventListener('pointercancel', () => stopMobileMove(button)); });
setInterval(() => { if (gameState === 'playing' || gameState === 'ready') draw(); }, 180);
loadLevel(0);


function openAboutModal() {
  if (!aboutModal) return;
  aboutModal.classList.add('show');
  aboutModal.setAttribute('aria-hidden', 'false');
}

function closeAboutModal() {
  if (!aboutModal) return;
  aboutModal.classList.remove('show');
  aboutModal.setAttribute('aria-hidden', 'true');
}

if (aboutBtn) aboutBtn.addEventListener('click', openAboutModal);
if (aboutClose) aboutClose.addEventListener('click', closeAboutModal);
if (aboutModal) {
  aboutModal.addEventListener('click', (event) => {
    if (event.target === aboutModal) closeAboutModal();
  });
}
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeAboutModal();
});
