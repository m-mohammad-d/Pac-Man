export type ResolutionPreset = 'native' | '1280x720' | '1920x1080' | '2560x1440';
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra' | 'custom' | 'mobile_low' | 'mobile_medium' | 'mobile_high';
export type ShadowQuality = 'off' | 'low' | 'medium' | 'high' | 'ultra';
export type DifficultyPreset = 'easy' | 'normal' | 'hard' | 'expert';
export type CameraPreset = 'arcade' | 'cinematic' | 'competitive' | 'close' | 'wide' | 'mobile' | 'custom';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface GraphicsSettings {
  resolution: ResolutionPreset;
  fullscreen: boolean;
  preset: QualityPreset;
  shadowQuality: ShadowQuality;
  shadowsEnabled: boolean;
  antiAliasing: boolean;
  ambientLightQuality: number; // 0.5 to 2.0
  bloomGlowIntensity: number;   // 0.0 to 2.0
  particleQuality: number;      // 0.25 to 2.0
  renderDistance: number;       // 100 to 400
  fpsLimit: number;             // 30, 60, 120, 0 (uncapped)
  showFps: boolean;
  performanceMode: boolean;
  dynamicQuality: boolean;      // Auto performance detection & dynamic quality adjustment
  batterySaver: boolean;        // 30 FPS cap & reduced visuals to save battery
}

export interface AudioSettings {
  masterVolume: number; // 0 to 100
  musicVolume: number;  // 0 to 100
  sfxVolume: number;    // 0 to 100
  uiVolume: number;     // 0 to 100
  muteAll: boolean;
  dynamicMusic: boolean;
  sfxEnabled: boolean;
}

export interface GameplaySettings {
  difficulty: DifficultyPreset;
  ghostSpeedMultiplier: number;  // 0.5 to 1.5
  playerSpeedMultiplier: number; // 0.7 to 1.5
  ghostIntelligence: number;     // 0.5 to 1.5
  startingLives: number;         // 1 to 5
  extraLivesFrequency: number;   // 0 (none), 10000, 20000
  powerPelletDuration: number;   // 4 to 15 seconds
  gameSpeedMultiplier: number;   // 0.5 to 2.0
  showRecommendedPath: boolean;
  reducedGhostAggression: boolean;
  collisionForgiveness: number;  // 0.0 (strict) to 0.4 (forgiving)
}

export interface ControlSettings {
  moveUp: string;
  moveDown: string;
  moveLeft: string;
  moveRight: string;
  pause: string;
  restart: string;
  openMenu: string;
  cycleCamera: string;
  gamepadEnabled: boolean;
  gamepadDeadzone: number;
  mobileControlsMode: 'joystick' | 'swipe';
  joystickSize: 'small' | 'medium' | 'large';
  touchControlsEnabled: boolean;
}

export interface CameraCustomSettings {
  preset: CameraPreset;
  distance: number;         // 8 to 35
  height: number;           // 8 to 40
  pitchAngle: number;       // 30 to 80 degrees
  yawAngle: number;         // -180 to 180 degrees
  smoothSpeed: number;      // 1.0 to 15.0
  lookAtSmoothSpeed: number;// 1.0 to 15.0
  rotationSpeed: number;    // 1.0 to 10.0
  fov: number;              // 35 to 85
  shakeAmount: number;      // 0.0 to 1.0
  minDistance: number;      // 6 to 15
  maxDistance: number;      // 20 to 50
  mobileDistance: number;   // 10 to 40
  mobileHeight: number;     // 12 to 45
  mobileFov: number;        // 40 to 85
  adaptivePortraitFov: boolean;
}

export interface AccessibilitySettings {
  colorblindMode: ColorblindMode;
  screenShake: boolean;
  reducedFlashing: boolean;
  highContrast: boolean;
  uiScale: number; // 100, 115, 130
  subtitles: boolean;
  hapticsEnabled: boolean;
}

export interface DeveloperSettings {
  fpsCounter: boolean;
  showCollisionBoxes: boolean;
  showGrid: boolean;
  showAiPaths: boolean;
  showCoordinates: boolean;
  godMode: boolean;
  invincible: boolean;
  debugTeleport: boolean;
}

export interface GameSettings {
  graphics: GraphicsSettings;
  audio: AudioSettings;
  gameplay: GameplaySettings;
  controls: ControlSettings;
  camera: CameraCustomSettings;
  accessibility: AccessibilitySettings;
  developer: DeveloperSettings;
}

export const DEFAULT_SETTINGS: GameSettings = {
  graphics: {
    resolution: 'native',
    fullscreen: false,
    preset: 'high',
    shadowQuality: 'high',
    shadowsEnabled: true,
    antiAliasing: true,
    ambientLightQuality: 1.2,
    bloomGlowIntensity: 1.0,
    particleQuality: 1.0,
    renderDistance: 250,
    fpsLimit: 0,
    showFps: false,
    performanceMode: false,
    dynamicQuality: true,
    batterySaver: false
  },
  audio: {
    masterVolume: 80,
    musicVolume: 70,
    sfxVolume: 85,
    uiVolume: 75,
    muteAll: false,
    dynamicMusic: true,
    sfxEnabled: true
  },
  gameplay: {
    difficulty: 'normal',
    ghostSpeedMultiplier: 1.0,
    playerSpeedMultiplier: 1.0,
    ghostIntelligence: 1.0,
    startingLives: 3,
    extraLivesFrequency: 10000,
    powerPelletDuration: 8.0,
    gameSpeedMultiplier: 1.0,
    showRecommendedPath: false,
    reducedGhostAggression: false,
    collisionForgiveness: 0.15
  },
  controls: {
    moveUp: 'KeyW',
    moveDown: 'KeyS',
    moveLeft: 'KeyA',
    moveRight: 'KeyD',
    pause: 'KeyP',
    restart: 'KeyR',
    openMenu: 'Escape',
    cycleCamera: 'KeyC',
    gamepadEnabled: true,
    gamepadDeadzone: 0.2,
    mobileControlsMode: 'joystick',
    joystickSize: 'medium',
    touchControlsEnabled: true
  },
  camera: {
    preset: 'arcade',
    distance: 18.0,
    height: 20.0,
    pitchAngle: 54, // degrees
    yawAngle: 0,    // degrees
    smoothSpeed: 5.5,
    lookAtSmoothSpeed: 6.5,
    rotationSpeed: 4.0,
    fov: 48,
    shakeAmount: 0.3,
    minDistance: 8.0,
    maxDistance: 34.0,
    mobileDistance: 22.0,
    mobileHeight: 25.0,
    mobileFov: 56,
    adaptivePortraitFov: true
  },
  accessibility: {
    colorblindMode: 'none',
    screenShake: true,
    reducedFlashing: false,
    highContrast: false,
    uiScale: 100,
    subtitles: false,
    hapticsEnabled: true
  },
  developer: {
    fpsCounter: false,
    showCollisionBoxes: false,
    showGrid: false,
    showAiPaths: false,
    showCoordinates: false,
    godMode: false,
    invincible: false,
    debugTeleport: false
  }
};
