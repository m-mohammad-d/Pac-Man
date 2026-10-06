import { FRIGHTENED_DURATION, GhostMode } from '../utils/Constants';

export enum PlayState {
  START_MENU = 'START_MENU',
  READY = 'READY',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  PLAYER_DYING = 'PLAYER_DYING',
  LEVEL_CLEARED = 'LEVEL_CLEARED',
  GAME_OVER = 'GAME_OVER'
}

export class GameStateManager {
  public currentState: PlayState = PlayState.START_MENU;

  // Timers
  public readyTimer: number = 0;
  public deathTimer: number = 0;
  public frightenedTimer: number = 0;

  // Wave system (Scatter / Chase cycle)
  private waveTimer: number = 0;
  private waveIndex: number = 0;
  public currentWaveMode: GhostMode = GhostMode.SCATTER;

  // Scatter/Chase wave durations (seconds)
  private readonly waveSchedule = [
    { mode: GhostMode.SCATTER, duration: 7 },
    { mode: GhostMode.CHASE, duration: 20 },
    { mode: GhostMode.SCATTER, duration: 7 },
    { mode: GhostMode.CHASE, duration: 20 },
    { mode: GhostMode.SCATTER, duration: 5 },
    { mode: GhostMode.CHASE, duration: 20 },
    { mode: GhostMode.SCATTER, duration: 5 },
    { mode: GhostMode.CHASE, duration: Infinity }
  ];

  public setState(state: PlayState): void {
    this.currentState = state;
    if (state === PlayState.READY) {
      this.readyTimer = 2.0;
    } else if (state === PlayState.PLAYER_DYING) {
      this.deathTimer = 1.6;
    }
  }

  public resetWaveCycle(): void {
    this.waveTimer = 0;
    this.waveIndex = 0;
    this.currentWaveMode = this.waveSchedule[0].mode;
    this.frightenedTimer = 0;
  }

  public triggerFrightened(): void {
    this.frightenedTimer = FRIGHTENED_DURATION;
  }

  public isFrightenedActive(): boolean {
    return this.frightenedTimer > 0;
  }

  public updateTimers(deltaTime: number): {
    stateChanged: boolean;
    waveChanged: boolean;
    frightenedEnded: boolean;
  } {
    let stateChanged = false;
    let waveChanged = false;
    let frightenedEnded = false;

    if (this.currentState === PlayState.READY) {
      this.readyTimer -= deltaTime;
      if (this.readyTimer <= 0) {
        this.currentState = PlayState.PLAYING;
        stateChanged = true;
      }
    } else if (this.currentState === PlayState.PLAYER_DYING) {
      this.deathTimer -= deltaTime;
      if (this.deathTimer <= 0) {
        stateChanged = true;
      }
    }

    if (this.currentState === PlayState.PLAYING) {
      // Frightened countdown
      if (this.frightenedTimer > 0) {
        this.frightenedTimer -= deltaTime;
        if (this.frightenedTimer <= 0) {
          this.frightenedTimer = 0;
          frightenedEnded = true;
        }
      } else {
        // Normal scatter/chase wave progression
        if (this.waveIndex < this.waveSchedule.length) {
          this.waveTimer += deltaTime;
          const currentWave = this.waveSchedule[this.waveIndex];
          if (this.waveTimer >= currentWave.duration) {
            this.waveTimer = 0;
            this.waveIndex++;
            if (this.waveIndex < this.waveSchedule.length) {
              this.currentWaveMode = this.waveSchedule[this.waveIndex].mode;
              waveChanged = true;
            }
          }
        }
      }
    }

    return { stateChanged, waveChanged, frightenedEnded };
  }
}

