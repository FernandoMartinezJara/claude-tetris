# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Power-ups](#power-ups)
  - [Combo y bonus](#combo-y-bonus)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js`](#3-gamejs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L) con colores diferenciados.
- **Piezas raras** (~12% de las veces): la "tuerca" (3×3 con un hueco circular en el centro que no colisiona, pero cuya fila no se puede completar hasta romper el anillo) y **3 pentominós** de 5 bloques — **+** (simétrica, no cambia al rotar), **U** y **Y**.
- **Recompensa de Tetris**: al limpiar 4 líneas de golpe, la siguiente pieza es un **single 1×1**, la más flexible del juego.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel).
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Power-ups aleatorios**: cada 5 líneas limpiadas, la siguiente pieza es un power-up 1×1 (ver [tabla abajo](#power-ups)).
- **Modo combo y multiplicadores**: rachas de líneas consecutivas multiplican el puntaje, con bonus por T-spin, Tetris consecutivos (B2B) y Perfect Clear, más feedback visual y sonoro (ver [detalle abajo](#combo-y-bonus)).
- **Pausa** y **Game Over** con opción de reinicio.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P`       | Pausar / reanudar                 |

También hay un botón de silencio (🔊/🔇) junto al selector de tema, para cortar los efectos sonoros del modo combo; su estado se recuerda entre sesiones.

---

## Power-ups

Cada **5 líneas** limpiadas, la siguiente pieza (visible ya en el panel `NEXT`) es un power-up 1×1: se controla y cae como cualquier otra pieza, y su efecto se dispara solo al bloquearse.

| Icono | Nombre       | Efecto                                                                 |
| ----- | ------------ | ----------------------------------------------------------------------- |
| 💣    | **Bomba**    | Destruye el área 3×3 alrededor de donde aterriza                        |
| ⚡    | **Rayo**     | Limpia toda la fila y toda la columna de aterrizaje                     |
| 🎨    | **Tinte**    | Convierte todos los bloques del color más abundante en comodines        |
| 🧲    | **Gravedad** | Compacta el tablero: cada columna cae hasta eliminar sus huecos         |
| ❄️    | **Congelar** | Detiene la caída automática 5 segundos (los controles siguen activos)   |

Los comodines de **Tinte** son atravesables (las piezas caen a través de ellos) pero cuentan como celda llena al evaluar líneas completas. Bomba y Rayo suman `10 × nivel` puntos por cada bloque destruido. Un banner temporal anuncia el efecto al activarse.

---

## Combo y bonus

Cada bloqueo que limpia líneas puede sumar bonus encima del puntaje base:

| Evento | Cómo se logra | Bonus |
| --- | --- | --- |
| **Combo** | Limpiar líneas en bloqueos consecutivos, sin fallar ninguno entre medio | Multiplica el puntaje de la línea ×2, ×3... hasta ×5; se reinicia si un bloqueo no limpia ninguna línea |
| **T-spin** | Rotar una pieza T hasta encajarla en un hueco (la rotación debe ser el último movimiento) | Puntaje propio (400/800/1200/1600 × nivel según líneas limpiadas), en vez del puntaje normal de línea |
| **B2B Tetris** | Encadenar Tetris (4 líneas) consecutivos, sin que una limpieza de 1-3 líneas rompa la racha | +50% de puntaje extra desde el segundo Tetris seguido |
| **Perfect Clear** | Dejar el tablero completamente vacío al limpiar | +2000 × nivel, aparte del combo activo |

Un bloqueo notable (T-spin, Tetris, combo activo o Perfect Clear) muestra un banner combinado con todas las etiquetas que apliquen (p. ej. "TETRIS · B2B ×2 · COMBO ×3") y un efecto sonoro distinto por tipo de evento; un destello dorado marca además un Perfect Clear. Un single/doble/triple normal sin racha activa queda silencioso a propósito, para que el feedback se sienta especial.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Un overlay para los estados **PAUSA** y **GAME OVER**.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–12) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas/rectangulares en `PIECES` (1–12). Para rotar se calcula la transposición + reverso de filas (`rotateCW`) — funciona igual para una matriz 3×3, 4×4 o 1×1, así que las piezas raras se sumaron sin tocar la rotación, la colisión ni el renderizado. La pieza 8 es la "tuerca" (`NUT`), un anillo 3×3 con un hueco central que no colisiona (se puede pasar por encima de un bloque bajo el hueco) y que se dibuja como un agujero circular real (`drawNutHole`); su fila solo se puede completar tras romper el anillo por arriba (`isNutHole`). Las piezas 9–11 son los pentominós **+** (`PLUS`), **U** (`UPENT`) e **Y** (`YPENT`); la 12 es el **single** (`SINGLE`, `[[12]]`), que nunca sale por azar.
- **Sorteo de piezas** (`randomPiece`): en vez de elegir uniformemente entre todas, sortea sobre dos grupos — `STANDARD` (las 7 clásicas) casi siempre, o `RARE` (tuerca + los 3 pentominós) con probabilidad `RARE_CHANCE` (12%). Ambos resuelven la pieza con `makePiece(type)`.
- **Recompensas** (`pieceQueue`): una cola FIFO que `clearLines` llena — `'single'` al limpiar un Tetris (4 líneas) y `'power'` cada `POWER_LINES` líneas. `nextPiece()` va vaciando la cola antes de sortear, así que un Tetris que además complete el umbral de power-up entrega ambas recompensas en orden: primero el single, luego el power-up.
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Power-ups**: el `'power'` encolado por `clearLines` (ver *Recompensas* arriba) se convierte en un power-up 1×1 al consumirse en `nextPiece`. Al bloquearse (`lockPiece`), no se fusiona en el tablero: dispara su efecto (`applyPower`) y luego corre `clearLines` igual que siempre, así que un efecto que complete una fila puntúa — pero sin pasar por el combo (ver siguiente punto).
- **Combo/T-spin/B2B/Perfect Clear** (`resolveClear`): `clearLines` ya no puntúa, solo devuelve cuántas líneas limpió; `lockPiece` usa ese número para decidir el puntaje final. El combo sube con cada bloqueo consecutivo que limpia líneas (tope ×5) y se reinicia si uno falla; un T-spin (rotar la T como último movimiento y encajarla con al menos 3 de sus 4 esquinas bloqueadas) reemplaza el puntaje normal por una tabla propia; dos Tetris seguidos suman un bonus B2B; y vaciar el tablero por completo suma un bonus fijo aparte. Solo un power-up nunca pasa por aquí — así nunca compite por el mismo banner que un evento de combo.

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego.
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y canvas
├── style.css       # Estilos del juego (dark theme)
├── game.js         # Toda la lógica del Tetris (~300 líneas)
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear en `game.js`:

| Constante      | Significado                              | Por defecto           |
| -------------- | ---------------------------------------- | --------------------- |
| `COLS`         | Columnas del tablero                     | `10`                  |
| `ROWS`         | Filas del tablero                        | `20`                  |
| `BLOCK`        | Tamaño en píxeles de cada celda          | `30`                  |
| `COLORS`       | Paleta de colores por tipo de pieza      | 14 colores            |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |
| `RARE_CHANCE`  | Probabilidad de pieza rara (tuerca/pentominós) | `0.12`           |
| `POWER_LINES`  | Líneas entre la aparición de un power-up | `5`                    |
| `FREEZE_MS`    | Duración del efecto Congelar en ms       | `5000`                 |
| `COMBO_CAP`    | Tope del multiplicador de combo          | `5`                    |
| `TSPIN_SCORES` | Puntaje de T-spin según líneas limpiadas | `[400,800,1200,1600]`  |
| `BTB_BONUS_RATIO` | % extra por Tetris consecutivos (B2B) | `0.5`                  |
| `PERFECT_CLEAR_BONUS` | Bonus fijo (× nivel) por Perfect Clear | `2000`            |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
