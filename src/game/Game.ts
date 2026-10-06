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
import {
  Direction,
  GhostType,
  GhostMode,
  PELLET_SCORE,
  POWER_PELLET_SCORE,
  FRIGHTENED_DURATION,
  CameraMode
} from '../utils/Constants';

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

  private startModal: HTMLElement | null = null;
  private gameOverModal: HTMLElement | null = null;
  private victoryModal: HTMLElement | null = null;
  private gameOverFinalScore: HTMLElement | null = null;
  private victoryScore: HTMLElement | null = null;

  // Loop control
  private lastTime: number = 0;
  private isRunning: boolean = false;

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

    this.initGhosts();
    this.initPellets();
    this.initDOM();
    this.initInput();
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

    this.startModal = document.getElementById('start-modal');
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

    // Modal buttons
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

    document.getElementById('btn-sound')?.addEventListener('click', () => {
      this.toggleSound();
    });

    document.getElementById('btn-pause')?.addEventListener('click', () => {
      this.togglePause();
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
      switch (e.code) {
        case 'ArrowUp':
          e.preventDefault();
          if (e.shiftKey || e.altKey) {
            this.cameraController.adjustPitch(0.04);
          } else {
            this.player.setRequestedDirection(Direction.UP);
          }
          break;
        case 'KeyW':
          e.preventDefault();
          this.player.setRequestedDirection(Direction.UP);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (e.shiftKey || e.altKey) {
            this.cameraController.adjustPitch(-0.04);
          } else {
            this.player.setRequestedDirection(Direction.DOWN);
          }
          break;
        case 'KeyS':
          e.preventDefault();
          this.player.setRequestedDirection(Direction.DOWN);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey || e.altKey) {
            this.cameraController.adjustYaw(0.05);
          } else {
            this.player.setRequestedDirection(Direction.LEFT);
          }
          break;
        case 'KeyA':
          e.preventDefault();
          this.player.setRequestedDirection(Direction.LEFT);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey || e.altKey) {
            this.cameraController.adjustYaw(-0.05);
          } else {
            this.player.setRequestedDirection(Direction.RIGHT);
          }
          break;
        case 'KeyD':
          e.preventDefault();
          this.player.setRequestedDirection(Direction.RIGHT);
          break;
        case 'KeyC':
          this.cycleCamera();
          break;
        case 'Equal':
        case 'NumpadAdd':
          this.cameraController.zoomIn();
          break;
        case 'Minus':
        case 'NumpadSubtract':
          this.cameraController.zoomOut();
          break;
        case 'BracketLeft':
          this.cameraController.adjustPitch(-0.05);
          break;
        case 'BracketRight':
          this.cameraController.adjustPitch(0.05);
          break;
        case 'KeyP':
        case 'Space':
          this.togglePause();
          break;
        case 'KeyM':
          this.toggleSound();
          break;
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
    this.scoreManager.resetGame();
    this.resetField();
    this.gameState.setState(PlayState.READY);
    this.showBanner('READY!');
  }

  private restartGame(): void {
    if (this.gameOverModal) this.gameOverModal.classList.add('hidden');
    this.scoreManager.resetGame();
    this.resetAllPellets();
    this.resetField();
    this.gameState.setState(PlayState.READY);
    this.showBanner('READY!');
  }

  private startNextLevel(): void {
    if (this.victoryModal) this.victoryModal.classList.add('hidden');
    this.scoreManager.nextLevel();
    this.resetAllPellets();
    this.resetField();
    // Increase ghost speeds slightly for higher levels
    const speedBoost = Math.min(2.0, (this.scoreManager.level - 1) * 0.4);
    this.ghosts.forEach((g) => {
      g.speed = 5.2 + speedBoost;
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
      this.showBanner('PAUSED');
      if (this.pauseIcon) this.pauseIcon.textContent = '▶️';
    } else if (this.gameState.currentState === PlayState.PAUSED) {
      this.gameState.currentState = PlayState.PLAYING;
      this.hideBanner();
      if (this.pauseIcon) this.pauseIcon.textContent = '⏸️';
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

  private gameLoop(time: number): void {
    if (!this.isRunning) return;

    const deltaTime = Math.min((time - this.lastTime) / 1000, 0.1); // clamp delta
    this.lastTime = time;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop.bind(this));
  }

  private update(deltaTime: number): void {
    // Effects update on all states
    this.effects.update(deltaTime);

    // Update Game State Timers
    const { stateChanged, waveChanged, frightenedEnded } = this.gameState.updateTimers(deltaTime);

    if (stateChanged) {
      if (this.gameState.currentState === PlayState.PLAYING) {
        this.hideBanner();
        this.soundManager.startSiren();
      } else if (this.gameState.currentState === PlayState.PLAYER_DYING) {
        // Player death countdown ended
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
      const mode = this.gameState.currentWaveMode;
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
      const progress = this.gameState.frightenedTimer / FRIGHTENED_DURATION;
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
          this.gameState.triggerFrightened();
          this.ghosts.forEach((g) => g.setFrightened());
          this.soundManager.playPowerPellet();
          this.effects.spawnPelletBurst(hitPellet.position, true);
        } else {
          this.scoreManager.addScore(PELLET_SCORE);
          this.soundManager.playWaka();
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
          this.effects.spawnGhostBurst(ghostHit.ghost.position);
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
      deltaTime,
      isDying
    );
  }

  private handlePlayerDeath(): void {
    this.soundManager.stopSiren();
    this.soundManager.playDeath();
    this.effects.spawnDeathBurst(this.player.position);
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
