import {
  GameSettings,
  DEFAULT_SETTINGS,
  QualityPreset,
  DifficultyPreset,
  CameraPreset,
  ControlSettings
} from './SettingsTypes';

export type SettingsChangeListener = (settings: GameSettings, category?: keyof GameSettings) => void;

export class SettingsManager {
  private static instance: SettingsManager;
  private settings: GameSettings;
  private listeners: Set<SettingsChangeListener> = new Set();
  private readonly storageKey: string = 'pacman3d_settings_v2';

  private constructor() {
    this.settings = this.loadSettings();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public getSettings(): GameSettings {
    return this.settings;
  }

  public loadSettings(): GameSettings {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return this.deepMerge(DEFAULT_SETTINGS, parsed);
      }
    } catch (err) {
      console.warn('Failed to parse saved settings, falling back to defaults:', err);
    }
    return JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }

  public saveSettings(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      this.notifyListeners();
    } catch (err) {
      console.error('Failed to save settings to localStorage:', err);
    }
  }

  public resetAll(): void {
    this.settings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    this.saveSettings();
  }

  public resetCategory(category: keyof GameSettings): void {
    this.settings[category] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS[category]));
    this.saveSettings();
  }

  public updateGraphics(partial: Partial<GameSettings['graphics']>): void {
    Object.assign(this.settings.graphics, partial);
    if (partial.preset && partial.preset !== 'custom') {
      this.applyQualityPreset(partial.preset);
    }
    this.saveSettings();
  }

  public updateAudio(partial: Partial<GameSettings['audio']>): void {
    Object.assign(this.settings.audio, partial);
    this.saveSettings();
  }

  public updateGameplay(partial: Partial<GameSettings['gameplay']>): void {
    Object.assign(this.settings.gameplay, partial);
    if (partial.difficulty) {
      this.applyDifficultyPreset(partial.difficulty);
    }
    this.saveSettings();
  }

  public updateControls(partial: Partial<GameSettings['controls']>): void {
    Object.assign(this.settings.controls, partial);
    this.saveSettings();
  }

  public updateCamera(partial: Partial<GameSettings['camera']>): void {
    Object.assign(this.settings.camera, partial);
    if (partial.preset && partial.preset !== 'custom') {
      this.applyCameraPreset(partial.preset);
    }
    this.saveSettings();
  }

  public updateAccessibility(partial: Partial<GameSettings['accessibility']>): void {
    Object.assign(this.settings.accessibility, partial);
    this.saveSettings();
  }

  public updateDeveloper(partial: Partial<GameSettings['developer']>): void {
    Object.assign(this.settings.developer, partial);
    this.saveSettings();
  }

  public applyQualityPreset(preset: QualityPreset): void {
    this.settings.graphics.preset = preset;
    switch (preset) {
      case 'low':
      case 'mobile_low':
        this.settings.graphics.shadowQuality = 'off';
        this.settings.graphics.shadowsEnabled = false;
        this.settings.graphics.antiAliasing = false;
        this.settings.graphics.ambientLightQuality = 0.8;
        this.settings.graphics.bloomGlowIntensity = 0.4;
        this.settings.graphics.particleQuality = 0.25;
        this.settings.graphics.renderDistance = 150;
        this.settings.graphics.performanceMode = true;
        break;
      case 'medium':
      case 'mobile_medium':
        this.settings.graphics.shadowQuality = 'low';
        this.settings.graphics.shadowsEnabled = true;
        this.settings.graphics.antiAliasing = false;
        this.settings.graphics.ambientLightQuality = 1.0;
        this.settings.graphics.bloomGlowIntensity = 0.8;
        this.settings.graphics.particleQuality = 0.6;
        this.settings.graphics.renderDistance = 200;
        this.settings.graphics.performanceMode = false;
        break;
      case 'high':
      case 'mobile_high':
        this.settings.graphics.shadowQuality = 'high';
        this.settings.graphics.shadowsEnabled = true;
        this.settings.graphics.antiAliasing = true;
        this.settings.graphics.ambientLightQuality = 1.2;
        this.settings.graphics.bloomGlowIntensity = 1.0;
        this.settings.graphics.particleQuality = 1.0;
        this.settings.graphics.renderDistance = 250;
        this.settings.graphics.performanceMode = false;
        break;
      case 'ultra':
        this.settings.graphics.shadowQuality = 'ultra';
        this.settings.graphics.shadowsEnabled = true;
        this.settings.graphics.antiAliasing = true;
        this.settings.graphics.ambientLightQuality = 1.5;
        this.settings.graphics.bloomGlowIntensity = 1.3;
        this.settings.graphics.particleQuality = 1.6;
        this.settings.graphics.renderDistance = 350;
        this.settings.graphics.performanceMode = false;
        break;
    }
  }

  public applyDifficultyPreset(difficulty: DifficultyPreset): void {
    this.settings.gameplay.difficulty = difficulty;
    switch (difficulty) {
      case 'easy':
        this.settings.gameplay.ghostSpeedMultiplier = 0.8;
        this.settings.gameplay.playerSpeedMultiplier = 1.1;
        this.settings.gameplay.ghostIntelligence = 0.7;
        this.settings.gameplay.startingLives = 5;
        this.settings.gameplay.powerPelletDuration = 11.0;
        this.settings.gameplay.reducedGhostAggression = true;
        this.settings.gameplay.collisionForgiveness = 0.3;
        break;
      case 'normal':
        this.settings.gameplay.ghostSpeedMultiplier = 1.0;
        this.settings.gameplay.playerSpeedMultiplier = 1.0;
        this.settings.gameplay.ghostIntelligence = 1.0;
        this.settings.gameplay.startingLives = 3;
        this.settings.gameplay.powerPelletDuration = 8.0;
        this.settings.gameplay.reducedGhostAggression = false;
        this.settings.gameplay.collisionForgiveness = 0.15;
        break;
      case 'hard':
        this.settings.gameplay.ghostSpeedMultiplier = 1.15;
        this.settings.gameplay.playerSpeedMultiplier = 0.95;
        this.settings.gameplay.ghostIntelligence = 1.25;
        this.settings.gameplay.startingLives = 2;
        this.settings.gameplay.powerPelletDuration = 6.0;
        this.settings.gameplay.reducedGhostAggression = false;
        this.settings.gameplay.collisionForgiveness = 0.05;
        break;
      case 'expert':
        this.settings.gameplay.ghostSpeedMultiplier = 1.3;
        this.settings.gameplay.playerSpeedMultiplier = 0.9;
        this.settings.gameplay.ghostIntelligence = 1.5;
        this.settings.gameplay.startingLives = 1;
        this.settings.gameplay.powerPelletDuration = 4.5;
        this.settings.gameplay.reducedGhostAggression = false;
        this.settings.gameplay.collisionForgiveness = 0.0;
        break;
    }
  }

  public applyCameraPreset(preset: CameraPreset): void {
    this.settings.camera.preset = preset;
    switch (preset) {
      case 'arcade':
        this.settings.camera.distance = 18.0;
        this.settings.camera.height = 20.0;
        this.settings.camera.pitchAngle = 54;
        this.settings.camera.yawAngle = 0;
        this.settings.camera.fov = 48;
        this.settings.camera.smoothSpeed = 5.5;
        break;
      case 'cinematic':
        this.settings.camera.distance = 24.0;
        this.settings.camera.height = 14.0;
        this.settings.camera.pitchAngle = 42;
        this.settings.camera.yawAngle = 12;
        this.settings.camera.fov = 55;
        this.settings.camera.smoothSpeed = 3.5;
        break;
      case 'competitive':
        this.settings.camera.distance = 12.0;
        this.settings.camera.height = 34.0;
        this.settings.camera.pitchAngle = 76;
        this.settings.camera.yawAngle = 0;
        this.settings.camera.fov = 44;
        this.settings.camera.smoothSpeed = 9.0;
        break;
      case 'close':
        this.settings.camera.distance = 12.0;
        this.settings.camera.height = 12.0;
        this.settings.camera.pitchAngle = 48;
        this.settings.camera.yawAngle = 0;
        this.settings.camera.fov = 52;
        this.settings.camera.smoothSpeed = 6.0;
        break;
      case 'wide':
        this.settings.camera.distance = 26.0;
        this.settings.camera.height = 28.0;
        this.settings.camera.pitchAngle = 60;
        this.settings.camera.yawAngle = 0;
        this.settings.camera.fov = 64;
        this.settings.camera.smoothSpeed = 4.5;
        break;
      case 'mobile':
        this.settings.camera.distance = 22.0;
        this.settings.camera.height = 25.0;
        this.settings.camera.pitchAngle = 58;
        this.settings.camera.yawAngle = 0;
        this.settings.camera.fov = 56;
        this.settings.camera.smoothSpeed = 6.0;
        break;
    }
  }

  public validateControls(controls: ControlSettings): { hasConflict: boolean; conflicts: Record<string, string[]> } {
    const keyMap: Record<string, string[]> = {};
    const actions: (keyof ControlSettings)[] = [
      'moveUp', 'moveDown', 'moveLeft', 'moveRight', 'pause', 'restart', 'openMenu', 'cycleCamera'
    ];

    actions.forEach((act) => {
      const code = controls[act] as string;
      if (!keyMap[code]) keyMap[code] = [];
      keyMap[code].push(act);
    });

    const conflicts: Record<string, string[]> = {};
    let hasConflict = false;

    Object.keys(keyMap).forEach((code) => {
      if (keyMap[code].length > 1) {
        conflicts[code] = keyMap[code];
        hasConflict = true;
      }
    });

    return { hasConflict, conflicts };
  }

  public subscribe(listener: SettingsChangeListener): () => void {
    this.listeners.add(listener);
    // Initial call
    listener(this.settings);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(category?: keyof GameSettings): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.settings, category);
      } catch (err) {
        console.error('Error in settings listener:', err);
      }
    });
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Record<string, any>): T {
    const output = JSON.parse(JSON.stringify(target));
    if (!source || typeof source !== 'object') return output;

    Object.keys(source).forEach((key) => {
      if (key in output) {
        if (
          typeof source[key] === 'object' &&
          source[key] !== null &&
          !Array.isArray(source[key]) &&
          typeof output[key] === 'object'
        ) {
          output[key] = this.deepMerge(output[key], source[key]);
        } else {
          output[key] = source[key];
        }
      }
    });
    return output;
  }
}
