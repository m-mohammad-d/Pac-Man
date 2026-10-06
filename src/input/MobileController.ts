import { Direction } from '../utils/Constants';
import { ResponsiveManager } from '../utils/ResponsiveManager';
import { HapticManager } from '../utils/HapticManager';

export type TouchControlMode = 'joystick' | 'swipe' | 'both';
export type JoystickSizePreset = 'small' | 'medium' | 'large';

export interface MobileControllerOptions {
  mode?: TouchControlMode;
  sizePreset?: JoystickSizePreset;
  deadzone?: number; // 0.0 to 1.0 fraction of radius
  enabled?: boolean;
  onDirection?: (dir: Direction) => void;
}

export class MobileController {
  private container: HTMLElement | null = null;
  private joystickBase: HTMLElement | null = null;
  private joystickKnob: HTMLElement | null = null;
  private arrows: {
    up: HTMLElement | null;
    down: HTMLElement | null;
    left: HTMLElement | null;
    right: HTMLElement | null;
  } = { up: null, down: null, left: null, right: null };

  private swipeOverlay: HTMLElement | null = null;

  private mode: TouchControlMode = 'both';
  private sizePreset: JoystickSizePreset = 'medium';
  private deadzone: number = 0.22;
  private enabled: boolean = true;

  private onDirectionCallback?: (dir: Direction) => void;

  // Joystick touch tracking
  private activeTouchId: number | null = null;
  private baseCenterX: number = 0;
  private baseCenterY: number = 0;
  private baseRadius: number = 65; // Base radius in pixels
  private maxDistance: number = 55; // Max knob displacement

  // Direction state
  private currentDirection: Direction = Direction.NONE;
  private lastActiveDirection: Direction = Direction.NONE;

  // Swipe tracking
  private swipeStartX: number = 0;
  private swipeStartY: number = 0;
  private swipeActiveTouchId: number | null = null;
  private minSwipeDistance: number = 24;

  private responsiveManager: ResponsiveManager;
  private hapticManager: HapticManager;
  private unsubscribeResponsive?: () => void;

  constructor(options: MobileControllerOptions = {}) {
    this.mode = options.mode || 'both';
    this.sizePreset = options.sizePreset || 'medium';
    this.deadzone = options.deadzone ?? 0.22;
    this.enabled = options.enabled ?? true;
    this.onDirectionCallback = options.onDirection;

    this.responsiveManager = ResponsiveManager.getInstance();
    this.hapticManager = HapticManager.getInstance();

    this.createDOM();
    this.updateSizing();
    this.bindTouchEvents();

    this.unsubscribeResponsive = this.responsiveManager.subscribe(() => {
      this.updateSizing();
      this.checkVisibility();
    });

    this.checkVisibility();
  }

  public setDirectionCallback(callback: (dir: Direction) => void): void {
    this.onDirectionCallback = callback;
  }

  public setMode(mode: TouchControlMode): void {
    this.mode = mode;
    this.updateModeVisibility();
  }

  public setSizePreset(preset: JoystickSizePreset): void {
    this.sizePreset = preset;
    this.updateSizing();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.checkVisibility();
  }

  public getCurrentDirection(): Direction {
    return this.currentDirection;
  }

  private createDOM(): void {
    // Remove any previous instance container
    document.getElementById('mobile-joystick-root')?.remove();

    const root = document.createElement('div');
    root.id = 'mobile-joystick-root';
    root.className = 'mobile-joystick-container';

    // Joystick Base & Elements
    root.innerHTML = `
      <div class="joystick-touch-zone" id="joystick-touch-zone">
        <div class="joystick-base" id="joystick-base">
          <div class="joystick-arrow joystick-arrow-up" data-dir="UP">▲</div>
          <div class="joystick-arrow joystick-arrow-down" data-dir="DOWN">▼</div>
          <div class="joystick-arrow joystick-arrow-left" data-dir="LEFT">◀</div>
          <div class="joystick-arrow joystick-arrow-right" data-dir="RIGHT">▶</div>
          <div class="joystick-knob" id="joystick-knob">
            <div class="knob-core"></div>
          </div>
        </div>
      </div>
      <div class="swipe-capture-surface" id="swipe-capture-surface"></div>
    `;

    document.getElementById('game-container')?.appendChild(root);

    this.container = root;
    this.joystickBase = root.querySelector('#joystick-base');
    this.joystickKnob = root.querySelector('#joystick-knob');
    this.swipeOverlay = root.querySelector('#swipe-capture-surface');

    this.arrows = {
      up: root.querySelector('.joystick-arrow-up'),
      down: root.querySelector('.joystick-arrow-down'),
      left: root.querySelector('.joystick-arrow-left'),
      right: root.querySelector('.joystick-arrow-right')
    };

    this.updateModeVisibility();
  }

  private updateSizing(): void {
    if (!this.joystickBase || !this.joystickKnob) return;

    const viewport = this.responsiveManager.getInfo();
    const isPortrait = viewport.isPortrait;
    const minDim = Math.min(viewport.width, viewport.height);

    // Dynamic base diameter according to preset and screen scale
    let baseDiameter = 130;
    if (this.sizePreset === 'small') {
      baseDiameter = Math.max(100, Math.round(minDim * 0.24));
    } else if (this.sizePreset === 'medium') {
      baseDiameter = Math.max(125, Math.round(minDim * 0.28));
    } else if (this.sizePreset === 'large') {
      baseDiameter = Math.max(145, Math.round(minDim * 0.34));
    }

    // Clamp for phones vs tablets
    baseDiameter = Math.min(baseDiameter, isPortrait ? 155 : 170);

    const knobDiameter = Math.round(baseDiameter * 0.44);
    this.baseRadius = baseDiameter / 2;
    this.maxDistance = this.baseRadius * 0.85;

    this.joystickBase.style.width = `${baseDiameter}px`;
    this.joystickBase.style.height = `${baseDiameter}px`;

    this.joystickKnob.style.width = `${knobDiameter}px`;
    this.joystickKnob.style.height = `${knobDiameter}px`;
  }

  private updateModeVisibility(): void {
    if (!this.container || !this.joystickBase || !this.swipeOverlay) return;

    if (this.mode === 'swipe') {
      this.joystickBase.style.display = 'none';
      this.swipeOverlay.style.display = 'block';
    } else if (this.mode === 'joystick') {
      this.joystickBase.style.display = 'block';
      this.swipeOverlay.style.display = 'none';
    } else {
      // 'both'
      this.joystickBase.style.display = 'block';
      this.swipeOverlay.style.display = 'block';
    }
  }

  private checkVisibility(): void {
    if (!this.container) return;

    // Show on touch devices or if screen dimensions indicate a mobile viewport
    const info = this.responsiveManager.getInfo();
    const shouldShow = this.enabled && (info.isTouch || info.isMobile || info.isTablet);

    if (shouldShow) {
      this.container.classList.remove('hidden-controls');
      this.container.style.display = 'block';
    } else {
      this.container.classList.add('hidden-controls');
      this.container.style.display = 'none';
    }
  }

  private bindTouchEvents(): void {
    const touchZone = this.container?.querySelector('#joystick-touch-zone') as HTMLElement;
    const swipeSurface = this.swipeOverlay;

    // 1. Joystick Touch Handlers
    if (touchZone) {
      touchZone.addEventListener('touchstart', (e: TouchEvent) => {
        if (!this.enabled || (this.mode !== 'joystick' && this.mode !== 'both')) return;
        if (this.activeTouchId !== null) return; // Already tracking a finger for joystick

        const touch = e.changedTouches[0];
        this.activeTouchId = touch.identifier;

        this.calcBaseCenter();
        this.handleJoystickMove(touch.clientX, touch.clientY);
        this.setJoystickActiveVisuals(true);
        e.preventDefault();
      }, { passive: false });

      touchZone.addEventListener('touchmove', (e: TouchEvent) => {
        if (this.activeTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.activeTouchId) {
            this.handleJoystickMove(touch.clientX, touch.clientY);
            e.preventDefault();
            break;
          }
        }
      }, { passive: false });

      const handleTouchEnd = (e: TouchEvent) => {
        if (this.activeTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.activeTouchId) {
            this.resetJoystick();
            e.preventDefault();
            break;
          }
        }
      };

      touchZone.addEventListener('touchend', handleTouchEnd, { passive: false });
      touchZone.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    // 2. Swipe Gesture Handlers
    if (swipeSurface) {
      swipeSurface.addEventListener('touchstart', (e: TouchEvent) => {
        if (!this.enabled || (this.mode !== 'swipe' && this.mode !== 'both')) return;
        if (this.swipeActiveTouchId !== null) return;

        const touch = e.changedTouches[0];
        // Don't capture if touch began in joystick zone while joystick is enabled
        if (this.mode === 'both' && this.isInJoystickZone(touch.clientX, touch.clientY)) {
          return;
        }

        this.swipeActiveTouchId = touch.identifier;
        this.swipeStartX = touch.clientX;
        this.swipeStartY = touch.clientY;
      }, { passive: true });

      swipeSurface.addEventListener('touchmove', (e: TouchEvent) => {
        if (this.swipeActiveTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.swipeActiveTouchId) {
            const dx = touch.clientX - this.swipeStartX;
            const dy = touch.clientY - this.swipeStartY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= this.minSwipeDistance) {
              this.processSwipe(dx, dy);
              // Reset start point to support continuous direction gestures
              this.swipeStartX = touch.clientX;
              this.swipeStartY = touch.clientY;
            }
            break;
          }
        }
      }, { passive: true });

      const handleSwipeEnd = (e: TouchEvent) => {
        if (this.swipeActiveTouchId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.swipeActiveTouchId) {
            const touch = e.changedTouches[i];
            const dx = touch.clientX - this.swipeStartX;
            const dy = touch.clientY - this.swipeStartY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= this.minSwipeDistance) {
              this.processSwipe(dx, dy);
            }

            this.swipeActiveTouchId = null;
            break;
          }
        }
      };

      swipeSurface.addEventListener('touchend', handleSwipeEnd, { passive: true });
      swipeSurface.addEventListener('touchcancel', handleSwipeEnd, { passive: true });
    }
  }

  private isInJoystickZone(clientX: number, clientY: number): boolean {
    if (!this.joystickBase) return false;
    const rect = this.joystickBase.getBoundingClientRect();
    const margin = 25;
    return (
      clientX >= rect.left - margin &&
      clientX <= rect.right + margin &&
      clientY >= rect.top - margin &&
      clientY <= rect.bottom + margin
    );
  }

  private calcBaseCenter(): void {
    if (!this.joystickBase) return;
    const rect = this.joystickBase.getBoundingClientRect();
    this.baseCenterX = rect.left + rect.width / 2;
    this.baseCenterY = rect.top + rect.height / 2;
  }

  private handleJoystickMove(clientX: number, clientY: number): void {
    if (!this.joystickKnob) return;

    let deltaX = clientX - this.baseCenterX;
    let deltaY = clientY - this.baseCenterY;
    const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Clamp knob travel to max distance
    if (dist > this.maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      deltaX = Math.cos(angle) * this.maxDistance;
      deltaY = Math.sin(angle) * this.maxDistance;
    }

    // Apply hardware-accelerated transform to knob
    this.joystickKnob.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0)`;

    // Calculate normalized direction vector
    const normalizedDist = dist / this.maxDistance;

    if (normalizedDist < this.deadzone) {
      this.clearActiveDirection();
      return;
    }

    // Determine 4-way direction based on angle with hysteresis
    const angleDeg = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    let dir = Direction.NONE;

    if (angleDeg >= -45 && angleDeg < 45) {
      dir = Direction.RIGHT;
    } else if (angleDeg >= 45 && angleDeg < 135) {
      dir = Direction.DOWN;
    } else if (angleDeg >= -135 && angleDeg < -45) {
      dir = Direction.UP;
    } else {
      dir = Direction.LEFT;
    }

    this.setActiveDirection(dir);
  }

  private processSwipe(dx: number, dy: number): void {
    const dir = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? Direction.RIGHT : Direction.LEFT)
      : (dy > 0 ? Direction.DOWN : Direction.UP);

    this.setActiveDirection(dir);
  }

  private setActiveDirection(dir: Direction): void {
    this.currentDirection = dir;

    if (dir !== this.lastActiveDirection) {
      this.lastActiveDirection = dir;
      this.hapticManager.buttonTap();
      this.highlightArrow(dir);

      if (this.onDirectionCallback) {
        this.onDirectionCallback(dir);
      }
    } else {
      // Re-trigger continuously if needed for Pac-Man corridor turns
      if (this.onDirectionCallback && dir !== Direction.NONE) {
        this.onDirectionCallback(dir);
      }
    }
  }

  private clearActiveDirection(): void {
    this.currentDirection = Direction.NONE;
    this.lastActiveDirection = Direction.NONE;
    this.highlightArrow(Direction.NONE);
  }

  private highlightArrow(dir: Direction): void {
    Object.values(this.arrows).forEach((arrow) => {
      arrow?.classList.remove('active');
    });

    if (dir === Direction.UP && this.arrows.up) {
      this.arrows.up.classList.add('active');
    } else if (dir === Direction.DOWN && this.arrows.down) {
      this.arrows.down.classList.add('active');
    } else if (dir === Direction.LEFT && this.arrows.left) {
      this.arrows.left.classList.add('active');
    } else if (dir === Direction.RIGHT && this.arrows.right) {
      this.arrows.right.classList.add('active');
    }
  }

  private resetJoystick(): void {
    this.activeTouchId = null;

    if (this.joystickKnob) {
      // Spring back to center smoothly
      this.joystickKnob.style.transition = 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      this.joystickKnob.style.transform = 'translate3d(0, 0, 0)';

      setTimeout(() => {
        if (this.joystickKnob) {
          this.joystickKnob.style.transition = '';
        }
      }, 160);
    }

    this.clearActiveDirection();
    this.setJoystickActiveVisuals(false);
  }

  private setJoystickActiveVisuals(active: boolean): void {
    if (!this.joystickBase) return;
    if (active) {
      this.joystickBase.classList.add('active-touch');
    } else {
      this.joystickBase.classList.remove('active-touch');
    }
  }

  public destroy(): void {
    if (this.unsubscribeResponsive) {
      this.unsubscribeResponsive();
    }
    this.container?.remove();
  }
}
