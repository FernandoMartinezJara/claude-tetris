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

- **Board model**: `ROWS × COLS` matrix; each cell is `0` (empty) or a piece color index `1–7`.
- **Pieces**: `PIECES` array of square matrices (index 0 unused/null). Rotation (`rotateCW`) is transpose + row reversal, not stored per-piece rotation states.
- **Collision** (`collide`): checks board bounds and overlap with locked cells.
- **Wall kicks** (`tryRotate`): after rotating, tries offsets `[0, -1, 1, -2, 2]` until one doesn't collide.
- **Game loop** (`loop`): driven by `requestAnimationFrame`, accumulates elapsed time in `dropAccum` and advances the piece one row once `dropInterval` is exceeded; otherwise calls `lockPiece()`.
- **Line clearing** (`clearLines`): scans bottom-up, splices full rows out and unshifts empty rows at the top.
- **Scoring**: `LINE_SCORES = [0, 100, 300, 500, 800]` multiplied by `level`; hard drop adds 2 points/row dropped, soft drop adds 1 point/row.
- **Leveling/speed**: level = `floor(lines / 10) + 1`; `dropInterval = max(100, 1000 - (level - 1) * 90)` ms.
- **Ghost piece** (`ghostY`): projects the current piece straight down to its landing row, drawn at `globalAlpha = 0.2`.
- **Game over**: triggered in `spawn()` when a freshly spawned piece already collides.

Flow: `init()` builds the board, seeds `next`, calls `spawn()`, and starts the `loop`. Keyboard input (`keydown`) handles move/rotate/soft-drop/hard-drop/pause; `P` toggles pause independent of `gameOver` state.

### Tunable constants (top of `game.js`)

`COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `#board` canvas `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).

## Automatización de issues

Al abrir un issue, o al editar su cuerpo, `.github/workflows/issue-triage.yml` corre a Claude automáticamente para clasificarlo y publicar un diagnóstico técnico como comentario (causa raíz con referencias `archivo:línea`, constantes afectadas, enfoque propuesto, criterios de aceptación). Si el issue menciona `@claude`, lo atiende en su lugar `.github/workflows/claude.yml`.

- **Etiquetas**: `.github/labels.yml` es la fuente de verdad de la taxonomía (`type/*`, `area/*`, `priority/*`, más `needs-info`, `duplicate`, `triaged`, `no-triage`). Se sincronizan a GitHub vía `.github/workflows/labels-sync.yml`; no edites las etiquetas manualmente en GitHub, edita ese archivo.
- **Escotilla manual**: aplicar la etiqueta `no-triage` a un issue impide que el triaje automático se ejecute sobre él.
