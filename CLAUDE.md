# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A single-page Tetris implementation in vanilla JavaScript (no dependencies, no build step, no package.json). Three files: `index.html` (DOM/canvas structure), `style.css` (dark/retro arcade styling), `game.js` (all game logic, ~300 lines).

## Running

Open `index.html` directly in a browser, or serve it statically:

```bash
python3 -m http.server 8000
# or
npx serve .
```

There is no build, lint, or test tooling in this repo.

## Architecture (`game.js`)

Everything lives in one file with module-level mutable state (`board`, `current`, `next`, `score`, `lines`, `level`, `paused`, `gameOver`, `dropInterval`, etc.) — no classes, no modules.

- **Board model**: `ROWS × COLS` matrix; each cell is `0` (empty), a piece color index `1–12`, or `WILD` (13, a comodín — see Power-ups below). `POWER` (14) is a `COLORS`-only paint index; it never appears on the board.
- **Pieces**: `PIECES` array of square/rectangular matrices (index 0 unused/null), 1–12. Rotation (`rotateCW`) is transpose + row reversal, not stored per-piece rotation states — it works for any matrix shape (3×3, 4×4, 1×1), which is what let the pentominoes below drop in with no changes to rotation/collision/line-clear/render code. Index 8 (`NUT`) is a 3×3 "tuerca" challenge piece — a ring with a non-colliding hole in the center (`[[8,8,8],[8,0,8],[8,8,8]]`); its hole is rendered as a real circle (`drawNutHole`, canvas `destination-out`) both mid-air and once locked (`isNutHole` detects a locked ring by checking all 8 neighbors of an empty cell).
  - **Pentominoes** (5-cell pieces): `PLUS` (9, `+`/X-pentomino — rotationally symmetric, so `tryRotate` produces an identical matrix and is a harmless no-op), `UPENT` (10, `U`), `YPENT` (11, `Y`, the only 4×4 piece besides `I`).
  - **`SINGLE`** (12, `[[12]]`) is a 1×1 reward piece, delivered only after a Tetris (see below) — never drawn by chance.
  - **Draw pools**: `randomPiece()` no longer draws uniformly over `PIECES.length - 1`; it picks from `STANDARD` (the 7 classic tetrominoes) or, with probability `RARE_CHANCE` (0.12), from `RARE` (`NUT`, `PLUS`, `UPENT`, `YPENT`). Both pools resolve to a piece via `makePiece(type)`, which deep-copies the shape from `PIECES` (so `tryRotate` can mutate it) — `powerPiece()` still builds its own object by hand since it carries an extra `power` field.
- **Collision** (`collide`): checks board bounds and overlap with locked cells. `WILD` cells are excluded from the overlap check — comodines are walkable/passable.
- **Reward queue** (`pieceQueue`, a FIFO array of `'single' | 'power'`): `clearLines()` pushes `'single'` on a 4-line clear (Tetris) and `'power'` every `POWER_LINES` (5) lines cleared (counter uses `-=` rather than `%` so an overshoot keeps its remainder toward the next threshold) — pushing `'single'` first means a Tetris that also crosses the power-up threshold delivers both, single before power-up. `nextPiece()` (used by both `spawn()` and `init()` instead of calling `randomPiece()` directly) shifts the queue: `'single'` → `makePiece(SINGLE)`, `'power'` → `powerPiece()`, otherwise `randomPiece()`.
- **Power-ups**: a `powerPiece()` is a normal falling/rotatable 1×1 piece (`type = POWER`) carrying a random entry from `POWERS`, delivered via the reward queue above.
  - The effect fires in `lockPiece()` when `current.type === POWER`: the piece is *not* merged into the board (`applyPower()` runs instead of `merge()`), then `clearLines()` runs as usual so an effect that completes a row (Gravedad, Tinte) still scores.
  - **Bomba**/**Rayo** (`powerBomba`/`powerRayo`) clear a 3×3 area / the full row+column through the landing cell via `destroyCell()` (bounds-checked), scoring `10 × level` per destroyed cell (`scorePower`).
  - **Tinte** (`powerTinte`) finds the most frequent non-`WILD` color on the board and turns every cell of that color into `WILD`.
  - **Gravedad** (`powerGravedad`) compacts each column independently (bottom-up write pointer) so every block falls until it rests — can break a locked tuerca's ring, which `isNutHole` already handles gracefully by no longer recognizing the hole.
  - **Congelar** sets `freezeRemaining = FREEZE_MS`; `loop()` counts it down using the frame's `dt` instead of `setTimeout`, so it naturally stops during pause (`togglePause()` cancels the rAF) and needs no cleanup on `endGame()`/`init()` beyond resetting the variable. Player input (move/rotate/soft/hard drop) is unaffected — only the automatic drop is paused.
  - A temporary banner (`showBanner`/`hideBanner`, `#power-banner` in `index.html`) names the effect on activation and fades out after `BANNER_MS`.
- **Combo/T-spin/B2B/Perfect Clear**: `clearLines()` only mutates the board and returns `cleared` (it no longer scores or queues rewards); `lockPiece()` calls `queueRewards(cleared)` (the `pieceQueue` push logic, shared by the power-up branch and the normal branch) and, only for a normal piece, `resolveClear(cleared, isTSpin)`. A power-up's own effect (e.g. Gravedad/Tinte completing a row) goes through `queueRewards` but **not** `resolveClear` — it can't build/break combo or B2B, and never competes with a combo banner for the shared `#power-banner` element.
  - **T-spin**: `T_PIECE = 3`. `lastActionWasRotate` is set `true` only inside `tryRotate()` on a successful rotation, and `false` on any translation (`ArrowLeft`/`ArrowRight`, `softDrop`, gravity in `loop()`) or on `spawn()`/`init()`. At lock time, `countBlockedCorners(px, py)` counts how many of the T piece's 3×3 bounding-box corners are occupied (out of bounds or a locked cell); `isTSpin` requires the piece to be a T, `lastActionWasRotate`, and ≥3 blocked corners. `hardDrop()` needs no special handling: `lockPiece()` only ever runs once the piece truly can't fall further, so the position checked is always the real landing spot regardless of path. By piece geometry, a T-spin can clear at most 3 lines and a 4-line Tetris can never be a T-spin, so the two bonuses never overlap for the same lock.
  - **Combo**: `combo` increments (capped at `COMBO_CAP`) on any lock that clears ≥1 line, and resets to `0` on a lock that clears none (a 0-line T-spin still resets it, per its own literal "no lines cleared" reading). The line-clear score (`LINE_SCORES[cleared]` or, for a T-spin, `TSPIN_SCORES[cleared]`, both `× level`) is multiplied by `combo`.
  - **B2B**: `btbTetris` increments on a 4-line clear and adds a `+BTB_BONUS_RATIO` bonus from the 2nd consecutive Tetris onward; it resets to `0` on any 1–3 line clear but is untouched by a 0-line lock (standard Tetris B2B semantics — only T-spin is a separate bonus, deliberately not sharing this counter).
  - **Perfect Clear**: `isBoardEmpty()` checked after `clearLines()`; adds a flat `PERFECT_CLEAR_BONUS × level`, additive and **not** multiplied by `combo`.
  - All of the above funnel through `scoreEvent(points, info)`, which applies `points` to `score` and, only when the lock is "notable" (T-spin, Tetris, `combo ≥ 2`, or Perfect Clear — a plain single/double/triple with no combo stays silent on purpose), calls `showClearBanner()` (builds one combined `{icono, nombre, desc}` — e.g. `"TETRIS · B2B ×2 · COMBO ×3"` — reusing the exact same `showBanner()` power-ups use, plus a CSS `flash-perfect` pulse on `.game-container` for a Perfect Clear) and `playClearSound()`.
  - **Sound**: Web Audio API only, no assets. `ensureAudio()` lazily creates/resumes a single `audioCtx` on the first `keydown` (browser autoplay policy requires a user gesture). `playTone(freq, ms, delayMs, type, gain)` is a short oscillator blip with an exponential gain ramp-down; `playClearSound()` picks a distinct cue per event (a short arpeggio for Perfect Clear/Tetris, a two-tone blip for T-spin, a single tone whose pitch rises with `combo` otherwise). `muted` (persisted to `localStorage['tetris-muted']`, toggled by `#sound-toggle`) gates `playTone` itself, so every call site stays a plain unconditional function call.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time in `dropAccum` and advances the piece one row once `dropInterval` is exceeded; otherwise calls `lockPiece()`.
- **Line clearing** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 points/row dropped, soft drop adds 1 point/row.
- **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.
- **Game over**: triggered in `spawn()` when a freshly spawned piece already collides.

Flow: `init()` builds the board, seeds `next`, calls `spawn()`, and starts the `loop`. Keyboard input (`keydown`) handles move/rotate/soft-drop/hard-drop/pause; `P` toggles pause independent of `gameOver` state.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`, `RARE_CHANCE` (odds of a rare piece — tuerca/pentominoes), `POWER_LINES` (lines between power-ups), `FREEZE_MS` (Congelar duration), `BANNER_MS` (banner visibility), `COMBO_CAP`, `TSPIN_SCORES`, `BTB_BONUS_RATIO`, `PERFECT_CLEAR_BONUS`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

## Automatización de issues

Al abrir un issue, o al editar su cuerpo, `.github/workflows/issue-triage.yml` corre a Claude automáticamente para clasificarlo y publicar un diagnóstico técnico como comentario (causa raíz con referencias `archivo:línea`, constantes afectadas, enfoque propuesto, criterios de aceptación). Si el issue menciona `@claude`, lo atiende en su lugar `.github/workflows/claude.yml`.

- **Etiquetas**: `.github/labels.yml` es la fuente de verdad de la taxonomía (`type/*`, `area/*`, `priority/*`, más `needs-info`, `duplicate`, `triaged`, `no-triage`). Se sincronizan a GitHub vía `.github/workflows/labels-sync.yml`; no edites las etiquetas manualmente en GitHub, edita ese archivo.
- **Escotilla manual**: aplicar la etiqueta `no-triage` a un issue impide que el triaje automático se ejecute sobre él.
