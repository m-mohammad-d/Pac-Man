import { Renderer } from '../graphics/Renderer';
import { CameraController } from '../graphics/CameraController';
import { Lighting } from '../graphics/Lighting';
import { Effects } from '../graphics/Effects';
import { Maze } from './Maze';
import { Player } from './Player';
import { Ghost } from './Ghost';
import { Pellet } from './Pellet';
import { CollisionSystem } from './CollisionSystem';
import { ScoreManager } from './ScoreManager';
import { GameStateManager, PlayState } from './GameState';
import { SoundManager } from '../audio/SoundManager';
import { SettingsManager } from '../settings/SettingsManager';
import { SettingsUI } from '../ui/SettingsUI';
import { GameSettings } from '../settings/SettingsTypes';
import {
  Direction,
  GhostType,
  GhostMode,
  PELLET_SCORE,
  POWER_PELLET_SCORE,
  CameraMode,
  TILE_SIZE
} from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';
import { MobileController } from '../input/MobileController';
import { ResponsiveManager } from '../utils/ResponsiveManager';
import { HapticManager } from '../utils/HapticManager';

export class Game {
  private renderer: Renderer;
  private cameraController: CameraController;
  private lighting: Lighting;
  private effects: Effects;

  private maze: Maze;
  private player: Player;
  private ghosts: Ghost[] = [];
  private pellets: Pellet[] = [];

  private collisionSystem: CollisionSystem;
  private scoreManager: ScoreManager;
  private gameState: GameStateManager;
  private soundManager: SoundManager;

  // Mobile, Touch, and Responsive Systems
  private mobileController: MobileController;
  private responsiveManager: ResponsiveManager;
  private hapticManager: HapticManager;

  // Settings & Configuration
  private settingsManager: SettingsManager;
  private settingsUI: SettingsUI;

  // DOM Elements
  private hudScore: HTMLElement | null = null;
  private hudHighScore: HTMLElement | null = null;
  private hudLevel: HTMLElement | null = null;
  private hudLives: HTMLElement | null = null;
  private powerTimerContainer: HTMLElement | null = null;
  private powerTimerBar: HTMLElement | null = null;
  private gameBanner: HTMLElement | null = null;
  private cameraBadge: HTMLElement | null = null;
  private soundIcon: HTMLElement | null = null;
  private pauseIcon: HTMLElement | null = null;
  private devHud: HTMLElement | null = null;
  private subtitlesBanner: HTMLElement | null = null;

  private startModal: HTMLElement | null = null;
  private pauseModal: HTMLElement | null = null;
  private gameOverModal: HTMLElement | null = null;
  private victoryModal: HTMLElement | null = null;
  private gameOverFinalScore: HTMLElement | null = null;
  private victoryScore: HTMLElement | null = null;

  // Diagnostics & performance
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private smoothedFps: number = 60;
  private subtitleTimer: number = 0;
  private fpsHistory: number[] = [];
  private dynamicQualityCooldown: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);
    this.cameraController = new CameraController(this.renderer.getAspectRatio());
    this.lighting = new Lighting();
    this.effects = new Effects();

    this.renderer.scene.add(this.lighting.group);
    this.renderer.scene.add(this.effects.group);

    this.maze = new Maze();
    this.renderer.scene.add(this.maze.group);
    this.cameraController.setObstacleRoot(this.maze.group);
    this.cameraController.setMode(CameraMode.MENU);

    this.player = new Player(this.maze);
    this.renderer.scene.add(this.player.mesh);

    this.collisionSystem = new CollisionSystem();
    this.scoreManager = new ScoreManager();
    this.gameState = new GameStateManager();
    this.soundManager = new SoundManager();

    // Mobile & Device Subsystems
    this.responsiveManager = ResponsiveManager.getInstance();
    this.hapticManager = HapticManager.getInstance();

    // Initialize Settings Architecture
    this.settingsManager = SettingsManager.getInstance();
    const currentSettings = this.settingsManager.getSettings();

    // Auto-detect mobile devices for optimal initial preset if on default desktop settings
    if (this.responsiveManager.isMobile()) {
      if (currentSettings.graphics.preset === 'high') {
        const isConstrained = typeof navigator !== 'undefined' && navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;
        this.settingsManager.applyQualityPreset(isConstrained ? 'mobile_low' : 'mobile_medium');
      }
    }

    this.settingsUI = new SettingsUI(this.settingsManager);

    this.settingsUI.setCallbacks({
      onApply: () => {
        this.applyAllSettings(this.settingsManager.getSettings());
      },
      onTeleport: () => {
        const start = this.maze.getPacmanStartTile();
        this.player.tileX = start.x;
        this.player.tileZ = start.z;
        this.player.nextTileX = start.x;
        this.player.nextTileZ = start.z;
        this.player.progress = 0;
        const world = MathUtils.gridToWorld(start.x, start.z, this.maze.width, this.maze.height, TILE_SIZE);
        this.player.setPosition(world.x, 0.1, world.z);
        this.cameraController.resetImmediate(this.player.position);
      },
      onLevelSkip: (lvl: number) => {
        this.scoreManager.level = lvl - 1;
        this.startNextLevel();
      }
    });

    this.settingsManager.subscribe((settings) => {
      this.applyAllSettings(settings);
    });

    // Initialize Mobile Touch Controller
    this.mobileController = new MobileController({
      mode: currentSettings.controls.mobileControlsMode,
      sizePreset: currentSettings.controls.joystickSize,
      enabled: currentSettings.controls.touchControlsEnabled,
      onDirection: (dir) => {
        if (this.gameState.currentState === PlayState.PLAYING) {
          this.player.setRequestedDirection(dir);
        }
      }
    });

    // Handle Orientation and Resize Changes via ResponsiveManager
    this.responsiveManager.subscribe(() => {
      this.cameraController.updateAspect(this.renderer.getAspectRatio());
    });

    this.initGhosts();
    this.initPellets();
    this.initDOM();
    this.initInput();

    // Initial application of settings
    this.applyAllSettings(this.settingsManager.getSettings());
  }

  private applyAllSettings(s: GameSettings): void {
    // 1. Graphics
    this.renderer.applySettings(s.graphics);
    this.lighting.applySettings(s.graphics);
    this.effects.qualityMultiplier = s.graphics.particleQuality;

    // 2. Audio
    this.soundManager.applySettings(s.audio);
    this.soundManager.onSubtitle = (text) => this.showSubtitle(text);

    // 3. Camera
    this.cameraController.applyCustomSettings(s.camera);

    // 4. Gameplay
    this.player.speedMultiplier = s.gameplay.playerSpeedMultiplier;
    this.ghosts.forEach((g) => {
      g.speedMultiplier = s.gameplay.ghostSpeedMultiplier;
      g.setColorblindMode(s.accessibility.colorblindMode);
    });
    this.collisionSystem.forgiveness = s.gameplay.collisionForgiveness;
    this.collisionSystem.godMode = s.developer.godMode || s.developer.invincible;
    this.scoreManager.startingLives = s.gameplay.startingLives;
    this.scoreManager.extraLivesFrequency = s.gameplay.extraLivesFrequency;

    // 5. Controls & Mobile
    if (this.mobileController) {
      this.mobileController.setMode(s.controls.mobileControlsMode);
      this.mobileController.setSizePreset(s.controls.joystickSize);
      this.mobileController.setEnabled(s.controls.touchControlsEnabled);
    }

    // 6. Accessibility & Haptics
    this.hapticManager.enabled = s.accessibility.hapticsEnabled;
    document.body.classList.toggle('high-contrast', s.accessibility.highContrast);
    document.documentElement.style.fontSize = `${(s.accessibility.uiScale / 100) * 16}px`;

    // 7. Developer HUD
    if (this.devHud) {
      if (s.developer.fpsCounter || s.graphics.showFps || s.developer.showCoordinates) {
        this.devHud.classList.remove('hidden');
      } else {
        this.devHud.classList.add('hidden');
      }
    }
  }

  private initGhosts(): void {
    const ghostTypes = [
      GhostType.BLINKY,
      GhostType.PINKY,
      GhostType.INKY,
      GhostType.CLYDE
    ];

    let blinkyInstance: Ghost | null = null;

    ghostTypes.forEach((type) => {
      const ghost = new Ghost(type, this.maze, this.player);
      this.ghosts.push(ghost);
      this.renderer.scene.add(ghost.mesh);
      if (type === GhostType.BLINKY) {
        blinkyInstance = ghost;
      }
    });

    if (blinkyInstance) {
      this.ghosts.forEach((g) => g.setBlinkyRef(blinkyInstance!));
    }
  }

  private initPellets(): void {
    for (let z = 0; z < this.maze.height; z++) {
      for (let x = 0; x < this.maze.width; x++) {
        const char = this.maze.grid[z][x];
        if (char === '.' || char === '*') {
          const isPower = char === '*';
          const pellet = new Pellet(x, z, isPower, this.maze.width, this.maze.height);
          this.pellets.push(pellet);
          this.renderer.scene.add(pellet.mesh);
        }
      }
    }
    this.scoreManager.pelletsRemaining = this.pellets.length;
  }

  private initDOM(): void {
    this.hudScore = document.getElementById('hud-score');
    this.hudHighScore = document.getElementById('hud-high-score');
    this.hudLevel = document.getElementById('hud-level');
    this.hudLives = document.getElementById('hud-lives');
    this.powerTimerContainer = document.getElementById('power-timer-container');
    this.powerTimerBar = document.getElementById('power-timer-bar');
    this.gameBanner = document.getElementById('game-banner');
    this.cameraBadge = document.getElementById('camera-badge');
    this.soundIcon = document.getElementById('sound-icon');
    this.pauseIcon = document.getElementById('pause-icon');
    this.devHud = document.getElementById('dev-hud');
    this.subtitlesBanner = document.getElementById('subtitles-banner');

    this.startModal = document.getElementById('start-modal');
    this.pauseModal = document.getElementById('pause-modal');
    this.gameOverModal = document.getElementById('gameover-modal');
    this.victoryModal = document.getElementById('victory-modal');
    this.gameOverFinalScore = document.getElementById('gameover-final-score');
    this.victoryScore = document.getElementById('victory-score');

    this.scoreManager.setCallbacks(
      (score, highScore) => {
        if (this.hudScore) this.hudScore.textContent = score.toString();
        if (this.hudHighScore) this.hudHighScore.textContent = highScore.toString();
      },
      (lives) => {
        if (this.hudLives) {
          this.hudLives.innerHTML = '';
          for (let i = 0; i < lives; i++) {
            const icon = document.createElement('div');
            icon.className = 'life-icon';
            this.hudLives.appendChild(icon);
          }
        }
      },
      (level) => {
        if (this.hudLevel) this.hudLevel.textContent = level.toString();
      }
    );

    // Modal & Action buttons
    document.getElementById('btn-start')?.addEventListener('click', () => {
      this.startGame();
    });

    document.getElementById('btn-restart')?.addEventListener('click', () => {
      this.restartGame();
    });

    document.getElementById('btn-next-level')?.addEventListener('click', () => {
      this.startNextLevel();
    });

    document.getElementById('btn-camera')?.addEventListener('click', () => {
      this.cycleCamera();
    });

    document.getElementById('btn-settings')?.addEventListener('click', () => {
      this.settingsUI.toggle();
    });

    document.getElementById('btn-sound')?.addEventListener('click', () => {
      this.toggleSound();
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      this.togglePause();
    });

    // Pause Menu Modal Actions
    document.getElementById('btn-pause-resume')?.addEventListener('click', () => {
      this.resumeGame();
    });

    document.getElementById('btn-pause-restart')?.addEventListener('click', () => {
      if (this.pauseModal) this.pauseModal.classList.add('hidden');
      this.restartGame();
    });

    document.getElementById('btn-pause-settings')?.addEventListener('click', () => {
      this.settingsUI.open();
    });

    // Mobile Virtual Controls
    const bindTouchDir = (id: string, dir: Direction) => {
      const el = document.getElementById(id);
      if (el) {
        const handler = (e: Event) => {
          e.preventDefault();
          this.player.setRequestedDirection(dir);
        };
        el.addEventListener('touchstart', handler, { passive: false });
        el.addEventListener('mousedown', handler);
      }
    };

    bindTouchDir('dpad-up', Direction.UP);
    bindTouchDir('dpad-down', Direction.DOWN);
    bindTouchDir('dpad-left', Direction.LEFT);
    bindTouchDir('dpad-right', Direction.RIGHT);

    this.updateCameraBadge();
  }

  private initInput(): void {
    window.addEventListener('keydown', (e) => {
      const c = this.settingsManager.getSettings().controls;

      // Settings menu toggle
      if (e.code === c.openMenu || (e.code === 'Escape' && !this.settingsUI.getIsOpen())) {
        e.preventDefault();
        this.settingsUI.toggle();
        return;
      }

      if (this.settingsUI.getIsOpen()) return;

      // Player Movement (Rebindable + Defaults)
      if (e.code === c.moveUp || e.code === 'KeyW' || e.code === 'ArrowUp') {
        if (e.shiftKey || e.altKey) {
          this.cameraController.adjustPitch(0.04);
        } else {
          e.preventDefault();
          this.player.setRequestedDirection(Direction.UP);
        }
      } else if (e.code === c.moveDown || e.code === 'KeyS' || e.code === 'ArrowDown') {
        if (e.shiftKey || e.altKey) {
          this.cameraController.adjustPitch(-0.04);
        } else {
          e.preventDefault();
          this.player.setRequestedDirection(Direction.DOWN);
        }
      } else if (e.code === c.moveLeft || e.code === 'KeyA' || e.code === 'ArrowLeft') {
        if (e.shiftKey || e.altKey) {
          this.cameraController.adjustYaw(0.05);
        } else {
          e.preventDefault();
          this.player.setRequestedDirection(Direction.LEFT);
        }
      } else if (e.code === c.moveRight || e.code === 'KeyD' || e.code === 'ArrowRight') {
        if (e.shiftKey || e.altKey) {
          this.cameraController.adjustYaw(-0.05);
        } else {
          e.preventDefault();
          this.player.setRequestedDirection(Direction.RIGHT);
        }
      } else if (e.code === c.cycleCamera || e.code === 'KeyC') {
        this.cycleCamera();
      } else if (e.code === c.pause || e.code === 'Space') {
        this.togglePause();
      } else if (e.code === c.restart) {
        this.restartGame();
      } else if (e.code === 'Equal' || e.code === 'NumpadAdd') {
        this.cameraController.zoomIn();
      } else if (e.code === 'Minus' || e.code === 'NumpadSubtract') {
        this.cameraController.zoomOut();
      } else if (e.code === 'BracketLeft') {
        this.cameraController.adjustPitch(-0.05);
      } else if (e.code === 'BracketRight') {
        this.cameraController.adjustPitch(0.05);
      } else if (e.code === 'KeyM') {
        this.toggleSound();
      }
    });

    window.addEventListener('resize', () => {
      this.cameraController.updateAspect(this.renderer.getAspectRatio());
    });
  }

  public start(): void {
    this.isRunning = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private startGame(): void {
    if (this.startModal) this.startModal.classList.add('hidden');
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    this.scoreManager.resetGame();
    this.resetField();
    this.gameState.setState(PlayState.READY);
    this.showBanner('READY!');
  }

  private restartGame(): void {
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    this.scoreManager.resetGame();
    this.resetAllPellets();
    this.resetField();
    this.gameState.setState(PlayState.READY);
    this.showBanner('READY!');
  }

  private startNextLevel(): void {
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    if (this.pauseModal) this.pauseModal.classList.add('hidden');
    this.scoreManager.nextLevel();
    this.resetAllPellets();
    this.resetField();

    const speedBoost = Math.min(2.0, (this.scoreManager.level - 1) * 0.4);
    const speedMult = this.settingsManager.getSettings().gameplay.ghostSpeedMultiplier;
    this.ghosts.forEach((g) => {
      g.speed = (5.2 + speedBoost) * speedMult;
    });
    this.gameState.setState(PlayState.READY);
    this.showBanner('LEVEL ' + this.scoreManager.level);
  }

  private resetField(): void {
    this.player.reset();
    this.ghosts.forEach((g) => g.reset());
    this.gameState.resetWaveCycle();
    this.effects.clear();
    this.hidePowerBar();
    this.cameraController.setMode(CameraMode.GAMEPLAY);
    this.updateCameraBadge();
    this.cameraController.resetImmediate(this.player.position);
  }

  private resetAllPellets(): void {
    this.pellets.forEach((p) => p.reset());
    this.scoreManager.pelletsRemaining = this.pellets.length;
  }

  private cycleCamera(): void {
    this.cameraController.toggleMode();
    this.updateCameraBadge();
  }

  private updateCameraBadge(): void {
    if (this.cameraBadge) {
      const mode = this.cameraController.mode;
      if (mode === CameraMode.GAMEPLAY) this.cameraBadge.textContent = '3RD PERSON';
      else if (mode === CameraMode.OVERVIEW) this.cameraBadge.textContent = 'OVERVIEW';
      else if (mode === CameraMode.MENU) this.cameraBadge.textContent = 'ATTRACT';
    }
  }

  private togglePause(): void {
    if (this.gameState.currentState === PlayState.PLAYING) {
      this.gameState.currentState = PlayState.PAUSED;
      if (this.pauseModal) this.pauseModal.classList.remove('hidden');
      if (this.pauseIcon) this.pauseIcon.textContent = '▶️';
      this.soundManager.stopSiren();
    } else if (this.gameState.currentState === PlayState.PAUSED) {
      this.resumeGame();
    }
  }

  private resumeGame(): void {
    if (this.gameState.currentState === PlayState.PAUSED) {
      this.gameState.currentState = PlayState.PLAYING;
      if (this.pauseModal) this.pauseModal.classList.add('hidden');
      if (this.pauseIcon) this.pauseIcon.textContent = '⏸️';
      this.hideBanner();
      this.soundManager.startSiren();
    }
  }

  private toggleSound(): void {
    const isMuted = this.soundManager.toggleMute();
    if (this.soundIcon) {
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    }
  }

  private showBanner(text: string): void {
    if (this.gameBanner) {
      this.gameBanner.textContent = text;
      this.gameBanner.classList.remove('hidden');
    }
  }

  private hideBanner(): void {
    if (this.gameBanner) {
      this.gameBanner.classList.add('hidden');
    }
  }

  private showPowerBar(progress: number): void {
    if (this.powerTimerContainer) this.powerTimerContainer.style.display = 'block';
    if (this.powerTimerBar) {
      this.powerTimerBar.style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    }
  }

  private hidePowerBar(): void {
    if (this.powerTimerContainer) this.powerTimerContainer.style.display = 'none';
  }

  private showSubtitle(text: string): void {
    if (!this.settingsManager.getSettings().accessibility.subtitles) return;
    if (this.subtitlesBanner) {
      this.subtitlesBanner.textContent = text;
      this.subtitlesBanner.classList.remove('hidden');
      this.subtitleTimer = 1.6;
    }
  }

  private pollGamepad(): void {
    const s = this.settingsManager.getSettings();
    if (!s.controls.gamepadEnabled) return;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (!gamepads || !gamepads[0]) return;
    const gp = gamepads[0];
    if (!gp) return;

    const deadzone = s.controls.gamepadDeadzone;
    const axisX = gp.axes[0] || 0;
    const axisY = gp.axes[1] || 0;

    if (axisY < -deadzone || gp.buttons[12]?.pressed) {
      this.player.setRequestedDirection(Direction.UP);
    } else if (axisY > deadzone || gp.buttons[13]?.pressed) {
      this.player.setRequestedDirection(Direction.DOWN);
    } else if (axisX < -deadzone || gp.buttons[14]?.pressed) {
      this.player.setRequestedDirection(Direction.LEFT);
    } else if (axisX > deadzone || gp.buttons[15]?.pressed) {
      this.player.setRequestedDirection(Direction.RIGHT);
    }

    if (gp.buttons[9]?.pressed) { // Start/Pause button
      this.togglePause();
    }
  }

  private gameLoop(time: number): void {
    if (!this.isRunning) return;

    const s = this.settingsManager.getSettings();

    // Battery Saver Mode: Cap at ~30 FPS to reduce GPU heat and battery draw
    if (s.graphics.batterySaver && (time - this.lastTime) < 31) {
      requestAnimationFrame(this.gameLoop.bind(this));
      return;
    }

    const rawDelta = Math.min((time - this.lastTime) / 1000, 0.1);
    this.lastTime = time;

    // Smoothed FPS for diagnostics & dynamic quality detection
    const currentFps = 1 / (rawDelta || 0.016);
    this.smoothedFps = Math.round(this.smoothedFps * 0.9 + currentFps * 0.1);

    // Dynamic Quality Monitoring
    if (s.graphics.dynamicQuality) {
      this.fpsHistory.push(currentFps);
      if (this.fpsHistory.length > 90) this.fpsHistory.shift();

      if (this.dynamicQualityCooldown > 0) {
        this.dynamicQualityCooldown -= rawDelta;
      } else if (this.fpsHistory.length >= 60) {
        const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
        if (avgFps < 38) {
          this.triggerDynamicQualityDowngrade();
        }
      }
    }

    // Apply Game Speed Multiplier
    const effectiveDelta = rawDelta * s.gameplay.gameSpeedMultiplier;

    this.update(effectiveDelta, rawDelta);
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private triggerDynamicQualityDowngrade(): void {
    const s = this.settingsManager.getSettings();
    const curPreset = s.graphics.preset;
    let nextPreset: any = null;

    if (curPreset === 'ultra' || curPreset === 'high') {
      nextPreset = this.responsiveManager.isMobile() ? 'mobile_medium' : 'medium';
    } else if (curPreset === 'medium' || curPreset === 'mobile_high') {
      nextPreset = this.responsiveManager.isMobile() ? 'mobile_low' : 'low';
    } else if (curPreset === 'mobile_medium') {
      nextPreset = 'mobile_low';
    }

    if (nextPreset) {
      this.settingsManager.applyQualityPreset(nextPreset);
      this.dynamicQualityCooldown = 18.0;
      this.fpsHistory = [];
      this.showSubtitle(`⚡ Performance adjusted: switched to ${nextPreset} for smooth 60 FPS`);
    }
  }

  private update(deltaTime: number, realDelta: number): void {
    const s = this.settingsManager.getSettings();

    // Effects update
    this.effects.update(deltaTime);

    // Subtitle timer
    if (this.subtitleTimer > 0) {
      this.subtitleTimer -= realDelta;
      if (this.subtitleTimer <= 0 && this.subtitlesBanner) {
        this.subtitlesBanner.classList.add('hidden');
      }
    }

    // Developer HUD update
    if (this.devHud && (s.developer.fpsCounter || s.graphics.showFps || s.developer.showCoordinates)) {
      let content = '';
      if (s.developer.fpsCounter || s.graphics.showFps) {
        content += `<div>⚡ FPS: ${this.smoothedFps} (${(realDelta * 1000).toFixed(1)}ms)</div>`;
      }
      if (s.developer.showCoordinates) {
        content += `<div>📍 Pac-Man: [${this.player.tileX}, ${this.player.tileZ}] (${this.player.position.x.toFixed(1)}, ${this.player.position.z.toFixed(1)})</div>`;
        content += `<div>👻 Blinky: [${this.ghosts[0]?.tileX}, ${this.ghosts[0]?.tileZ}]</div>`;
      }
      if (s.developer.godMode || s.developer.invincible) {
        content += `<div style="color: #ffe600; font-weight: bold;">🛡️ GOD MODE ACTIVE</div>`;
      }
      this.devHud.innerHTML = content;
    }

    // Gamepad polling
    this.pollGamepad();

    // Update Game State Timers
    const { stateChanged, waveChanged, frightenedEnded } = this.gameState.updateTimers(deltaTime);

    if (stateChanged) {
      if (this.gameState.currentState === PlayState.PLAYING) {
        this.hideBanner();
        this.soundManager.startSiren();
      } else if (this.gameState.currentState === PlayState.PLAYER_DYING) {
        if (this.scoreManager.lives > 0) {
          this.resetField();
          this.gameState.setState(PlayState.READY);
          this.showBanner('READY!');
        } else {
          this.handleGameOver();
        }
      }
    }

    if (waveChanged && !this.gameState.isFrightenedActive()) {
      const mode = s.gameplay.reducedGhostAggression ? GhostMode.SCATTER : this.gameState.currentWaveMode;
      this.ghosts.forEach((g) => {
        if (g.mode !== GhostMode.EATEN && g.mode !== GhostMode.FRIGHTENED) {
          g.mode = mode;
        }
      });
    }

    if (frightenedEnded) {
      this.ghosts.forEach((g) => g.restoreMode());
      this.scoreManager.resetGhostStreak();
      this.hidePowerBar();
    }

    // Power Pellet UI timer bar & flashing
    if (this.gameState.isFrightenedActive()) {
      const maxDuration = s.gameplay.powerPelletDuration;
      const progress = this.gameState.frightenedTimer / maxDuration;
      this.showPowerBar(progress);
      this.ghosts.forEach((g) => g.updateFrightenedFlash(this.gameState.frightenedTimer));
    }

    // Main Gameplay logic
    if (this.gameState.currentState === PlayState.PLAYING) {
      this.player.update(deltaTime);

      this.ghosts.forEach((ghost) => {
        ghost.update(deltaTime);
      });

      this.pellets.forEach((pellet) => {
        pellet.update(deltaTime);
      });

      // Check Pellet Collisions
      const hitPellet = this.collisionSystem.checkPelletCollision(this.player, this.pellets);
      if (hitPellet) {
        hitPellet.collect();
        this.scoreManager.pelletsRemaining--;

        if (hitPellet.isPowerPellet) {
          this.scoreManager.addScore(POWER_PELLET_SCORE);
          this.scoreManager.resetGhostStreak();
          this.gameState.triggerFrightened(s.gameplay.powerPelletDuration);
          this.ghosts.forEach((g) => g.setFrightened());
          this.soundManager.playPowerPellet();
          this.hapticManager.powerPellet();
          this.effects.spawnPelletBurst(hitPellet.position, true);

          if (s.accessibility.screenShake) {
            this.cameraController.triggerScreenShake(0.4);
          }
        } else {
          this.scoreManager.addScore(PELLET_SCORE);
          this.soundManager.playWaka();
          this.hapticManager.pellet();
          this.effects.spawnPelletBurst(hitPellet.position, false);
        }

        // Level Clear condition
        if (this.scoreManager.pelletsRemaining <= 0) {
          this.handleLevelCleared();
          return;
        }
      }

      // Check Ghost Collisions
      const ghostHit = this.collisionSystem.checkGhostCollision(this.player, this.ghosts);
      if (ghostHit) {
        if (ghostHit.type === 'EAT_GHOST') {
          ghostHit.ghost.setEaten();
          this.scoreManager.eatGhost();
          this.soundManager.playEatGhost();
          this.hapticManager.eatGhost();
          this.effects.spawnGhostBurst(ghostHit.ghost.position);

          if (s.accessibility.screenShake) {
            this.cameraController.triggerScreenShake(0.6);
          }
        } else if (ghostHit.type === 'KILL_PLAYER') {
          this.handlePlayerDeath();
        }
      }
    } else if (this.gameState.currentState === PlayState.PLAYER_DYING) {
      const progress = 1.0 - (this.gameState.deathTimer / 1.6);
      this.player.playDeathAnimation(progress);
    }

    // Update dynamic lights & camera
    this.lighting.updatePacmanLight(this.player.position);
    const isDying = this.gameState.currentState === PlayState.PLAYER_DYING;
    this.cameraController.update(
      this.player.position,
      realDelta,
      isDying
    );
  }

  private handlePlayerDeath(): void {
    const s = this.settingsManager.getSettings();
    this.soundManager.stopSiren();
    this.soundManager.playDeath();
    this.hapticManager.death();
    this.effects.spawnDeathBurst(this.player.position);

    if (s.accessibility.screenShake) {
      this.cameraController.triggerScreenShake(0.8);
    }

    this.scoreManager.loseLife();
    this.gameState.setState(PlayState.PLAYER_DYING);
  }

  private handleGameOver(): void {
    this.soundManager.stopSiren();
    this.gameState.setState(PlayState.GAME_OVER);
    this.cameraController.setMode(CameraMode.MENU);
    this.updateCameraBadge();
    if (this.gameOverFinalScore) {
      this.gameOverFinalScore.textContent = this.scoreManager.score.toString();
    }
    if (this.gameOverModal) {
      this.gameOverModal.classList.remove('hidden');
    }
  }

  private handleLevelCleared(): void {
    this.soundManager.stopSiren();
    this.soundManager.playVictory();
    this.hapticManager.levelClear();
    this.gameState.setState(PlayState.LEVEL_CLEARED);
    this.cameraController.setMode(CameraMode.MENU);
    this.updateCameraBadge();
    if (this.victoryScore) {
      this.victoryScore.textContent = this.scoreManager.score.toString();
    }
    if (this.victoryModal) {
      this.victoryModal.classList.remove('hidden');
    }
  }

  private render(): void {
    this.renderer.render(this.cameraController.camera);
  }
}
