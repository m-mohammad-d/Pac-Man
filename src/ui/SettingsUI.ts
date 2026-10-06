import { SettingsManager } from '../settings/SettingsManager';
import { HapticManager } from '../utils/HapticManager';
import {
  GameSettings,
  QualityPreset,
  DifficultyPreset,
  CameraPreset,
  ResolutionPreset,
  ShadowQuality,
  ColorblindMode
} from '../settings/SettingsTypes';

export class SettingsUI {
  private manager: SettingsManager;
  private container: HTMLElement | null = null;
  private activeTab: string = 'graphics';
  private listeningAction: string | null = null;
  private isOpen: boolean = false;

  private onApplyCallback?: () => void;
  private onLevelSkipCallback?: (level: number) => void;
  private onTeleportCallback?: () => void;

  constructor(manager: SettingsManager) {
    this.manager = manager;
    this.createDOM();
    this.bindGlobalKeys();
  }

  public setCallbacks(callbacks: {
    onApply?: () => void;
    onLevelSkip?: (level: number) => void;
    onTeleport?: () => void;
  }): void {
    this.onApplyCallback = callbacks.onApply;
    this.onLevelSkipCallback = callbacks.onLevelSkip;
    this.onTeleportCallback = callbacks.onTeleport;
  }

  public open(): void {
    if (!this.container) return;
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.renderActiveTab();
  }

  public close(): void {
    if (!this.container) return;
    this.isOpen = false;
    this.container.classList.add('hidden');
    this.listeningAction = null;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  private bindGlobalKeys(): void {
    window.addEventListener('keydown', (e) => {
      if (this.listeningAction) {
        e.preventDefault();
        e.stopPropagation();
        const action = this.listeningAction;
        this.listeningAction = null;

        const controls = { ...this.manager.getSettings().controls, [action]: e.code };
        this.manager.updateControls(controls);
        this.renderActiveTab();
        return;
      }

      if (e.code === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  private createDOM(): void {
    let el = document.getElementById('settings-modal');
    if (!el) {
      el = document.createElement('div');
      el.id = 'settings-modal';
      el.className = 'overlay-modal hidden';
      document.getElementById('game-container')?.appendChild(el);
    }
    this.container = el;

    this.container.innerHTML = `
      <div class="settings-dialog">
        <header class="settings-header">
          <div class="settings-title-group">
            <span class="settings-icon">⚙️</span>
            <h2>SYSTEM CONFIGURATION</h2>
          </div>
          <button id="btn-settings-close" class="btn-close-x" title="Close Settings">✕</button>
        </header>

        <div class="settings-body">
          <nav class="settings-sidebar">
            <button class="settings-nav-btn active" data-tab="graphics">🖥️ Graphics</button>
            <button class="settings-nav-btn" data-tab="audio">🔊 Audio</button>
            <button class="settings-nav-btn" data-tab="gameplay">🕹️ Gameplay</button>
            <button class="settings-nav-btn" data-tab="controls">🎮 Controls</button>
            <button class="settings-nav-btn" data-tab="camera">📷 Camera</button>
            <button class="settings-nav-btn" data-tab="accessibility">👁️ Accessibility</button>
            <button class="settings-nav-btn" data-tab="developer">🛠️ Developer</button>
          </nav>

          <main class="settings-content" id="settings-content-area">
            <!-- Dynamically populated per tab -->
          </main>
        </div>

        <footer class="settings-footer">
          <div class="footer-left">
            <button id="btn-reset-section" class="btn-action btn-secondary">Reset Tab</button>
            <button id="btn-reset-all" class="btn-action btn-danger">Reset All</button>
          </div>
          <div class="footer-right">
            <button id="btn-cancel-settings" class="btn-action btn-secondary">Close</button>
            <button id="btn-apply-settings" class="btn-action btn-primary">Apply & Save</button>
          </div>
        </footer>
      </div>
    `;

    // Event listeners for tabs & buttons
    this.container.querySelectorAll('.settings-nav-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.dataset.tab;
        if (tab) {
          this.container?.querySelectorAll('.settings-nav-btn').forEach((b) => b.classList.remove('active'));
          target.classList.add('active');
          this.activeTab = tab;
          this.renderActiveTab();
        }
      });
    });

    this.container.querySelector('#btn-settings-close')?.addEventListener('click', () => this.close());
    this.container.querySelector('#btn-cancel-settings')?.addEventListener('click', () => this.close());

    this.container.querySelector('#btn-apply-settings')?.addEventListener('click', () => {
      this.manager.saveSettings();
      if (this.onApplyCallback) this.onApplyCallback();
      this.close();
    });

    this.container.querySelector('#btn-reset-section')?.addEventListener('click', () => {
      this.manager.resetCategory(this.activeTab as keyof GameSettings);
      this.renderActiveTab();
    });

    this.container.querySelector('#btn-reset-all')?.addEventListener('click', () => {
      if (confirm('Reset all game settings back to factory default?')) {
        this.manager.resetAll();
        this.renderActiveTab();
      }
    });
  }

  private renderActiveTab(): void {
    const area = document.getElementById('settings-content-area');
    if (!area) return;

    switch (this.activeTab) {
      case 'graphics':
        area.innerHTML = this.renderGraphicsTab();
        this.bindGraphicsEvents();
        break;
      case 'audio':
        area.innerHTML = this.renderAudioTab();
        this.bindAudioEvents();
        break;
      case 'gameplay':
        area.innerHTML = this.renderGameplayTab();
        this.bindGameplayEvents();
        break;
      case 'controls':
        area.innerHTML = this.renderControlsTab();
        this.bindControlsEvents();
        break;
      case 'camera':
        area.innerHTML = this.renderCameraTab();
        this.bindCameraEvents();
        break;
      case 'accessibility':
        area.innerHTML = this.renderAccessibilityTab();
        this.bindAccessibilityEvents();
        break;
      case 'developer':
        area.innerHTML = this.renderDeveloperTab();
        this.bindDeveloperEvents();
        break;
    }
  }

  // =================== TAB RENDERERS ===================

  private renderGraphicsTab(): string {
    const s = this.manager.getSettings().graphics;
    return `
      <div class="settings-group">
        <h3 class="group-title">Display & Resolution</h3>
        
        <div class="setting-row">
          <label>Target Resolution</label>
          <select id="set-resolution" class="arcade-select">
            <option value="native" ${s.resolution === 'native' ? 'selected' : ''}>Native Display</option>
            <option value="1280x720" ${s.resolution === '1280x720' ? 'selected' : ''}>1280 x 720 (HD)</option>
            <option value="1920x1080" ${s.resolution === '1920x1080' ? 'selected' : ''}>1920 x 1080 (FHD)</option>
            <option value="2560x1440" ${s.resolution === '2560x1440' ? 'selected' : ''}>2560 x 1440 (QHD)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Fullscreen Mode</label>
          <input type="checkbox" id="set-fullscreen" class="arcade-toggle" ${s.fullscreen ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>FPS Limiter</label>
          <select id="set-fps-limit" class="arcade-select">
            <option value="0" ${s.fpsLimit === 0 ? 'selected' : ''}>Uncapped</option>
            <option value="30" ${s.fpsLimit === 30 ? 'selected' : ''}>30 FPS</option>
            <option value="60" ${s.fpsLimit === 60 ? 'selected' : ''}>60 FPS</option>
            <option value="120" ${s.fpsLimit === 120 ? 'selected' : ''}>120 FPS</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Show FPS Counter</label>
          <input type="checkbox" id="set-show-fps" class="arcade-toggle" ${s.showFps ? 'checked' : ''} />
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">Quality & Visuals</h3>

        <div class="setting-row">
          <label>Quality Preset</label>
          <select id="set-preset" class="arcade-select">
            <option value="mobile_low" ${s.preset === 'mobile_low' ? 'selected' : ''}>📱 Mobile Low (Fastest)</option>
            <option value="mobile_medium" ${s.preset === 'mobile_medium' ? 'selected' : ''}>📱 Mobile Medium (Balanced)</option>
            <option value="mobile_high" ${s.preset === 'mobile_high' ? 'selected' : ''}>📱 Mobile High (Maximum)</option>
            <option value="low" ${s.preset === 'low' ? 'selected' : ''}>Low (Desktop Performance)</option>
            <option value="medium" ${s.preset === 'medium' ? 'selected' : ''}>Medium (Desktop Standard)</option>
            <option value="high" ${s.preset === 'high' ? 'selected' : ''}>High (Desktop Quality)</option>
            <option value="ultra" ${s.preset === 'ultra' ? 'selected' : ''}>Ultra (Maximum)</option>
            <option value="custom" ${s.preset === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Shadow Quality</label>
          <select id="set-shadow-quality" class="arcade-select">
            <option value="off" ${s.shadowQuality === 'off' ? 'selected' : ''}>Disabled</option>
            <option value="low" ${s.shadowQuality === 'low' ? 'selected' : ''}>Low (512px)</option>
            <option value="medium" ${s.shadowQuality === 'medium' ? 'selected' : ''}>Medium (1024px)</option>
            <option value="high" ${s.shadowQuality === 'high' ? 'selected' : ''}>High (2048px)</option>
            <option value="ultra" ${s.shadowQuality === 'ultra' ? 'selected' : ''}>Ultra (4096px)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Anti-Aliasing (MSAA)</label>
          <input type="checkbox" id="set-antialiasing" class="arcade-toggle" ${s.antiAliasing ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Neon Bloom & Glow: <span id="val-bloom">${s.bloomGlowIntensity.toFixed(1)}x</span></label>
          <input type="range" id="set-bloom" min="0" max="2.0" step="0.1" value="${s.bloomGlowIntensity}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Particle Density: <span id="val-particles">${s.particleQuality.toFixed(2)}x</span></label>
          <input type="range" id="set-particles" min="0.25" max="2.0" step="0.25" value="${s.particleQuality}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Dynamic Quality Adjustment</label>
          <input type="checkbox" id="set-dynamic-quality" class="arcade-toggle" ${s.dynamicQuality ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Battery Saver Mode (30 FPS Cap)</label>
          <input type="checkbox" id="set-battery-saver" class="arcade-toggle" ${s.batterySaver ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Performance Mode</label>
          <input type="checkbox" id="set-perf-mode" class="arcade-toggle" ${s.performanceMode ? 'checked' : ''} />
        </div>
      </div>
    `;
  }

  private renderAudioTab(): string {
    const a = this.manager.getSettings().audio;
    return `
      <div class="settings-group">
        <h3 class="group-title">Volume Levels</h3>

        <div class="setting-row">
          <label>Master Volume: <span id="val-master">${a.masterVolume}%</span></label>
          <input type="range" id="set-master-vol" min="0" max="100" value="${a.masterVolume}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Sound Effects (SFX): <span id="val-sfx">${a.sfxVolume}%</span></label>
          <input type="range" id="set-sfx-vol" min="0" max="100" value="${a.sfxVolume}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Music & Sirens: <span id="val-music">${a.musicVolume}%</span></label>
          <input type="range" id="set-music-vol" min="0" max="100" value="${a.musicVolume}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>UI Feedback: <span id="val-ui">${a.uiVolume}%</span></label>
          <input type="range" id="set-ui-vol" min="0" max="100" value="${a.uiVolume}" class="arcade-slider" />
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">Audio Options</h3>

        <div class="setting-row">
          <label>Mute All Sounds</label>
          <input type="checkbox" id="set-mute-all" class="arcade-toggle" ${a.muteAll ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Dynamic Ghost Alarm Music</label>
          <input type="checkbox" id="set-dynamic-music" class="arcade-toggle" ${a.dynamicMusic ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Sound Effects Enabled</label>
          <input type="checkbox" id="set-sfx-enabled" class="arcade-toggle" ${a.sfxEnabled ? 'checked' : ''} />
        </div>
      </div>
    `;
  }

  private renderGameplayTab(): string {
    const g = this.manager.getSettings().gameplay;
    return `
      <div class="settings-group">
        <h3 class="group-title">Difficulty & Balance</h3>

        <div class="setting-row">
          <label>Difficulty Preset</label>
          <select id="set-difficulty" class="arcade-select">
            <option value="easy" ${g.difficulty === 'easy' ? 'selected' : ''}>Easy (Relaxed)</option>
            <option value="normal" ${g.difficulty === 'normal' ? 'selected' : ''}>Normal (Classic Arcade)</option>
            <option value="hard" ${g.difficulty === 'hard' ? 'selected' : ''}>Hard (Challenging)</option>
            <option value="expert" ${g.difficulty === 'expert' ? 'selected' : ''}>Expert (Relentless)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Starting Lives</label>
          <select id="set-lives" class="arcade-select">
            <option value="1" ${g.startingLives === 1 ? 'selected' : ''}>1 Life (Hardcore)</option>
            <option value="2" ${g.startingLives === 2 ? 'selected' : ''}>2 Lives</option>
            <option value="3" ${g.startingLives === 3 ? 'selected' : ''}>3 Lives (Classic)</option>
            <option value="5" ${g.startingLives === 5 ? 'selected' : ''}>5 Lives (Generous)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Power Pellet Duration: <span id="val-power-dur">${g.powerPelletDuration}s</span></label>
          <input type="range" id="set-power-dur" min="4" max="15" step="0.5" value="${g.powerPelletDuration}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Ghost Speed Multiplier: <span id="val-ghost-spd">${g.ghostSpeedMultiplier.toFixed(2)}x</span></label>
          <input type="range" id="set-ghost-spd" min="0.6" max="1.4" step="0.05" value="${g.ghostSpeedMultiplier}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Player Speed Multiplier: <span id="val-player-spd">${g.playerSpeedMultiplier.toFixed(2)}x</span></label>
          <input type="range" id="set-player-spd" min="0.8" max="1.3" step="0.05" value="${g.playerSpeedMultiplier}" class="arcade-slider" />
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">Assist & Accessibility Aids</h3>

        <div class="setting-row">
          <label>Recommended Path Guide</label>
          <input type="checkbox" id="set-assist-path" class="arcade-toggle" ${g.showRecommendedPath ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Reduced Ghost Aggression</label>
          <input type="checkbox" id="set-assist-aggression" class="arcade-toggle" ${g.reducedGhostAggression ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Collision Hitbox Forgiveness</label>
          <input type="range" id="set-assist-forgiveness" min="0.0" max="0.35" step="0.05" value="${g.collisionForgiveness}" class="arcade-slider" />
        </div>
      </div>
    `;
  }

  private renderControlsTab(): string {
    const c = this.manager.getSettings().controls;
    const { hasConflict, conflicts } = this.manager.validateControls(c);

    const formatKey = (code: string) => {
      return code.replace('Key', '').replace('Arrow', 'Arrow ').toUpperCase();
    };

    return `
      ${hasConflict ? `
        <div class="conflict-alert">
          ⚠️ Key conflict detected! Some actions share the same key: ${Object.keys(conflicts).map(k => formatKey(k)).join(', ')}.
        </div>
      ` : ''}

      <div class="settings-group">
        <h3 class="group-title">Keyboard Mappings</h3>
        <p class="group-subtitle">Click any button below and press a new key to rebind.</p>

        <div class="controls-grid">
          <div class="control-item">
            <span>Move Up</span>
            <button class="key-bind-btn ${this.listeningAction === 'moveUp' ? 'listening' : ''}" data-action="moveUp">
              ${this.listeningAction === 'moveUp' ? 'Press Key...' : formatKey(c.moveUp)}
            </button>
          </div>
          <div class="control-item">
            <span>Move Down</span>
            <button class="key-bind-btn ${this.listeningAction === 'moveDown' ? 'listening' : ''}" data-action="moveDown">
              ${this.listeningAction === 'moveDown' ? 'Press Key...' : formatKey(c.moveDown)}
            </button>
          </div>
          <div class="control-item">
            <span>Move Left</span>
            <button class="key-bind-btn ${this.listeningAction === 'moveLeft' ? 'listening' : ''}" data-action="moveLeft">
              ${this.listeningAction === 'moveLeft' ? 'Press Key...' : formatKey(c.moveLeft)}
            </button>
          </div>
          <div class="control-item">
            <span>Move Right</span>
            <button class="key-bind-btn ${this.listeningAction === 'moveRight' ? 'listening' : ''}" data-action="moveRight">
              ${this.listeningAction === 'moveRight' ? 'Press Key...' : formatKey(c.moveRight)}
            </button>
          </div>
          <div class="control-item">
            <span>Pause Game</span>
            <button class="key-bind-btn ${this.listeningAction === 'pause' ? 'listening' : ''}" data-action="pause">
              ${this.listeningAction === 'pause' ? 'Press Key...' : formatKey(c.pause)}
            </button>
          </div>
          <div class="control-item">
            <span>Restart Level</span>
            <button class="key-bind-btn ${this.listeningAction === 'restart' ? 'listening' : ''}" data-action="restart">
              ${this.listeningAction === 'restart' ? 'Press Key...' : formatKey(c.restart)}
            </button>
          </div>
          <div class="control-item">
            <span>Open Menu</span>
            <button class="key-bind-btn ${this.listeningAction === 'openMenu' ? 'listening' : ''}" data-action="openMenu">
              ${this.listeningAction === 'openMenu' ? 'Press Key...' : formatKey(c.openMenu)}
            </button>
          </div>
          <div class="control-item">
            <span>Cycle Camera</span>
            <button class="key-bind-btn ${this.listeningAction === 'cycleCamera' ? 'listening' : ''}" data-action="cycleCamera">
              ${this.listeningAction === 'cycleCamera' ? 'Press Key...' : formatKey(c.cycleCamera)}
            </button>
          </div>
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">📱 Mobile Touch Controls</h3>

        <div class="setting-row">
          <label>Enable Touch Controls</label>
          <input type="checkbox" id="set-touch-enabled" class="arcade-toggle" ${c.touchControlsEnabled ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Mobile Control Mode</label>
          <select id="set-touch-mode" class="arcade-select">
            <option value="joystick" ${c.mobileControlsMode === 'joystick' ? 'selected' : ''}>🕹️ Joystick</option>
            <option value="swipe" ${c.mobileControlsMode === 'swipe' ? 'selected' : ''}>👆 Swipe Gestures</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Joystick Size</label>
          <select id="set-joystick-size" class="arcade-select">
            <option value="small" ${c.joystickSize === 'small' ? 'selected' : ''}>Compact (Small)</option>
            <option value="medium" ${c.joystickSize === 'medium' ? 'selected' : ''}>Standard (Medium)</option>
            <option value="large" ${c.joystickSize === 'large' ? 'selected' : ''}>Expanded (Large / Tablet)</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">Gamepad / Controller</h3>
        <div class="setting-row">
          <label>Enable Controller Input</label>
          <input type="checkbox" id="set-gamepad-enabled" class="arcade-toggle" ${c.gamepadEnabled ? 'checked' : ''} />
        </div>
        <div class="setting-row">
          <label>Thumbstick Deadzone: <span id="val-deadzone">${(c.gamepadDeadzone * 100).toFixed(0)}%</span></label>
          <input type="range" id="set-gamepad-deadzone" min="0.1" max="0.4" step="0.05" value="${c.gamepadDeadzone}" class="arcade-slider" />
        </div>
      </div>
    `;
  }

  private renderCameraTab(): string {
    const cam = this.manager.getSettings().camera;
    return `
      <div class="settings-group">
        <h3 class="group-title">Camera Presets</h3>
        <div class="setting-row">
          <label>Camera Angle Style</label>
          <select id="set-cam-preset" class="arcade-select">
            <option value="mobile" ${cam.preset === 'mobile' ? 'selected' : ''}>📱 Mobile Optimized View</option>
            <option value="arcade" ${cam.preset === 'arcade' ? 'selected' : ''}>Classic Arcade (~54°)</option>
            <option value="cinematic" ${cam.preset === 'cinematic' ? 'selected' : ''}>Cinematic (Low 42°)</option>
            <option value="competitive" ${cam.preset === 'competitive' ? 'selected' : ''}>Competitive (Top-Down 76°)</option>
            <option value="close" ${cam.preset === 'close' ? 'selected' : ''}>Close View</option>
            <option value="wide" ${cam.preset === 'wide' ? 'selected' : ''}>Wide View</option>
            <option value="custom" ${cam.preset === 'custom' ? 'selected' : ''}>Custom</option>
          </select>
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">📱 Mobile Camera Calibration</h3>

        <div class="setting-row">
          <label>Adaptive Portrait FOV</label>
          <input type="checkbox" id="set-cam-adaptive-fov" class="arcade-toggle" ${cam.adaptivePortraitFov ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Mobile Distance: <span id="val-cam-mob-dist">${cam.mobileDistance.toFixed(1)}m</span></label>
          <input type="range" id="set-cam-mob-dist" min="10" max="38" step="1" value="${cam.mobileDistance}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Mobile Height: <span id="val-cam-mob-height">${cam.mobileHeight.toFixed(1)}m</span></label>
          <input type="range" id="set-cam-mob-height" min="12" max="42" step="1" value="${cam.mobileHeight}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Mobile Base FOV: <span id="val-cam-mob-fov">${cam.mobileFov}°</span></label>
          <input type="range" id="set-cam-mob-fov" min="40" max="80" step="1" value="${cam.mobileFov}" class="arcade-slider" />
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">Custom Geometry & Dynamics</h3>

        <div class="setting-row">
          <label>Distance: <span id="val-cam-dist">${cam.distance.toFixed(1)}m</span></label>
          <input type="range" id="set-cam-dist" min="8" max="35" step="1" value="${cam.distance}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Elevation Height: <span id="val-cam-height">${cam.height.toFixed(1)}m</span></label>
          <input type="range" id="set-cam-height" min="8" max="40" step="1" value="${cam.height}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Pitch Angle: <span id="val-cam-pitch">${cam.pitchAngle}°</span></label>
          <input type="range" id="set-cam-pitch" min="30" max="80" step="1" value="${cam.pitchAngle}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Field of View (FOV): <span id="val-cam-fov">${cam.fov}°</span></label>
          <input type="range" id="set-cam-fov" min="35" max="85" step="1" value="${cam.fov}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Follow Smoothing: <span id="val-cam-smooth">${cam.smoothSpeed.toFixed(1)}</span></label>
          <input type="range" id="set-cam-smooth" min="1.0" max="15.0" step="0.5" value="${cam.smoothSpeed}" class="arcade-slider" />
        </div>

        <div class="setting-row">
          <label>Impact Screen Shake</label>
          <input type="range" id="set-cam-shake" min="0.0" max="1.0" step="0.1" value="${cam.shakeAmount}" class="arcade-slider" />
        </div>
      </div>
    `;
  }

  private renderAccessibilityTab(): string {
    const acc = this.manager.getSettings().accessibility;
    return `
      <div class="settings-group">
        <h3 class="group-title">Visual Comfort</h3>

        <div class="setting-row">
          <label>Colorblind Mode</label>
          <select id="set-colorblind" class="arcade-select">
            <option value="none" ${acc.colorblindMode === 'none' ? 'selected' : ''}>Default (Vibrant Neon)</option>
            <option value="protanopia" ${acc.colorblindMode === 'protanopia' ? 'selected' : ''}>Protanopia (Red Weak)</option>
            <option value="deuteranopia" ${acc.colorblindMode === 'deuteranopia' ? 'selected' : ''}>Deuteranopia (Green Weak)</option>
            <option value="tritanopia" ${acc.colorblindMode === 'tritanopia' ? 'selected' : ''}>Tritanopia (Blue Weak)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Haptic Vibration Feedback</label>
          <input type="checkbox" id="set-haptics" class="arcade-toggle" ${acc.hapticsEnabled ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Reduced Flashing Effects</label>
          <input type="checkbox" id="set-reduced-flash" class="arcade-toggle" ${acc.reducedFlashing ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>High Contrast Outlines</label>
          <input type="checkbox" id="set-high-contrast" class="arcade-toggle" ${acc.highContrast ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>HUD & Interface Scale</label>
          <select id="set-ui-scale" class="arcade-select">
            <option value="100" ${acc.uiScale === 100 ? 'selected' : ''}>100% (Standard)</option>
            <option value="115" ${acc.uiScale === 115 ? 'selected' : ''}>115% (Comfort)</option>
            <option value="130" ${acc.uiScale === 130 ? 'selected' : ''}>130% (Large)</option>
          </select>
        </div>

        <div class="setting-row">
          <label>Visual Audio Cues (Subtitles)</label>
          <input type="checkbox" id="set-subtitles" class="arcade-toggle" ${acc.subtitles ? 'checked' : ''} />
        </div>
      </div>
    `;
  }

  private renderDeveloperTab(): string {
    const dev = this.manager.getSettings().developer;
    return `
      <div class="settings-group">
        <h3 class="group-title">Debug Visualizers</h3>

        <div class="setting-row">
          <label>Real-Time FPS & Frame Graph</label>
          <input type="checkbox" id="set-dev-fps" class="arcade-toggle" ${dev.fpsCounter ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Show AI Target Lines & Vectors</label>
          <input type="checkbox" id="set-dev-ai-paths" class="arcade-toggle" ${dev.showAiPaths ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Show Floor Navigation Grid</label>
          <input type="checkbox" id="set-dev-grid" class="arcade-toggle" ${dev.showGrid ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Show Live Tile Coordinates HUD</label>
          <input type="checkbox" id="set-dev-coords" class="arcade-toggle" ${dev.showCoordinates ? 'checked' : ''} />
        </div>
      </div>

      <div class="settings-group">
        <h3 class="group-title">Cheats & Sandbox Tools</h3>

        <div class="setting-row">
          <label>God Mode (Invincible to Ghosts)</label>
          <input type="checkbox" id="set-dev-god" class="arcade-toggle" ${dev.godMode ? 'checked' : ''} />
        </div>

        <div class="setting-row">
          <label>Quick Teleport</label>
          <button id="btn-dev-teleport" class="btn-action btn-secondary" style="padding: 6px 14px;">Teleport Pac-Man</button>
        </div>

        <div class="setting-row">
          <label>Jump to Level</label>
          <div style="display: flex; gap: 8px;">
            <button class="btn-dev-level btn-action btn-secondary" data-lvl="1" style="padding: 4px 10px;">Lvl 1</button>
            <button class="btn-dev-level btn-action btn-secondary" data-lvl="2" style="padding: 4px 10px;">Lvl 2</button>
            <button class="btn-dev-level btn-action btn-secondary" data-lvl="5" style="padding: 4px 10px;">Lvl 5</button>
            <button class="btn-dev-level btn-action btn-secondary" data-lvl="10" style="padding: 4px 10px;">Lvl 10</button>
          </div>
        </div>
      </div>
    `;
  }

  // =================== EVENT BINDINGS ===================

  private bindGraphicsEvents(): void {
    const res = document.getElementById('set-resolution') as HTMLSelectElement;
    res?.addEventListener('change', () => {
      this.manager.updateGraphics({ resolution: res.value as ResolutionPreset });
    });

    const fs = document.getElementById('set-fullscreen') as HTMLInputElement;
    fs?.addEventListener('change', () => {
      this.manager.updateGraphics({ fullscreen: fs.checked });
      if (fs.checked && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else if (!fs.checked && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    });

    const preset = document.getElementById('set-preset') as HTMLSelectElement;
    preset?.addEventListener('change', () => {
      this.manager.updateGraphics({ preset: preset.value as QualityPreset });
      this.renderActiveTab();
    });

    const shadow = document.getElementById('set-shadow-quality') as HTMLSelectElement;
    shadow?.addEventListener('change', () => {
      this.manager.updateGraphics({
        shadowQuality: shadow.value as ShadowQuality,
        shadowsEnabled: shadow.value !== 'off',
        preset: 'custom'
      });
    });

    const aa = document.getElementById('set-antialiasing') as HTMLInputElement;
    aa?.addEventListener('change', () => {
      this.manager.updateGraphics({ antiAliasing: aa.checked, preset: 'custom' });
    });

    const bloom = document.getElementById('set-bloom') as HTMLInputElement;
    bloom?.addEventListener('input', () => {
      const val = parseFloat(bloom.value);
      document.getElementById('val-bloom')!.textContent = `${val.toFixed(1)}x`;
      this.manager.updateGraphics({ bloomGlowIntensity: val, preset: 'custom' });
    });

    const part = document.getElementById('set-particles') as HTMLInputElement;
    part?.addEventListener('input', () => {
      const val = parseFloat(part.value);
      document.getElementById('val-particles')!.textContent = `${val.toFixed(2)}x`;
      this.manager.updateGraphics({ particleQuality: val, preset: 'custom' });
    });

    const fps = document.getElementById('set-fps-limit') as HTMLSelectElement;
    fps?.addEventListener('change', () => {
      this.manager.updateGraphics({ fpsLimit: parseInt(fps.value, 10) });
    });

    const showFps = document.getElementById('set-show-fps') as HTMLInputElement;
    showFps?.addEventListener('change', () => {
      this.manager.updateGraphics({ showFps: showFps.checked });
    });

    const perf = document.getElementById('set-perf-mode') as HTMLInputElement;
    perf?.addEventListener('change', () => {
      this.manager.updateGraphics({ performanceMode: perf.checked });
    });

    const dynQuality = document.getElementById('set-dynamic-quality') as HTMLInputElement;
    dynQuality?.addEventListener('change', () => {
      this.manager.updateGraphics({ dynamicQuality: dynQuality.checked });
    });

    const battSaver = document.getElementById('set-battery-saver') as HTMLInputElement;
    battSaver?.addEventListener('change', () => {
      this.manager.updateGraphics({ batterySaver: battSaver.checked });
    });
  }

  private bindAudioEvents(): void {
    const bindSlider = (id: string, labelId: string, prop: 'masterVolume' | 'sfxVolume' | 'musicVolume' | 'uiVolume') => {
      const input = document.getElementById(id) as HTMLInputElement;
      input?.addEventListener('input', () => {
        const val = parseInt(input.value, 10);
        document.getElementById(labelId)!.textContent = `${val}%`;
        this.manager.updateAudio({ [prop]: val });
      });
    };

    bindSlider('set-master-vol', 'val-master', 'masterVolume');
    bindSlider('set-sfx-vol', 'val-sfx', 'sfxVolume');
    bindSlider('set-music-vol', 'val-music', 'musicVolume');
    bindSlider('set-ui-vol', 'val-ui', 'uiVolume');

    const mute = document.getElementById('set-mute-all') as HTMLInputElement;
    mute?.addEventListener('change', () => {
      this.manager.updateAudio({ muteAll: mute.checked });
    });

    const dynamic = document.getElementById('set-dynamic-music') as HTMLInputElement;
    dynamic?.addEventListener('change', () => {
      this.manager.updateAudio({ dynamicMusic: dynamic.checked });
    });

    const sfx = document.getElementById('set-sfx-enabled') as HTMLInputElement;
    sfx?.addEventListener('change', () => {
      this.manager.updateAudio({ sfxEnabled: sfx.checked });
    });
  }

  private bindGameplayEvents(): void {
    const diff = document.getElementById('set-difficulty') as HTMLSelectElement;
    diff?.addEventListener('change', () => {
      this.manager.updateGameplay({ difficulty: diff.value as DifficultyPreset });
      this.renderActiveTab();
    });

    const lives = document.getElementById('set-lives') as HTMLSelectElement;
    lives?.addEventListener('change', () => {
      this.manager.updateGameplay({ startingLives: parseInt(lives.value, 10) });
    });

    const power = document.getElementById('set-power-dur') as HTMLInputElement;
    power?.addEventListener('input', () => {
      const val = parseFloat(power.value);
      document.getElementById('val-power-dur')!.textContent = `${val}s`;
      this.manager.updateGameplay({ powerPelletDuration: val });
    });

    const gSpeed = document.getElementById('set-ghost-spd') as HTMLInputElement;
    gSpeed?.addEventListener('input', () => {
      const val = parseFloat(gSpeed.value);
      document.getElementById('val-ghost-spd')!.textContent = `${val.toFixed(2)}x`;
      this.manager.updateGameplay({ ghostSpeedMultiplier: val });
    });

    const pSpeed = document.getElementById('set-player-spd') as HTMLInputElement;
    pSpeed?.addEventListener('input', () => {
      const val = parseFloat(pSpeed.value);
      document.getElementById('val-player-spd')!.textContent = `${val.toFixed(2)}x`;
      this.manager.updateGameplay({ playerSpeedMultiplier: val });
    });

    const path = document.getElementById('set-assist-path') as HTMLInputElement;
    path?.addEventListener('change', () => {
      this.manager.updateGameplay({ showRecommendedPath: path.checked });
    });

    const agg = document.getElementById('set-assist-aggression') as HTMLInputElement;
    agg?.addEventListener('change', () => {
      this.manager.updateGameplay({ reducedGhostAggression: agg.checked });
    });

    const forg = document.getElementById('set-assist-forgiveness') as HTMLInputElement;
    forg?.addEventListener('input', () => {
      this.manager.updateGameplay({ collisionForgiveness: parseFloat(forg.value) });
    });
  }

  private bindControlsEvents(): void {
    this.container?.querySelectorAll('.key-bind-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const act = target.dataset.action;
        if (act) {
          this.listeningAction = act;
          this.renderActiveTab();
        }
      });
    });

    const touchEnabled = document.getElementById('set-touch-enabled') as HTMLInputElement;
    touchEnabled?.addEventListener('change', () => {
      this.manager.updateControls({ touchControlsEnabled: touchEnabled.checked });
    });

    const touchMode = document.getElementById('set-touch-mode') as HTMLSelectElement;
    touchMode?.addEventListener('change', () => {
      this.manager.updateControls({ mobileControlsMode: touchMode.value as any });
    });

    const joySize = document.getElementById('set-joystick-size') as HTMLSelectElement;
    joySize?.addEventListener('change', () => {
      this.manager.updateControls({ joystickSize: joySize.value as any });
    });

    const gp = document.getElementById('set-gamepad-enabled') as HTMLInputElement;
    gp?.addEventListener('change', () => {
      this.manager.updateControls({ gamepadEnabled: gp.checked });
    });

    const dz = document.getElementById('set-gamepad-deadzone') as HTMLInputElement;
    dz?.addEventListener('input', () => {
      const val = parseFloat(dz.value);
      document.getElementById('val-deadzone')!.textContent = `${(val * 100).toFixed(0)}%`;
      this.manager.updateControls({ gamepadDeadzone: val });
    });
  }

  private bindCameraEvents(): void {
    const preset = document.getElementById('set-cam-preset') as HTMLSelectElement;
    preset?.addEventListener('change', () => {
      this.manager.updateCamera({ preset: preset.value as CameraPreset });
      this.renderActiveTab();
    });

    const adaptiveFov = document.getElementById('set-cam-adaptive-fov') as HTMLInputElement;
    adaptiveFov?.addEventListener('change', () => {
      this.manager.updateCamera({ adaptivePortraitFov: adaptiveFov.checked });
    });

    const bindSlider = (id: string, labelId: string, unit: string, prop: any) => {
      const input = document.getElementById(id) as HTMLInputElement;
      input?.addEventListener('input', () => {
        const val = parseFloat(input.value);
        const lbl = document.getElementById(labelId);
        if (lbl) lbl.textContent = `${val}${unit}`;
        this.manager.updateCamera({ [prop]: val, preset: 'custom' });
      });
    };

    bindSlider('set-cam-mob-dist', 'val-cam-mob-dist', 'm', 'mobileDistance');
    bindSlider('set-cam-mob-height', 'val-cam-mob-height', 'm', 'mobileHeight');
    bindSlider('set-cam-mob-fov', 'val-cam-mob-fov', '°', 'mobileFov');

    bindSlider('set-cam-dist', 'val-cam-dist', 'm', 'distance');
    bindSlider('set-cam-height', 'val-cam-height', 'm', 'height');
    bindSlider('set-cam-pitch', 'val-cam-pitch', '°', 'pitchAngle');
    bindSlider('set-cam-fov', 'val-cam-fov', '°', 'fov');
    bindSlider('set-cam-smooth', 'val-cam-smooth', '', 'smoothSpeed');
    bindSlider('set-cam-shake', 'set-cam-shake', '', 'shakeAmount');
  }

  private bindAccessibilityEvents(): void {
    const cb = document.getElementById('set-colorblind') as HTMLSelectElement;
    cb?.addEventListener('change', () => {
      this.manager.updateAccessibility({ colorblindMode: cb.value as ColorblindMode });
    });

    const haptics = document.getElementById('set-haptics') as HTMLInputElement;
    haptics?.addEventListener('change', () => {
      this.manager.updateAccessibility({ hapticsEnabled: haptics.checked });
      HapticManager.getInstance().enabled = haptics.checked;
    });

    const rf = document.getElementById('set-reduced-flash') as HTMLInputElement;
    rf?.addEventListener('change', () => {
      this.manager.updateAccessibility({ reducedFlashing: rf.checked });
    });

    const hc = document.getElementById('set-high-contrast') as HTMLInputElement;
    hc?.addEventListener('change', () => {
      this.manager.updateAccessibility({ highContrast: hc.checked });
      document.body.classList.toggle('high-contrast', hc.checked);
    });

    const scale = document.getElementById('set-ui-scale') as HTMLSelectElement;
    scale?.addEventListener('change', () => {
      const val = parseInt(scale.value, 10);
      this.manager.updateAccessibility({ uiScale: val });
      document.documentElement.style.fontSize = `${(val / 100) * 16}px`;
    });

    const sub = document.getElementById('set-subtitles') as HTMLInputElement;
    sub?.addEventListener('change', () => {
      this.manager.updateAccessibility({ subtitles: sub.checked });
    });
  }

  private bindDeveloperEvents(): void {
    const fps = document.getElementById('set-dev-fps') as HTMLInputElement;
    fps?.addEventListener('change', () => {
      this.manager.updateDeveloper({ fpsCounter: fps.checked });
    });

    const ai = document.getElementById('set-dev-ai-paths') as HTMLInputElement;
    ai?.addEventListener('change', () => {
      this.manager.updateDeveloper({ showAiPaths: ai.checked });
    });

    const grid = document.getElementById('set-dev-grid') as HTMLInputElement;
    grid?.addEventListener('change', () => {
      this.manager.updateDeveloper({ showGrid: grid.checked });
    });

    const coords = document.getElementById('set-dev-coords') as HTMLInputElement;
    coords?.addEventListener('change', () => {
      this.manager.updateDeveloper({ showCoordinates: coords.checked });
    });

    const god = document.getElementById('set-dev-god') as HTMLInputElement;
    god?.addEventListener('change', () => {
      this.manager.updateDeveloper({ godMode: god.checked, invincible: god.checked });
    });

    document.getElementById('btn-dev-teleport')?.addEventListener('click', () => {
      if (this.onTeleportCallback) this.onTeleportCallback();
    });

    this.container?.querySelectorAll('.btn-dev-level').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const lvl = parseInt((e.currentTarget as HTMLElement).dataset.lvl || '1', 10);
        if (this.onLevelSkipCallback) this.onLevelSkipCallback(lvl);
      });
    });
  }
}
