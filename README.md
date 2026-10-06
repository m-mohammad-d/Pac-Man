# 🕹️ PAC-MAN 3D // Arcade Experience

A modern, high-performance 3D remake of the classic Pac-Man arcade experience built with **Vanilla TypeScript**, **Three.js**, **Vite**, and **HTML5/CSS3**.

Featuring authentic gameplay mechanics, intelligent ghost AI, procedural retro 8-bit audio, and a calibrated fixed-perspective third-person camera with real-time raycast wall obstruction prevention.

---

## 🌟 Features

* **Classic Gameplay with Modern 3D Visuals**:
  * Faithful 28x31 symmetrical maze layout with corridors, ghost house, and wrap-around warp tunnels.
  * Sleek neon-arcade aesthetic: dark metallic walls with glowing cyan caps, floor grid reflections, and scene fog.
  * Animated 3D Pac-Man model with procedural jaw chomp and directional turning.

* **Original Ghost AI & Personalities**:
  * 🔴 **Blinky (Red)**: Direct pursuer targeting Pac-Man's exact tile.
  * 🌸 **Pinky (Pink)**: Ambush hunter targeting 4 tiles ahead of Pac-Man's trajectory.
  * 🔷 **Inky (Cyan)**: Erratic flanker pivoting across Blinky and Pac-Man.
  * 🟠 **Clyde (Orange)**: Shy pursuer who chases when far and retreats to his corner when close.
  * 👻 **Frightened Mode**: Activated by Power Pellets — ghosts turn flashing blue/white, slow down, and can be eaten for score combos (200, 400, 800, 1600 pts).
  * 👀 **Eaten Mode**: Ghost eyes race back to the ghost house to revive.

* **Arcade Camera Architecture**:
  * **Fixed Third-Person Perspective**: ~54° diagonal pitch keeping corridors ahead clearly readable while preventing control inversion.
  * **Raycast Obstruction Prevention**: Uses Three.js `Raycaster` to detect walls between the camera and Pac-Man, smoothly pulling the camera forward and returning when clear.
  * **Camera Modes**: Gameplay Follow, Cinematic Defeat Zoom, and Menu Attract-Mode Overview.
  * **Frame-Rate Independent Damping**: Exponential smoothing eliminates jitter across 60Hz, 120Hz, and 144Hz displays.

* **Audio & Effects**:
  * Authentic 8-bit sound effects (waka-waka munch, power pellet energizer, siren loop, ghost eat arpeggio, death glissando, victory fanfare).
  * Web Audio synthesis combined with **Howler.js** integration.
  * Particle bursts for pellet collection, ghost defeats, and player dissolution.

* **Responsive UI & Controls**:
  * Cyberpunk scanline and vignette overlay with neon HUD.
  * Real-time score, persistent local high score, level indicator, and remaining lives.
  * Power pellet duration timer countdown bar.
  * On-screen touch/mobile virtual D-pad.

---

## 🎮 Controls

| Action | Primary Key | Secondary / Debug |
| :--- | :--- | :--- |
| **Move Up** | <kbd>W</kbd> | <kbd>↑</kbd> |
| **Move Down** | <kbd>S</kbd> | <kbd>↓</kbd> |
| **Move Left** | <kbd>A</kbd> | <kbd>←</kbd> |
| **Move Right** | <kbd>D</kbd> | <kbd>→</kbd> |
| **Open Settings Menu** | <kbd>Esc</kbd> | Settings HUD Button |
| **Cycle Camera Mode** | <kbd>C</kbd> | Camera HUD Button |
| **Zoom In / Out** | <kbd>+</kbd> / <kbd>=</kbd> | <kbd>-</kbd> / <kbd>_</kbd> |
| **Adjust Camera Pitch** | <kbd>[</kbd> / <kbd>]</kbd> | <kbd>Shift</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> |
| **Adjust Camera Yaw** | <kbd>Shift</kbd> + <kbd>←</kbd> | <kbd>Shift</kbd> + <kbd>→</kbd> |
| **Pause / Resume** | <kbd>P</kbd> | <kbd>Space</kbd> |
| **Mute / Unmute Audio** | <kbd>M</kbd> | Audio HUD Button |

---

## 📁 Project Structure

```
pac-man/
├── index.html                  # Main HTML entry with canvas, HUD & modals
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript strict configuration
├── vite.config.ts              # Vite dev server and build configuration
└── src/
    ├── main.ts                 # Bootstrap and application entry point
    ├── game/
    │   ├── Game.ts             # Central coordinator & game loop
    │   ├── Player.ts           # Pac-Man entity & chomp animation
    │   ├── Ghost.ts            # Ghost entities, AI states & floating animations
    │   ├── Maze.ts             # 3D maze geometry & tunnel wrapping logic
    │   ├── Pellet.ts           # Normal and Power Pellet entities
    │   ├── CollisionSystem.ts  # Spatial hit detection for pellets and ghosts
    │   ├── ScoreManager.ts     # Score, high score persistence & combos
    │   └── GameState.ts        # Game state machine & wave cycles
    ├── graphics/
    │   ├── Renderer.ts         # Three.js WebGLRenderer, tone mapping & fog
    │   ├── CameraController.ts # Third-person arcade camera with raycast collision
    │   ├── Lighting.ts         # Key directional light & dynamic Pac-Man glow
    │   └── Effects.ts          # Particle systems (pellets, ghosts, death)
    ├── entities/
    │   └── Entity.ts           # Base class for scene entities
    ├── audio/
    │   └── SoundManager.ts     # Procedural 8-bit Web Audio synth & Howler
    ├── settings/
    │   ├── SettingsTypes.ts    # Comprehensive game configuration interfaces
    │   └── SettingsManager.ts  # State management, validation & local persistence
    ├── ui/
    │   └── SettingsUI.ts       # Tabbed in-game settings modal & keybinding mapper
    ├── utils/
    │   ├── Constants.ts        # Speeds, directions, colors & timings
    │   └── MathUtils.ts        # Coordinate mappings & interpolation helpers
    └── styles/
        └── main.css            # Neon arcade theme, HUD, and overlays
```

---

## 🚀 Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (version 18+ recommended)
* npm, pnpm, or yarn

### Installation

1. Clone or download the repository:
   ```bash
   git clone https://github.com/<your-username>/pac-man-3d.git
   cd pac-man-3d
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

Start the Vite development server:
```bash
npm run dev
```

Open your browser at `http://localhost:3000` (or the URL shown in your terminal).

### Production Build

Typecheck and generate the optimized production bundle:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

---

## 🛠️ Built With

* [TypeScript](https://www.typescriptlang.org/) — Strictly typed game logic and architecture
* [Three.js](https://threejs.org/) — 3D graphics rendering, shaders, and geometry
* [Vite](https://vitejs.dev/) — Fast next-generation frontend tooling and bundler
* [Howler.js](https://howlerjs.com/) — Web Audio management and playback
* [HTML5 / CSS3](https://developer.mozilla.org/en-US/docs/Web/CSS) — Responsive arcade HUD & overlays

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

