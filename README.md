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
  - [Habilidades cargables](#habilidades-cargables)
  - [Combo y bonus](#combo-y-bonus)
  - [Modo desafío](#modo-desafío)
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
- **Habilidades cargables**: una barra de energía se llena al limpiar líneas; al completarse, el jugador elige (no recibe al azar) una de 5 habilidades tácticas (ver [tabla abajo](#habilidades-cargables)).
- **Modo combo y multiplicadores**: rachas de líneas consecutivas multiplican el puntaje, con bonus por T-spin, Tetris consecutivos (B2B) y Perfect Clear, más feedback visual y sonoro (ver [detalle abajo](#combo-y-bonus)).
- **Modo desafío**: un menú inicial ofrece Clásico y 5 retos con objetivo propio — Contrarreloj, Basura, Tablero sucio, Fantasma y Espejo (ver [tabla abajo](#modo-desafío)). Power-ups y combo siguen activos en todos.
- **Pausa** y **Game Over** (o victoria/derrota de desafío) con opción de reintentar o volver al menú.

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
| `E`       | Abrir el selector de habilidades (solo con la barra de energía llena) |

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

## Habilidades cargables

A diferencia de los power-ups (aleatorios, se reciben pasivamente), las habilidades son la contraparte **activa**: el jugador elige cuándo y cuál usar. Una barra de **ENERGÍA** en el panel lateral sube con cada línea limpiada; al llegar al 100% (con cualquier lock que despeje al menos una línea, tanto normal como de un power-up), pulsar `E` congela la partida y abre un selector con las 5 habilidades. Elegir una la ejecuta y vacía la barra por completo — no se acumulan cargas. `Esc` cancela el selector sin gastar nada; con el teclado, `1`–`5` eligen directamente cada opción.

| Icono | Nombre | Efecto |
| ----- | ------ | ------ |
| 🔮 | **Videncia** | Muestra las próximas 5 piezas durante 10 colocaciones |
| 🔄 | **Intercambio** | Cambia la pieza en caída por otra pieza estándar distinta |
| 🐢 | **Lentitud** | La caída automática se ralentiza 2.5× durante 10 segundos |
| ↩️ | **Deshacer** | Revierte tablero, puntaje, líneas, nivel y combo al estado justo antes de la última pieza bloqueada (deshabilitada si aún no se ha colocado ninguna) |
| 📦 | **Reserva** | Guarda la pieza actual y saca la siguiente de la cola; usarla de nuevo intercambia con la guardada |

Una habilidad que no puede aplicarse en ese instante (Intercambio o Reserva sin espacio para aparecer) se rechaza sin cobrar la carga. Deshacer no puede revertir la jugada que terminó la partida o ganó un desafío, y no regala tiempo de reloj: los relojes de desafío y de Congelar/Lentitud solo pueden acortarse al deshacer, nunca alargarse.

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

## Modo desafío

Al cargar la página aparece un menú con **Clásico** (el modo libre de siempre, sin objetivos) y 5 desafíos con meta propia. Power-ups, piezas raras y el sistema de combo siguen activos en todos ellos — cada desafío solo añade reglas encima del juego normal, no le quita nada.

| Icono | Desafío | Objetivo | Regla especial |
| ----- | ------- | -------- | --------------- |
| ⏱️ | **Contrarreloj** | 40 líneas en 2:00 | — |
| 🗑️ | **Basura** | Sobrevivir 2:00 | Cada 10s sube una fila de basura desde abajo, con un hueco que se mantiene alineado 2-3 filas seguidas |
| 🧱 | **Tablero sucio** | 20 líneas | Empieza con 6 filas de escombros ya puestas |
| 👻 | **Fantasma** | 20 líneas | Lo asentado se vuelve invisible; cada pieza que bloqueas revela el tablero ~0,6s. La pieza fantasma se mantiene visible |
| 🪞 | **Espejo** | 20 líneas | Desde el nivel 2, la rotación se invierte (antihoraria) |

Al terminar (por victoria o derrota) aparece un overlay con la opción de **Reintentar** el mismo desafío o volver al **Menú**.

---

## Cómo funciona

El juego se compone de tres archivos que cooperan:

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, `COMBO`, `OBJETIVO`/`TIEMPO` (solo visibles en modo desafío), vista de la siguiente pieza y la lista de controles.
- Un overlay para los estados **PAUSA**, **GAME OVER** y victoria/derrota de desafío, y otro para el **menú** de selección de modo.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js`

Contiene toda la lógica del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía) o un índice de color (1–12) que identifica la pieza.
- **Piezas**: definidas como matrices cuadradas/rectangulares en `PIECES` (1–12). Para rotar se calcula la transposición + reverso de filas (`rotateCW`) — funciona igual para una matriz 3×3, 4×4 o 1×1, así que las piezas raras se sumaron sin tocar la rotación, la colisión ni el renderizado. La pieza 8 es la "tuerca" (`NUT`), un anillo 3×3 con un hueco central que no colisiona (se puede pasar por encima de un bloque bajo el hueco) y que se dibuja como un agujero circular real (`drawNutHole`); su fila solo se puede completar tras romper el anillo por arriba (`isNutHole`). Las piezas 9–11 son los pentominós **+** (`PLUS`), **U** (`UPENT`) e **Y** (`YPENT`); la 12 es el **single** (`SINGLE`, `[[12]]`), que nunca sale por azar.
- **Sorteo de piezas** (`randomPiece`): en vez de elegir uniformemente entre todas, sortea sobre dos grupos — `STANDARD` (las 7 clásicas) casi siempre, o `RARE` (tuerca + los 3 pentominós) con probabilidad `RARE_CHANCE` (12%). Ambos resuelven la pieza con `makePiece(type)`.
- **Cola de piezas y recompensas** (`nextQueue`): un array de al menos `PREVIEW_MAX` (5) piezas ya sorteadas — lo que se ve en el panel es exactamente lo que va a caer. `spawn()` saca la primera y rellena con `randomPiece()` hasta el tope. `queueRewards()` inserta las recompensas (`'single'` al limpiar un Tetris, power-up cada `POWER_LINES` líneas) en el índice 1 de la cola —justo después de la pieza que ya está por convertirse en actual—, así llegan con la misma inmediatez que antes; un Tetris que además completa el umbral de power-up entrega ambas en orden: primero el single, luego el power-up.
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame`, acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval`.
- **Limpieza de líneas** (`clearLines`): recorre el tablero de abajo hacia arriba; cada fila completa se elimina y se inserta una vacía en la cima.
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.
- **Power-ups**: el `'power'` encolado por `clearLines` (ver *Recompensas* arriba) se convierte en un power-up 1×1 al consumirse en `nextPiece`. Al bloquearse (`lockPiece`), no se fusiona en el tablero: dispara su efecto (`applyPower`) y luego corre `clearLines` igual que siempre, así que un efecto que complete una fila puntúa — pero sin pasar por el combo (ver siguiente punto).
- **Combo/T-spin/B2B/Perfect Clear** (`resolveClear`): `clearLines` ya no puntúa, solo devuelve cuántas líneas limpió; `lockPiece` usa ese número para decidir el puntaje final. El combo sube con cada bloqueo consecutivo que limpia líneas (tope ×5) y se reinicia si uno falla; un T-spin (rotar la T como último movimiento y encajarla con al menos 3 de sus 4 esquinas bloqueadas) reemplaza el puntaje normal por una tabla propia; dos Tetris seguidos suman un bonus B2B; y vaciar el tablero por completo suma un bonus fijo aparte. Solo un power-up nunca pasa por aquí — así nunca compite por el mismo banner que un evento de combo.
- **Modo desafío** (`CHALLENGES`, `activeChallenge`): cada desafío es una entrada de datos, no una rama de código — un campo ausente simplemente no activa esa mecánica, y **Clásico es la entrada sin ningún campo especial**. `checkObjective()` (en `lockPiece`, antes de `spawn()`) gana el desafío al alcanzar `metaLineas`; el reloj de `limiteMs` se descuenta en `loop()` con el mismo `dt` (con un tope `DT_CAP` para que una pestaña en segundo plano no lo vacíe de golpe) y termina en victoria o derrota según `alAgotarse`. `basuraMs` sube una fila de basura (`GARBAGE`, índice 15, solo vive en `board`) cada cierto tiempo, reutilizando la misma columna de hueco 2-3 filas para que sea limpiable; `prefill` hace lo mismo de una vez al iniciar. `invisible` oculta lo asentado en `draw()` salvo un destello de `REVEAL_MS` tras cada bloqueo (la pieza fantasma se mantiene visible a propósito). `espejoDesdeNivel` cambia `tryRotate()` a rotación antihoraria (`rotateCCW`, tres `rotateCW` seguidos) desde ese nivel. `endRun()` centraliza el fin de partida (ganada o perdida) y es idempotente, porque una victoria y un topout pueden intentar resolverse en el mismo bloqueo.
- **Habilidades cargables** (`ABILITIES`, `energy`): `queueRewards()` suma energía con cada línea limpiada (tope `ENERGY_MAX`); llena, `E` (`openAbilityMenu`) congela el juego igual que la pausa (cancela el `requestAnimationFrame` y lo retoma con `lastTime` reseteado al cerrar) y abre un selector propio, independiente del overlay de pausa/fin de partida. `takeUndoSnapshot()` guarda, al inicio de cada `lockPiece()`, una copia del tablero/pieza/cola/puntaje — **sin** la energía (se pondría a 0 igual al cobrar la carga) ni el reloj del desafío (es tiempo real, no rebobinable) — para que **Deshacer** pueda restaurar exactamente ese instante; los temporizadores de Congelar/Lentitud solo se acortan al restaurarse, nunca se alargan, y la basura empujada después del bloqueo (`garbageSinceLock`) se vuelve a empujar tras el tablero restaurado. Las demás habilidades mutan `current`/`nextQueue`/`heldPiece` directamente y devuelven `false` sin cobrar la carga cuando no pueden aplicarse (p. ej. no cabe la pieza entrante).

### Flujo del juego

```
init()
  ├─ createBoard()                  → matriz vacía
  ├─ nextQueue = [randomPiece() × PREVIEW_MAX]
  ├─ spawn()                        → saca la primera de nextQueue y la rellena
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt (nada corre si choosingAbility)
     ├─ si dt ≥ dropInterval (o el doble con Lentitud) → baja la pieza o llama a lockPiece()
     ├─ draw()  (grid + tablero + ghost + pieza actual + temporizadores)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa / abrir habilidades (E)
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()` y se muestra el overlay de **Game Over**. Antes de arrancar cualquier partida, `showMenu()` muestra el listado de modos; elegir uno llama a `startChallenge(id)`, que fija `activeChallenge` y recién ahí llama a `init()`. Con la energía llena, `E` interrumpe este ciclo (cancela el `requestAnimationFrame`) para mostrar el selector de habilidades; se retoma exactamente donde quedó al cerrarlo.

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
| `COLORS`       | Paleta de colores por tipo de pieza      | 15 colores            |
| `LINE_SCORES`  | Puntos por 1, 2, 3 o 4 líneas eliminadas | `[0,100,300,500,800]` |
| `dropInterval` | Velocidad inicial de caída en ms         | `1000`                |
| `RARE_CHANCE`  | Probabilidad de pieza rara (tuerca/pentominós) | `0.12`           |
| `POWER_LINES`  | Líneas entre la aparición de un power-up | `5`                    |
| `FREEZE_MS`    | Duración del efecto Congelar en ms       | `5000`                 |
| `COMBO_CAP`    | Tope del multiplicador de combo          | `5`                    |
| `TSPIN_SCORES` | Puntaje de T-spin según líneas limpiadas | `[400,800,1200,1600]`  |
| `BTB_BONUS_RATIO` | % extra por Tetris consecutivos (B2B) | `0.5`                  |
| `PERFECT_CLEAR_BONUS` | Bonus fijo (× nivel) por Perfect Clear | `2000`            |
| `CHALLENGES`   | Catálogo de desafíos (objetivo, reloj, basura, etc.) | 6 entradas  |
| `REVEAL_MS`    | Duración del destello de FANTASMA al bloquear | `600`             |
| `DT_CAP`       | Tope de dt por frame (evita saltos de reloj) | `100`              |
| `PREVIEW_MAX`  | Piezas mínimas en `nextQueue` (profundidad del preview) | `5`           |
| `ENERGY_MAX` / `ENERGY_PER_LINE` | Tope de la barra de energía / ganancia por línea | `100` / `12` |
| `SLOW_MS` / `SLOW_FACTOR` | Duración y multiplicador de la habilidad Lentitud | `10000` / `2.5` |
| `PREVIEW5_PIECES` | Colocaciones que dura la habilidad Videncia | `10`                |
| `ABILITIES`    | Catálogo de habilidades cargables | 5 entradas |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
