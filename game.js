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
  '#616161', // 15 basura (GARBAGE), solo en modo desafío
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
const GARBAGE = 15; // basura del modo desafío: solo vive en `board`, nunca en PIECES
                     // (randomPiece()/makePiece() no pueden sacarla por azar)

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

// Sistema de habilidades cargables: la contraparte activa de los power-ups.
// La energía sube al limpiar líneas; al llenarse, el jugador elige (no recibe
// al azar) una de ABILITIES gastando toda la carga de una vez.
const PREVIEW_MAX = 5;        // profundidad de la cola de lookahead (nextQueue)
const ENERGY_MAX = 100;
const ENERGY_PER_LINE = 12;   // ~9 líneas limpiadas por carga
const SLOW_MS = 10000;        // duración de Lentitud
const SLOW_FACTOR = 2.5;      // multiplicador de dropInterval mientras dura
const PREVIEW5_PIECES = 10;   // colocaciones que dura Videncia

// Power-ups: no viven en PIECES, así que randomPiece() nunca los elige por azar.
// Caen como piezas 1x1 normales y disparan su efecto al bloquearse (lockPiece).
const POWERS = [
  { id: 'bomba',    nombre: 'BOMBA',    icono: '💣', desc: 'Destruye un área 3×3' },
  { id: 'rayo',     nombre: 'RAYO',     icono: '⚡', desc: 'Limpia fila y columna' },
  { id: 'tinte',    nombre: 'TINTE',    icono: '🎨', desc: 'Comodines de un color' },
  { id: 'gravedad', nombre: 'GRAVEDAD', icono: '🧲', desc: 'Compacta los huecos' },
  { id: 'congelar', nombre: 'CONGELAR', icono: '❄️', desc: 'Congela la caída 5s' },
];

// Habilidades: datos puros con la misma forma {id, icono, nombre, desc} que
// POWERS/CHALLENGES, así que showBanner() y el render del menú (calcado del
// de CHALLENGES) las aceptan sin cambios.
const ABILITIES = [
  { id: 'ver5',       icono: '🔮', nombre: 'VIDENCIA',    desc: 'Ve las próximas 5 piezas' },
  { id: 'cambiar',    icono: '🔄', nombre: 'INTERCAMBIO', desc: 'Cambia la pieza actual' },
  { id: 'ralentizar', icono: '🐢', nombre: 'LENTITUD',    desc: `Caída ${SLOW_FACTOR}× más lenta ${SLOW_MS / 1000}s` },
  { id: 'deshacer',   icono: '↩️', nombre: 'DESHACER',    desc: 'Revierte la última pieza' },
];

// Modo desafío: cada entrada es datos puros, no una rama de código. Un campo
// ausente simplemente no activa esa mecánica; CLÁSICO es la entrada sin ningún
// campo especial, así que el modo libre de siempre es un desafío más, no un
// camino aparte. Power-ups y combo siguen activos en todos — solo se añaden
// reglas encima del juego normal. {icono, nombre, desc} calzan con showBanner().
const CHALLENGES = [
  { id: 'clasico', icono: '🎮', nombre: 'CLÁSICO',
    desc: 'Sin objetivos: juega hasta perder' },

  { id: 'contrarreloj', icono: '⏱️', nombre: 'CONTRARRELOJ',
    desc: '40 líneas en 2:00',
    metaLineas: 40, limiteMs: 120000 },

  { id: 'basura', icono: '🗑️', nombre: 'BASURA',
    desc: 'Sobrevive 2:00 con basura subiendo cada 10s',
    limiteMs: 120000, alAgotarse: 'ganar', basuraMs: 10000 },

  { id: 'sucio', icono: '🧱', nombre: 'TABLERO SUCIO',
    desc: '20 líneas partiendo con 6 filas de escombros',
    metaLineas: 20, prefill: 6 },

  { id: 'fantasma', icono: '👻', nombre: 'FANTASMA',
    desc: '20 líneas; lo asentado se vuelve invisible',
    metaLineas: 20, invisible: true },

  // Nivel 2 (10 líneas), no 3: el nivel 3 son exactamente las 20 líneas que
  // ganan el desafío (level = floor(lines/10)+1), así que disparar en nivel 3
  // dejaría el espejo sin jugarse nunca.
  { id: 'espejo', icono: '🪞', nombre: 'ESPEJO',
    desc: '20 líneas; rotación invertida desde el nivel 2',
    metaLineas: 20, espejoDesdeNivel: 2 },
];

const REVEAL_MS = 600; // duración del destello de Fantasma al bloquear una pieza
const DT_CAP = 100;    // tope de dt por frame: evita que una pestaña en segundo
                        // plano vacíe de golpe los relojes del modo desafío

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const objectiveSection = document.getElementById('objective-section');
const objectiveEl = document.getElementById('objective');
const timerSection = document.getElementById('timer-section');
const timerEl = document.getElementById('timer');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const menuBtn = document.getElementById('menu-btn');
const menu = document.getElementById('menu');
const menuList = document.getElementById('menu-list');
const themeSwitch = document.getElementById('theme-switch');
const soundToggle = document.getElementById('sound-toggle');
const bannerEl = document.getElementById('power-banner');
const bannerIconEl = document.getElementById('power-banner-icon');
const bannerNameEl = document.getElementById('power-banner-name');
const bannerDescEl = document.getElementById('power-banner-desc');
const gameContainer = document.querySelector('.game-container');
const energySection = document.getElementById('energy-section');
const energyFill = document.getElementById('energy-fill');
const queueSection = document.getElementById('queue-section');
const queueCanvas = document.getElementById('queue-canvas');
const queueCtx = queueCanvas.getContext('2d');
const holdSection = document.getElementById('hold-section');
const holdCanvas = document.getElementById('hold-canvas');
const holdCtx = holdCanvas.getContext('2d');
const abilityMenu = document.getElementById('ability-menu');
const abilityList = document.getElementById('ability-list');

let board, current, nextQueue, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;
let linesSincePower, freezeRemaining, bannerTimer;
let combo, btbTetris, lastActionWasRotate;
let audioCtx, audioStarted, muted;

// Sistema de habilidades. `energy` sube al limpiar líneas; llena, la tecla E
// abre el selector (`choosingAbility`), que congela la partida igual que la
// pausa. Una sola carga: se gasta entera y vuelve a 0, sin acumular.
let energy, choosingAbility, heldPiece, undoSnapshot, garbageSinceLock;
let preview5Remaining, slowRemaining;

// Hold clásico (tecla C/Shift, siempre disponible, gratis): comparte
// `heldPiece` con lo que antes era la habilidad RESERVA. `holdUsedThisPiece`
// es el límite "una vez por pieza" — se libera en cada spawn().
let holdUsedThisPiece;

// Modo desafío. `activeChallenge` nunca es null (por defecto CHALLENGES[0],
// clásico) para que updateHUD() —llamado en cada keydown— nunca tenga que
// comprobar null. `inMenu` bloquea input/pausa mientras se elige un modo.
let activeChallenge, challengeRemaining, garbageAccum, garbageHoleCol, revealRemaining, espejoAvisado, inMenu;

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

// Copia profunda de una pieza (incluida su forma ya rotada si corresponde).
// Un spread simple compartiría `shape` por referencia y tryRotate() la muta
// in situ (por eso makePiece() ya copia desde PIECES por la misma razón) —
// usarlo en el snapshot de deshacer o en la cola dejaría ambos mutándose entre sí.
function clonePiece(p) {
  return { ...p, shape: p.shape.map(row => [...row]) };
}

// Reconstruye una pieza guardada (RESERVA) en su estado de aparición: forma
// sin rotar, x/y centrados. Un power-up no vive en PIECES (makePiece(POWER)
// fallaría), así que se arma a mano conservando su campo `power`.
function resetPiece(saved) {
  if (saved.type === POWER) return { type: POWER, power: saved.power, shape: [[POWER]], x: Math.floor(COLS / 2), y: 0 };
  return makePiece(saved.type);
}

// nextQueue mantiene SIEMPRE al menos PREVIEW_MAX piezas ya sorteadas: lo que
// se ve en el preview es exactamente lo que va a caer. Nunca se recorta por
// arriba — una recompensa insertada la deja temporalmente más larga y esa
// pieza extra se juega igual, solo que un turno más tarde.
function refillQueue() {
  while (nextQueue.length < PREVIEW_MAX) nextQueue.push(randomPiece());
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

// El giro antihorario del desafío ESPEJO son tres giros horarios: reutiliza
// rotateCW sin duplicar la lógica de transposición.
function rotateCCW(shape) {
  return rotateCW(rotateCW(rotateCW(shape)));
}

function mirrorActive() {
  return activeChallenge.espejoDesdeNivel && level >= activeChallenge.espejoDesdeNivel;
}

function tryRotate() {
  const rotated = mirrorActive() ? rotateCCW(current.shape) : rotateCW(current.shape);
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
    announceMirrorIfNeeded();
  }
  return cleared;
}

// Avisa una sola vez, con el mismo banner que un power-up, cuando ESPEJO
// activa la rotación invertida — para que no parezca un bug.
function announceMirrorIfNeeded() {
  if (mirrorActive() && !espejoAvisado) {
    espejoAvisado = true;
    showBanner({ icono: '🪞', nombre: 'ESPEJO ACTIVADO', desc: 'Rotación invertida' });
  }
}

// Encola las recompensas de piezas (single por Tetris, power-up cada POWER_LINES)
// y carga la barra de energía. Independiente de la puntuación: se usa tanto
// para un bloqueo normal como para el efecto de un power-up (la rama de
// power-up salta resolveClear() a propósito, así que este es el único sitio
// común entre ambas ramas — y por eso la energía vive aquí y no en resolveClear).
//
// Las recompensas se insertan en el índice 1, no al final de la cola: el
// índice 0 es la pieza que spawn() va a convertir en `current` en el próximo
// bloqueo, así que el 1 es el próximo preview que el jugador ve — la misma
// inmediatez que tenía la vieja cola de tokens. Un solo `splice` con ambas
// recompensas a la vez conserva el orden single→power cuando caen las dos
// juntas (dos splice(1) seguidos las dejarían al revés).
function queueRewards(cleared) {
  const premios = [];
  if (cleared === 4) premios.push(makePiece(SINGLE)); // recompensa por Tetris
  linesSincePower += cleared;
  if (linesSincePower >= POWER_LINES) {
    linesSincePower -= POWER_LINES; // conserva el excedente para el próximo umbral
    premios.push(powerPiece());
  }
  if (premios.length) nextQueue.splice(1, 0, ...premios);

  if (cleared) {
    const wasFull = energy >= ENERGY_MAX;
    energy = Math.min(ENERGY_MAX, energy + cleared * ENERGY_PER_LINE);
    // Sin banner al llenarse: lockPiece() llama a queueRewards() ANTES que a
    // resolveClear(), así que un Tetris que llena la barra en el mismo golpe
    // pisaría al instante "ENERGÍA LISTA" con el banner de puntuación
    // (#power-banner es un único elemento). El aviso es solo sonoro + el
    // pulso visual de la barra (updateHUD()).
    if (!wasFull && energy >= ENERGY_MAX) { playTone(659, 90); playTone(988, 150, 90); }
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
  takeUndoSnapshot();
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
  // FANTASMA: la pieza recién asentada se revela un instante antes de ocultarse.
  if (activeChallenge.invisible) revealRemaining = REVEAL_MS;
  // La victoria se decide antes de spawn(): spawn() puede provocar un topout
  // (endGame) que pisaría el título de victoria si se llamara después.
  if (checkObjective()) return;
  spawn();
}

// Devuelve true (y termina la partida) si el desafío activo ya cumplió su meta.
function checkObjective() {
  if (activeChallenge.metaLineas && lines >= activeChallenge.metaLineas) {
    winChallenge();
    return true;
  }
  return false;
}

function spawn() {
  current = nextQueue.shift();
  refillQueue();
  if (preview5Remaining > 0) preview5Remaining--;
  holdUsedThisPiece = false; // el hold se libera con cada pieza nueva
  lastActionWasRotate = false; // una pieza recién aparecida no ha rotado
  if (collide(current.shape, current.x, current.y)) {
    endGame();
    return;
  }
  drawNext();
  updateHUD();
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
      // GARBAGE queda fuera a propósito: en un tablero con basura sería
      // siempre el color más abundante y Tinte la convertiría entera en
      // comodines atravesables (collide() los ignora) — un borrado gratis
      // del desafío BASURA/TABLERO SUCIO.
      if (v && v !== WILD && v !== GARBAGE) counts[v]++;
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

// Fila de basura con un único hueco. La columna del hueco se reutiliza durante
// unas cuantas filas seguidas (ver garbageHoleCol) en vez de sortearse en cada
// fila: con hueco aleatorio por fila, solo el de la fila más baja es alcanzable
// y la basura se vuelve imposible de limpiar. Sirve tanto para BASURA como
// para el prefill inicial de TABLERO SUCIO.
function makeGarbageRow() {
  if (garbageHoleCol === undefined || Math.random() < 0.34) {
    garbageHoleCol = Math.floor(Math.random() * COLS);
  }
  const row = new Array(COLS).fill(GARBAGE);
  row[garbageHoleCol] = 0;
  return row;
}

// Rellena las N filas inferiores del tablero con basura, para el desafío
// TABLERO SUCIO. Se llama justo después de createBoard(), antes de spawn().
function prefillBoard(n) {
  for (let i = 0; i < n; i++) board[ROWS - n + i] = makeGarbageRow();
}

// Empuja una fila de basura desde abajo, descartando la superior. Devuelve
// false si esa fila superior ya tenía bloques (desbordó: derrota) — así el
// desafío BASURA tiene una condición de derrota real y no basta con no hacer
// nada para "sobrevivir".
function pushGarbageRow() {
  if (board[0].some(v => v !== 0)) return false;
  board.shift();
  board.push(makeGarbageRow());
  // El tablero se movió UNA fila hacia arriba bajo la pieza en caída: puede
  // haber quedado solapada con celdas ya ocupadas. merge() escribe sin
  // comprobar nada, así que hay que resolver el solape subiendo la pieza esa
  // misma fila. Si ni así cabe, no hay dónde ponerla: desbordó.
  if (current && collide(current.shape, current.x, current.y)) {
    current.y--;
    if (collide(current.shape, current.x, current.y)) return false;
  }
  return true;
}

// --- Sistema de habilidades cargables ---

// Snapshot del estado justo ANTES de resolver esta colocación. Se toma en lo
// alto de lockPiece(), así que cubre por igual una pieza normal y un power-up.
// No guarda `energy`: chooseAbility() la pone a 0 al cobrar la carga, así que
// restaurarla devolvería el gasto y habilitaría un deshacer infinito. Tampoco
// `challengeRemaining` (el reloj es tiempo real: rebobinarlo sería una segunda
// habilidad no declarada) ni `espejoAvisado` (si no, ESPEJO se re-anunciaría
// al recruzar el nivel 2). `linesSincePower` SÍ se guarda: sin él, deshacer y
// volver a limpiar cruzaría el umbral de POWER_LINES dos veces — un power-up
// gratis y repetible. `heldPiece`/`holdUsedThisPiece` también se guardan: el
// Hold clásico es gratis y no bloquea con energía, así que el jugador puede
// holdear la pieza recién aparecida (mutando el bucket) y recién después
// abrir el selector para deshacer el lock anterior a esa misma pieza — sin
// esto, el bucket quedaría con una pieza "del futuro" que el deshacer no
// debería conservar.
function takeUndoSnapshot() {
  undoSnapshot = {
    board: board.map(row => [...row]),
    current: clonePiece(current),
    nextQueue: nextQueue.map(clonePiece),
    score, lines, level, dropInterval, linesSincePower,
    combo, btbTetris, preview5Remaining, lastActionWasRotate,
    freezeRemaining, slowRemaining,
    heldPiece: heldPiece ? { ...heldPiece } : null, holdUsedThisPiece,
  };
  garbageSinceLock = 0;
}

function abilityDeshacer() {
  const s = undoSnapshot;
  if (!s) return false;
  board = s.board.map(row => [...row]);
  // Se restaura en su x/y/forma EXACTOS (no en la posición de aparición): con
  // el tablero ya restaurado esa celda es legal por construcción —lo era hace
  // un instante—, mientras que la posición de aparición podría no serlo con
  // la pila alta.
  current = clonePiece(s.current);
  nextQueue = s.nextQueue.map(clonePiece);
  score = s.score; lines = s.lines; level = s.level; dropInterval = s.dropInterval;
  linesSincePower = s.linesSincePower;
  combo = s.combo; btbTetris = s.btbTetris;
  preview5Remaining = s.preview5Remaining;
  lastActionWasRotate = s.lastActionWasRotate;
  heldPiece = s.heldPiece ? { ...s.heldPiece } : null;
  holdUsedThisPiece = s.holdUsedThisPiece;
  // Un temporizador solo puede ACORTARSE al deshacer, nunca alargarse: así
  // deshacer el lock de un Congelar/Ralentizar recién aplicado lo cancela,
  // pero deshacer otra cosa mientras uno ya corría no regala tiempo extra.
  freezeRemaining = Math.min(s.freezeRemaining, freezeRemaining);
  slowRemaining = Math.min(s.slowRemaining, slowRemaining);
  dropAccum = 0;
  // BASURA: las filas empujadas DESPUÉS de esta colocación las mete loop()
  // (pushGarbageRow), no lockPiece() — el tablero restaurado no las tiene, así
  // que se re-empujan; si no, deshacer sería un borrado gratis de basura.
  for (let i = 0; i < garbageSinceLock; i++) {
    if (!pushGarbageRow()) { loseChallenge('TE ENTERRARON'); return true; }
  }
  garbageSinceLock = 0;
  undoSnapshot = null; // no hay doble deshacer
  // FANTASMA: sin este destello el jugador no podría ver qué se restauró —
  // misma concesión deliberada que el ghost piece, que el modo tampoco oculta.
  if (activeChallenge.invisible) revealRemaining = REVEAL_MS;
  drawNext();
  drawHold();
  return true;
}

// Cambia la pieza en caída por otra, siempre en la posición de aparición: una
// forma distinta a la altura actual podría solaparse con celdas ya asentadas,
// y merge() escribe sin comprobar nada. Solo tetrominós estándar (nunca la
// tuerca/pentominós) y nunca el mismo tipo: es un rescate, no una tómbola.
function abilityCambiar() {
  const pool = STANDARD.filter(t => t !== current.type);
  const candidate = makePiece(pool[Math.floor(Math.random() * pool.length)]);
  if (collide(candidate.shape, candidate.x, candidate.y)) return false; // no cabe: no cuesta carga
  current = candidate;
  lastActionWasRotate = false;
  dropAccum = 0;
  return true;
}

function abilityRalentizar() {
  slowRemaining = SLOW_MS;
  return true;
}

// Hold clásico: guarda la pieza en caída y saca la siguiente de la cola, o la
// intercambia con la ya guardada. Se guarda siempre en forma canónica
// (resetPiece: sin rotar, posición de aparición) para que recuperarla no
// dependa de cómo estuviera girada al guardarla. Guardar un power-up para más
// tarde es legal. Una vez por pieza (holdUsedThisPiece, liberado en spawn())
// evita reiniciar la caída a voluntad encadenando holds.
function holdPiece() {
  if (holdUsedThisPiece) return;
  const stored = { type: current.type, power: current.power };
  const incoming = heldPiece ? resetPiece(heldPiece) : nextQueue[0];
  if (collide(incoming.shape, incoming.x, incoming.y)) return; // no cabe: no se gasta el uso
  if (heldPiece) {
    heldPiece = stored;
    current = incoming;
  } else {
    heldPiece = stored;
    nextQueue.shift(); // primer hold: cuesta la pieza que viene
    current = incoming;
    refillQueue();
  }
  holdUsedThisPiece = true;
  lastActionWasRotate = false;
  dropAccum = 0;
  drawNext();
  drawHold();
  updateHUD();
}

// Intervalo de caída efectivo. `dropInterval` sigue siendo el valor puro que
// deriva del nivel (clearLines() lo recalcula y el snapshot de deshacer lo
// guarda tal cual): Ralentizar no lo toca, solo lo multiplica al leerlo.
function effectiveDropInterval() {
  return slowRemaining > 0 ? dropInterval * SLOW_FACTOR : dropInterval;
}

function runAbility(ability) {
  switch (ability.id) {
    case 'ver5':       preview5Remaining = PREVIEW5_PIECES; drawNext(); return true;
    case 'cambiar':    return abilityCambiar();
    case 'ralentizar': return abilityRalentizar();
    case 'deshacer':   return abilityDeshacer();
  }
  return false;
}

function abilityAvailable(ability) {
  return ability.id !== 'deshacer' || !!undoSnapshot;
}

// La lista se reconstruye en CADA apertura (a diferencia del menú de
// desafíos, que se arma una sola vez al cargar): qué habilidades están
// disponibles depende del estado de la partida, no es estático.
function renderAbilityList() {
  abilityList.innerHTML = '';
  ABILITIES.forEach((a, i) => {
    const available = abilityAvailable(a);
    const btn = document.createElement('button');
    btn.className = 'menu-item' + (available ? '' : ' disabled');
    btn.disabled = !available;
    btn.innerHTML = `<span class="menu-item-icon">${a.icono}</span>
      <span class="menu-item-text"><strong>${i + 1}. ${a.nombre}</strong><em>${a.desc}</em></span>`;
    if (available) btn.addEventListener('click', () => chooseAbility(a));
    abilityList.appendChild(btn);
  });
}

// Abre el selector: congela la partida igual que la pausa (cancela el rAF),
// pero con overlay propio — #overlay lo comparten pausa y fin de partida, y
// sus botones Reintentar/Menú no pintan nada aquí.
function openAbilityMenu() {
  if (energy < ENERGY_MAX) return;
  choosingAbility = true;
  cancelAnimationFrame(animId);
  renderAbilityList();
  abilityMenu.classList.remove('hidden');
}

// `lastTime = performance.now()` es obligatorio al reanudar (mismo patrón que
// togglePause()): sin él, el primer frame traería como dt toda la duración
// del selector, topada por DT_CAP pero aun así drenando relojes de golpe.
function closeAbilityMenu() {
  choosingAbility = false;
  abilityMenu.classList.add('hidden');
  if (gameOver || paused || inMenu) return; // deshacer pudo haber perdido el desafío al reponer basura
  cancelAnimationFrame(animId);
  lastTime = performance.now();
  animId = requestAnimationFrame(loop);
}

function chooseAbility(ability) {
  if (!choosingAbility || !abilityAvailable(ability)) return;
  if (runAbility(ability) === false) { playTone(160, 120, 0, 'square', 0.1); return; } // rechazada: no cuesta la carga
  energy = 0;
  showBanner(ability); // {icono, nombre, desc} calzan tal cual con showBanner()
  playTone(523, 90);
  playTone(784, 140, 90);
  closeAbilityMenu();
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo >= 2 ? `×${combo}` : '—';
  comboEl.classList.toggle('combo-active', combo >= 2);

  objectiveSection.classList.toggle('hidden', !activeChallenge.metaLineas);
  if (activeChallenge.metaLineas) objectiveEl.textContent = `${lines} / ${activeChallenge.metaLineas}`;

  timerSection.classList.toggle('hidden', !activeChallenge.limiteMs);
  if (activeChallenge.limiteMs) updateTimerDisplay();

  const pct = `${(energy / ENERGY_MAX) * 100}%`;
  if (energyFill.style.width !== pct) energyFill.style.width = pct;
  energySection.classList.toggle('full', energy >= ENERGY_MAX);

  holdSection.classList.toggle('locked', holdUsedThisPiece);
  queueSection.classList.toggle('hidden', preview5Remaining <= 0);
}

// Se escribe en el DOM solo cuando cambia el segundo mostrado (no en cada
// frame): updateHUD() ya hace varias escrituras por evento de puntaje.
function updateTimerDisplay() {
  const totalSec = Math.ceil(challengeRemaining / 1000);
  const text = `${Math.floor(totalSec / 60)}:${String(totalSec % 60).padStart(2, '0')}`;
  if (timerEl.textContent !== text) timerEl.textContent = text;
  timerEl.classList.toggle('timer-urgente', totalSec <= 15);
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

  // FANTASMA: lo asentado se oculta, salvo durante el destello tras bloquear
  // (revealRemaining) o una vez terminada la partida (para ver el resultado).
  const showBoard = !activeChallenge.invisible || revealRemaining > 0 || gameOver;
  if (showBoard) {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        if (board[r][c] === WILD) drawWild(ctx, c, r, BLOCK);
        else if (isNutHole(r, c)) drawNutHole(ctx, c, r, BLOCK);
        else drawBlock(ctx, c, r, board[r][c], BLOCK);
      }
  }

  if (current) {
    // ghost: se mantiene incluso con el tablero oculto (decisión de producto
    // de FANTASMA) — sí revela la altura de la pila en la columna actual, pero
    // es justo la concesión que hace el modo jugable en vez de puramente
    // memorístico.
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

  drawTimers();
}

// Apila las señales de temporizador activas (Congelar, Ralentizar) en la
// esquina superior del tablero en vez de duplicar el bloque por cada una.
function drawTimers() {
  const timers = [];
  if (freezeRemaining > 0) timers.push(`❄ ${(freezeRemaining / 1000).toFixed(1)}s`);
  if (slowRemaining > 0) timers.push(`🐢 ${(slowRemaining / 1000).toFixed(1)}s`);
  if (!timers.length) return;
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--value-color').trim();
  ctx.font = 'bold 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  timers.forEach((text, i) => ctx.fillText(text, canvas.width / 2, 30 + i * 22));
  ctx.restore();
}

// Dibuja una pieza centrada en una rejilla 4×4, con un desplazamiento extra en
// celdas (tileX/tileY) para acomodar varias piezas en un mismo canvas —
// compartido por drawNext(), drawQueue() y drawHold().
function drawPreview(context, piece, size, tileX = 0, tileY = 0) {
  const shape = piece.shape;
  const offX = tileX + Math.floor((4 - shape[0].length) / 2);
  const offY = tileY + Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(context, offX + c, offY + r, shape[r][c], size);
  if (piece.type === NUT) drawNutHole(context, offX + 1, offY + 1, size);
  if (piece.type === POWER) drawPower(context, offX, offY, piece.power, size);
}

function drawNext() {
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  drawPreview(nextCtx, nextQueue[0], 30);
  drawQueue();
}

// VIDENCIA: mientras dure, acomoda las 4 piezas siguientes a la del preview
// normal en una grilla 2×2 (dos por fila) en vez de una columna de 4 — mismo
// contenido, un canvas mucho más corto (160×160 en vez de 100×400).
function drawQueue() {
  queueCtx.clearRect(0, 0, queueCanvas.width, queueCanvas.height);
  if (preview5Remaining <= 0) return;
  for (let i = 0; i < PREVIEW_MAX - 1; i++) {
    const piece = nextQueue[i + 1];
    if (piece) drawPreview(queueCtx, piece, 20, (i % 2) * 4, Math.floor(i / 2) * 4);
  }
}

function drawHold() {
  holdCtx.clearRect(0, 0, holdCanvas.width, holdCanvas.height);
  if (heldPiece) drawPreview(holdCtx, resetPiece(heldPiece), 30);
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

// Punto único de fin de partida, ganada o perdida. Idempotente (if (gameOver)
// return) porque puede alcanzarse desde más de una ruta en el mismo frame —
// p. ej. checkObjective() gana justo cuando spawn() habría hecho topout — y
// sin el guard el segundo endRun() pisaría el título del primero.
function endRun(titulo, detalle, ganada) {
  if (gameOver) return;
  gameOver = true;
  current = null;
  cancelAnimationFrame(animId);
  overlayTitle.textContent = titulo;
  overlayTitle.classList.toggle('win', !!ganada);
  overlayScore.textContent = detalle;
  overlay.classList.remove('hidden');
  draw();
}

function endGame() {
  endRun('GAME OVER', `Puntuación: ${score.toLocaleString()}`, false);
}

function winChallenge() {
  endRun('¡DESAFÍO SUPERADO!', `${lines} líneas · Puntuación: ${score.toLocaleString()}`, true);
}

function loseChallenge(titulo) {
  endRun(titulo, `${lines} líneas · Puntuación: ${score.toLocaleString()}`, false);
}

function togglePause() {
  if (gameOver || inMenu || choosingAbility) return;
  paused = !paused;
  if (!paused) {
    cancelAnimationFrame(animId);
    lastTime = performance.now();
    animId = requestAnimationFrame(loop);
    overlay.classList.add('hidden'); // bug preexistente: reanudar nunca lo ocultaba
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayTitle.classList.remove('win');
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused || choosingAbility) return;
  // Clamp: sin él, una pestaña en segundo plano produce un dt enorme que
  // vaciaría de golpe el reloj de un desafío (antes era casi inocuo: solo
  // drenaba freezeRemaining y provocaba una única caída).
  const dt = Math.min(ts - lastTime, DT_CAP);
  lastTime = ts;

  // Reloj del desafío: se comprueba antes que nada, para que un frame que
  // agota el tiempo se resuelva como fin de tiempo aunque ese mismo frame
  // fuera a bloquear una pieza.
  if (activeChallenge.limiteMs) {
    challengeRemaining = Math.max(0, challengeRemaining - dt);
    updateTimerDisplay();
    if (challengeRemaining <= 0) {
      if (activeChallenge.alAgotarse === 'ganar') winChallenge();
      else loseChallenge('TIEMPO AGOTADO');
      return;
    }
  }

  if (freezeRemaining > 0) {
    freezeRemaining = Math.max(0, freezeRemaining - dt);
    dropAccum = 0; // al descongelar, la caída arranca de cero
  } else {
    // Ralentizar: 10s de tiempo real, independientes de la caída — se
    // descuenta aquí (no dentro del if de más abajo) para que "10s" siga
    // significando 10s aunque la pieza tarde más en caer mientras dura.
    if (slowRemaining > 0) slowRemaining = Math.max(0, slowRemaining - dt);
    dropAccum += dt;
    if (dropAccum >= effectiveDropInterval()) {
      dropAccum = 0;
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        lastActionWasRotate = false;
      } else {
        lockPiece();
      }
    }
  }

  // BASURA: solo acumula mientras la caída no está congelada — si no,
  // Congelar pasaría de power-up a castigo (basura gratis sin poder actuar).
  if (activeChallenge.basuraMs && freezeRemaining === 0) {
    garbageAccum += dt;
    while (garbageAccum >= activeChallenge.basuraMs) {
      garbageAccum -= activeChallenge.basuraMs;
      if (!pushGarbageRow()) { loseChallenge('TE ENTERRARON'); return; }
      garbageSinceLock++; // deshacer necesita saber cuántas re-empujar si revierte el tablero
    }
  }

  if (activeChallenge.invisible) revealRemaining = Math.max(0, revealRemaining - dt);

  if (gameOver || paused || choosingAbility) return;
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
  freezeRemaining = 0;
  combo = 0;
  btbTetris = 0;
  lastActionWasRotate = false;
  gameContainer.classList.remove('flash-perfect');
  hideBanner();

  // Sistema de habilidades: todo vuelve a cero en cada partida nueva.
  energy = 0;
  choosingAbility = false;
  heldPiece = null;
  holdUsedThisPiece = false;
  undoSnapshot = null;
  garbageSinceLock = 0;
  preview5Remaining = 0;
  slowRemaining = 0;
  abilityMenu.classList.add('hidden');

  // Estado del modo desafío. `activeChallenge` NO se toca aquí a propósito:
  // lo fijan startChallenge()/el menú, y restartBtn llama a init() para
  // reiniciar el desafío en curso — si init() lo reseteara, "Reiniciar"
  // devolvería al jugador al modo clásico en silencio.
  challengeRemaining = activeChallenge.limiteMs || 0;
  garbageAccum = 0;
  garbageHoleCol = undefined;
  revealRemaining = 0;
  espejoAvisado = false;
  if (activeChallenge.prefill) prefillBoard(activeChallenge.prefill);
  overlayTitle.classList.remove('win');

  lastTime = performance.now();
  nextQueue = [];
  refillQueue();
  spawn();
  drawHold();
  updateHUD();
  overlay.classList.add('hidden');
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (!audioStarted) { audioStarted = true; ensureAudio(); }
  if (inMenu) return; // sin esto, P "reanudaría" una partida que no existe
  if (choosingAbility) {
    if (e.code === 'Escape') closeAbilityMenu(); // cancela sin gastar la carga
    else if (e.code === 'Space') e.preventDefault(); // no "clickear" el botón con foco
    else if (e.code.startsWith('Digit')) {
      const ability = ABILITIES[Number(e.code.slice(5)) - 1];
      if (ability) chooseAbility(ability);
    }
    return;
  }
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
    case 'KeyE':
      openAbilityMenu();
      break;
    case 'KeyC':
    case 'ShiftLeft':
    case 'ShiftRight':
      holdPiece();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);
menuBtn.addEventListener('click', showMenu);

// Construye la lista de modos una sola vez, reutilizando {icono, nombre, desc}
// de CHALLENGES para el texto de cada botón.
CHALLENGES.forEach(c => {
  const btn = document.createElement('button');
  btn.className = 'menu-item';
  btn.innerHTML = `<span class="menu-item-icon">${c.icono}</span>
    <span class="menu-item-text"><strong>${c.nombre}</strong><em>${c.desc}</em></span>`;
  btn.addEventListener('click', () => startChallenge(c.id));
  menuList.appendChild(btn);
});

function showMenu() {
  cancelAnimationFrame(animId);
  inMenu = true;
  paused = false;
  choosingAbility = false;
  abilityMenu.classList.add('hidden');
  overlay.classList.add('hidden');
  menu.classList.remove('hidden');
}

function startChallenge(id) {
  activeChallenge = CHALLENGES.find(c => c.id === id) || CHALLENGES[0];
  inMenu = false;
  menu.classList.add('hidden');
  init();
  showBanner(activeChallenge); // {icono, nombre, desc} calzan tal cual con showBanner()
}

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

showMenu();
