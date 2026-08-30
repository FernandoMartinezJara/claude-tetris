'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // 1  I - cyan
  '#ffd54f', // 2  O - yellow
  '#ba68c8', // 3  T - purple
  '#81c784', // 4  S - green
  '#e57373', // 5  Z - red
  '#7986cb', // 6  J - indigo
  '#ffb74d', // 7  L - orange
  '#90a4ae', // 8  N - tuerca (metal)
  '#ff7043', // 9  + - coral
  '#9ccc65', // 10 U - lima
  '#8d6e63', // 11 Y - marrón
  '#eceff1', // 12 single - plata (recompensa)
  '#f06292', // 13 comodín (WILD)
  '#26c6da', // 14 power-up (POWER)
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // 1  I
  [[2,2],[2,2]],                               // 2  O
  [[0,3,0],[3,3,3],[0,0,0]],                  // 3  T
  [[0,4,4],[4,4,0],[0,0,0]],                  // 4  S
  [[5,5,0],[0,5,5],[0,0,0]],                  // 5  Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // 6  J
  [[0,0,7],[7,7,7],[0,0,0]],                  // 7  L
  [[8,8,8],[8,0,8],[8,8,8]],                  // 8  N - tuerca (hueco central)
  [[0,9,0],[9,9,9],[0,9,0]],                  // 9  + - pentominó X (simétrico: rotar es no-op)
  [[10,0,10],[10,10,10],[0,0,0]],             // 10 U - pentominó U
  [[0,11,0,0],[11,11,0,0],[0,11,0,0],[0,11,0,0]], // 11 Y - pentominó Y
  [[12]],                                      // 12 single - recompensa tras un Tetris
];

const NUT = 8;
const PLUS = 9;
const UPENT = 10;
const YPENT = 11;
const SINGLE = 12; // recompensa tras un Tetris (nunca sale por azar)
const WILD = 13;   // comodín: atravesable, pero cuenta como celda llena al limpiar líneas
const POWER = 14;  // color del bloque power-up (nunca se asienta en el tablero)

const T_PIECE = 3; // índice de la T en PIECES, usado para detectar T-spins

// Pools de sorteo. RARE agrupa la tuerca y los pentominós: toda la "dificultad"
// del juego se regula desde RARE_CHANCE. SINGLE queda fuera de ambos porque
// solo se entrega como recompensa tras un Tetris, nunca por azar.
const STANDARD = [1, 2, 3, 4, 5, 6, 7];
const RARE = [NUT, PLUS, UPENT, YPENT];
const RARE_CHANCE = 0.12;

const LINE_SCORES = [0, 100, 300, 500, 800];

const COMBO_CAP = 5;
const TSPIN_SCORES = [400, 800, 1200, 1600]; // por líneas limpiadas: 0,1,2,3 (T no limpia 4)
const BTB_BONUS_RATIO = 0.5; // +50% del puntaje base de un Tetris en racha B2B (desde el 2º)
const PERFECT_CLEAR_BONUS = 2000;
const CLEAR_NAMES = ['', 'SIMPLE', 'DOBLE', 'TRIPLE', 'TETRIS'];

const POWER_LINES = 5;   // cada cuántas líneas limpiadas cae un power-up
const FREEZE_MS = 5000;  // duración del efecto Congelar
const BANNER_MS = 1800;  // tiempo que se muestra el banner de power-up

// Power-ups: no viven en PIECES, así que randomPiece() nunca los elige por azar.
// Caen como piezas 1x1 normales y disparan su efecto al bloquearse (lockPiece).
const POWERS = [
  { id: 'bomba',    nombre: 'BOMBA',    icono: '💣', desc: 'Destruye un área 3×3' },
  { id: 'rayo',     nombre: 'RAYO',     icono: '⚡', desc: 'Limpia fila y columna' },
  { id: 'tinte',    nombre: 'TINTE',    icono: '🎨', desc: 'Comodines de un color' },
  { id: 'gravedad', nombre: 'GRAVEDAD', icono: '🧲', desc: 'Compacta los huecos' },
  { id: 'congelar', nombre: 'CONGELAR', icono: '❄️', desc: 'Congela la caída 5s' },
];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeSwitch = document.getElementById('theme-switch');
const soundToggle = document.getElementById('sound-toggle');
const bannerEl = document.getElementById('power-banner');
const bannerIconEl = document.getElementById('power-banner-icon');
const bannerNameEl = document.getElementById('power-banner-name');
const bannerDescEl = document.getElementById('power-banner-desc');
const gameContainer = document.querySelector('.game-container');

let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePower, pieceQueue, freezeRemaining, bannerTimer;
let combo, btbTetris, lastActionWasRotate;
let audioCtx, audioStarted, muted;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

// Construye una pieza a partir de su índice, copiando la forma para que
// tryRotate() pueda mutarla sin tocar la plantilla de PIECES.
function makePiece(type) {
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function randomPiece() {
  const pool = Math.random() < RARE_CHANCE ? RARE : STANDARD;
  return makePiece(pool[Math.floor(Math.random() * pool.length)]);
}

function powerPiece() {
  const power = POWERS[Math.floor(Math.random() * POWERS.length)];
  return { type: POWER, power, shape: [[POWER]], x: Math.floor(COLS / 2), y: 0 };
}

// Fuente de piezas usada por spawn()/init(): entrega primero las recompensas
// encoladas por clearLines() (single de Tetris, power-up) y si no, sortea.
function nextPiece() {
  const queued = pieceQueue.shift();
  if (queued === 'single') return makePiece(SINGLE);
  if (queued === 'power') return powerPiece();
  return randomPiece();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      // Los comodines (WILD) son atravesables: cuentan como llenos al limpiar
      // líneas, pero no bloquean el paso ni el aterrizaje de otras piezas.
      if (ny >= 0 && board[ny][nx] && board[ny][nx] !== WILD) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      lastActionWasRotate = true; // habilita la detección de T-spin al bloquear
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// Solo muta el tablero y las estadísticas de progreso (líneas/nivel/velocidad).
// La puntuación (combo, T-spin, B2B, Perfect Clear) la resuelve resolveClear(),
// que necesita saber `cleared` para decidir cómo puntuar cada bloqueo.
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  }
  return cleared;
}

// Encola las recompensas de piezas (single por Tetris, power-up cada POWER_LINES)
// según cuántas líneas se acaban de limpiar. Independiente de la puntuación: se
// usa tanto para un bloqueo normal como para el efecto de un power-up.
function queueRewards(cleared) {
  if (cleared === 4) pieceQueue.push('single'); // recompensa por Tetris
  linesSincePower += cleared;
  if (linesSincePower >= POWER_LINES) {
    linesSincePower -= POWER_LINES; // conserva el excedente para el próximo umbral
    pieceQueue.push('power');
  }
}

// Al menos 3 de las 4 esquinas del cuadro 3x3 que ocupa la pieza deben estar
// bloqueadas (fuera del tablero o con un bloque ya asentado) para un T-spin.
function countBlockedCorners(px, py) {
  const corners = [[py, px], [py, px + 2], [py + 2, px], [py + 2, px + 2]];
  let blocked = 0;
  for (const [r, c] of corners) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] !== 0) blocked++;
  }
  return blocked;
}

function isBoardEmpty() {
  return board.every(row => row.every(cell => cell === 0));
}

// Combo, B2B y Perfect Clear: decide cuánto suma este bloqueo y si merece
// feedback visual/sonoro. Un power-up nunca pasa por aquí (ver lockPiece).
function resolveClear(cleared, isTSpin) {
  if (cleared === 0) {
    combo = 0;
    if (isTSpin) scoreEvent(TSPIN_SCORES[0] * level, { isTSpin, cleared: 0, combo: 0, btb: btbTetris, perfect: false });
    return;
  }

  combo = Math.min(combo + 1, COMBO_CAP);

  let base = isTSpin ? TSPIN_SCORES[cleared] * level : LINE_SCORES[cleared] * level;

  if (cleared === 4) {
    btbTetris++;
    if (btbTetris >= 2) base += Math.round(LINE_SCORES[4] * level * BTB_BONUS_RATIO);
  } else {
    btbTetris = 0;
  }

  let total = base * combo;

  const perfect = isBoardEmpty();
  if (perfect) total += PERFECT_CLEAR_BONUS * level;

  scoreEvent(total, { isTSpin, cleared, combo, btb: btbTetris, perfect });
}

// Aplica el puntaje y, si el evento es "notable", dispara el banner combinado + sonido.
// Un single/doble/triple normal sin combo activo queda silencioso a propósito.
function scoreEvent(points, info) {
  score += points;
  updateHUD();
  const notable = info.isTSpin || info.cleared === 4 || info.combo >= 2 || info.perfect;
  if (notable) {
    showClearBanner(points, info);
    playClearSound(info);
  }
}

function showClearBanner(points, { isTSpin, cleared, combo, btb, perfect }) {
  const tags = [];
  if (isTSpin) tags.push(cleared ? `T-SPIN ${CLEAR_NAMES[cleared]}` : 'T-SPIN');
  else if (cleared) tags.push(CLEAR_NAMES[cleared]);
  if (btb >= 2) tags.push(`B2B ×${btb}`);
  if (combo >= 2) tags.push(`COMBO ×${combo}`);
  if (perfect) tags.push('PERFECT CLEAR');
  showBanner({
    icono: perfect ? '🌟' : isTSpin ? '🌀' : cleared === 4 ? '🔥' : '⚡',
    nombre: tags.join(' · '),
    desc: `+${points.toLocaleString()} pts`,
  });
  if (perfect) {
    gameContainer.classList.add('flash-perfect');
    setTimeout(() => gameContainer.classList.remove('flash-perfect'), 500);
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    lastActionWasRotate = false;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  if (current.type === POWER) {
    // Un power-up se consume: no se fusiona en el tablero, dispara su efecto.
    // No participa del combo/T-spin/B2B — solo de la cola de recompensas.
    applyPower(current.power, current.x, current.y);
    queueRewards(clearLines());
  } else {
    const isTSpin = current.type === T_PIECE && lastActionWasRotate &&
                    countBlockedCorners(current.x, current.y) >= 3;
    merge();
    const cleared = clearLines();
    queueRewards(cleared);
    resolveClear(cleared, isTSpin);
  }
  spawn();
}

function spawn() {
  current = next;
  next = nextPiece();
  lastActionWasRotate = false; // una pieza recién aparecida no ha rotado
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
}

function applyPower(power, px, py) {
  showBanner(power);
  switch (power.id) {
    case 'bomba':    powerBomba(px, py); break;
    case 'rayo':     powerRayo(px, py); break;
    case 'tinte':    powerTinte(); break;
    case 'gravedad': powerGravedad(); break;
    case 'congelar': freezeRemaining = FREEZE_MS; break;
  }
}

// Vacía una celda si está dentro del tablero y ocupada. Devuelve 1 si destruyó algo.
function destroyCell(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS || board[r][c] === 0) return 0;
  board[r][c] = 0;
  return 1;
}

function powerBomba(px, py) {
  let destroyed = 0;
  for (let r = py - 1; r <= py + 1; r++)
    for (let c = px - 1; c <= px + 1; c++)
      destroyed += destroyCell(r, c);
  scorePower(destroyed);
}

function powerRayo(px, py) {
  let destroyed = 0;
  for (let c = 0; c < COLS; c++) destroyed += destroyCell(py, c);
  for (let r = 0; r < ROWS; r++) destroyed += destroyCell(r, px);
  scorePower(destroyed);
}

function scorePower(destroyed) {
  score += destroyed * 10 * level;
  updateHUD();
}

// Convierte en comodines todos los bloques del color más abundante del tablero.
function powerTinte() {
  const counts = new Array(COLORS.length).fill(0);
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const v = board[r][c];
      if (v && v !== WILD) counts[v]++;
    }
  let target = 0;
  for (let i = 1; i < counts.length; i++) if (counts[i] > counts[target]) target = i;
  if (!target) return; // tablero vacío o ya todo comodín
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (board[r][c] === target) board[r][c] = WILD;
}

// Compacta columna por columna: cada bloque cae hasta apoyarse, sin huecos.
function powerGravedad() {
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][c] !== 0) {
        board[write][c] = board[r][c];
        if (write !== r) board[r][c] = 0;
        write--;
      }
    }
  }
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo >= 2 ? `×${combo}` : '—';
  comboEl.classList.toggle('combo-active', combo >= 2);
}

// El AudioContext solo puede arrancar tras un gesto del usuario; se crea la
// primera vez que se presiona una tecla (ver keydown más abajo).
function ensureAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

// Tono corto generado por oscilador: útil suelto o encadenado en una melodía breve.
function playTone(freq, ms, delayMs = 0, type = 'sine', gain = 0.15) {
  if (muted || !audioCtx) return;
  const t0 = audioCtx.currentTime + delayMs / 1000;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(audioCtx.destination);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.start(t0);
  osc.stop(t0 + ms / 1000);
}

function playClearSound({ isTSpin, cleared, combo, perfect }) {
  if (perfect) { [523, 659, 784, 1047].forEach((f, i) => playTone(f, 220, i * 90)); return; }
  if (isTSpin) { playTone(330, 90); playTone(494, 140, 90); return; }
  if (cleared === 4) { [392, 494, 587, 784].forEach((f, i) => playTone(f, 120, i * 60)); return; }
  playTone(440 * Math.pow(1.12, combo), 110); // combo: el tono sube con la racha
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  const color = COLORS[colorIndex];
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = color;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  context.globalAlpha = 1;
}

// Rellena la celda central de la tuerca con metal y le perfora un agujero circular.
// destination-out borra hasta el fondo del canvas, así que el hueco muestra el fondo
// del tablero definido en CSS y funciona igual en tema claro y oscuro.
function drawNutHole(context, x, y, size) {
  drawBlock(context, x, y, NUT, size);
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.beginPath();
  context.arc(x * size + size / 2, y * size + size / 2, size * 0.34, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// El comodín se pinta translúcido y con una estrella: se atraviesa, pero llena la fila.
function drawWild(context, x, y, size, alpha) {
  const a = alpha ?? 1;
  context.globalAlpha = a * 0.5;
  context.fillStyle = COLORS[WILD];
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  context.globalAlpha = a;
  context.fillStyle = '#ffffff';
  context.font = `bold ${Math.round(size * 0.6)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('✦', x * size + size / 2, y * size + size / 2 + 1);
  context.globalAlpha = 1;
}

// Bloque power-up con su emoji encima, tanto en el tablero como en el preview.
function drawPower(context, x, y, power, size, alpha) {
  drawBlock(context, x, y, POWER, size, alpha);
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = '#000000';
  context.font = `${Math.round(size * 0.62)}px system-ui, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(power.icono, x * size + size / 2, y * size + size / 2 + 1);
  context.globalAlpha = 1;
}

// Una celda vacía del tablero es el hueco de una tuerca asentada si las 8 vecinas
// (las que caen dentro del tablero) son todas tuerca. Si se rompe el anillo (p. ej.
// se limpia su fila superior) deja de cumplirse y la celda vuelve a verse vacía normal.
function isNutHole(r, c) {
  if (board[r][c] !== 0) return false;
  let hasNeighbor = false;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
      if (board[nr][nc] !== NUT) return false;
      hasNeighbor = true;
    }
  }
  return hasNeighbor;
}

function drawGrid() {
  ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--grid-color').trim();
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (board[r][c] === WILD) drawWild(ctx, c, r, BLOCK);
      else if (isNutHole(r, c)) drawNutHole(ctx, c, r, BLOCK);
      else drawBlock(ctx, c, r, board[r][c], BLOCK);
    }

  if (current) {
    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);

    // hueco de la tuerca en caída (solo si no tapa un bloque ya asentado debajo)
    if (current.type === NUT) {
      const hr = current.y + 1, hc = current.x + 1;
      if (hr >= 0 && hr < ROWS && board[hr][hc] === 0) drawNutHole(ctx, hc, hr, BLOCK);
    }

    // icono del power-up en caída, encima del bloque ya dibujado arriba
    if (current.type === POWER) drawPower(ctx, current.x, current.y, current.power, BLOCK);
  }

  if (freezeRemaining > 0) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--value-color').trim();
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`❄ ${(freezeRemaining / 1000).toFixed(1)}s`, canvas.width / 2, 30);
    ctx.restore();
  }
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
  if (next.type === NUT) drawNutHole(nextCtx, offX + 1, offY + 1, NB);
  if (next.type === POWER) drawPower(nextCtx, offX, offY, next.power, NB);
}

function showBanner(power) {
  bannerIconEl.textContent = power.icono;
  bannerNameEl.textContent = power.nombre;
  bannerDescEl.textContent = power.desc;
  bannerEl.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => bannerEl.classList.remove('show'), BANNER_MS);
}

function hideBanner() {
  clearTimeout(bannerTimer);
  bannerEl.classList.remove('show');
}

function endGame() {
  gameOver = true;
  current = null;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
  draw();
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    cancelAnimationFrame(animId);
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    dropAccum = 0; // al descongelar, la caída arranca de cero
  } else {
    dropAccum += dt;
    if (dropAccum >= dropInterval) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        lastActionWasRotate = false;
      } else {
        lockPiece();
      }
    }
  }
  if (gameOver || paused) return;
  draw();
  animId = requestAnimationFrame(loop);
}

function init() {
  cancelAnimationFrame(animId);
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  linesSincePower = 0;
  pieceQueue = [];
  freezeRemaining = 0;
  combo = 0;
  btbTetris = 0;
  lastActionWasRotate = false;
  gameContainer.classList.remove('flash-perfect');
  hideBanner();
  lastTime = performance.now();
  next = nextPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!audioStarted) { audioStarted = true; ensureAudio(); }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) { current.x--; lastActionWasRotate = false; }
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) { current.x++; lastActionWasRotate = false; }
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

function applyTheme(theme) {
  document.body.classList.toggle('light', theme === 'light');
  themeSwitch.checked = theme === 'light';
  localStorage.setItem('tetris-theme', theme);
}

themeSwitch.addEventListener('change', () => {
  applyTheme(themeSwitch.checked ? 'light' : 'dark');
});

applyTheme(localStorage.getItem('tetris-theme') || 'dark');

function applyMute(m) {
  muted = m;
  soundToggle.textContent = muted ? '🔇' : '🔊';
  localStorage.setItem('tetris-muted', String(muted));
}

soundToggle.addEventListener('click', () => applyMute(!muted));

applyMute(localStorage.getItem('tetris-muted') === 'true');

init();
