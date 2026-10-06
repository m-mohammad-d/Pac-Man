export class HapticManager {
  private static instance: HapticManager;
  public enabled: boolean = true;
  private lastPelletTime: number = 0;
  private pelletThrottleMs: number = 110;

  private constructor() {}

  public static getInstance(): HapticManager {
    if (!HapticManager.instance) {
      HapticManager.instance = new HapticManager();
    }
    return HapticManager.instance;
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator;
  }

  public vibrate(pattern: number | number[]): void {
    if (!this.enabled || !this.isSupported()) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore vibration errors on browsers with permission restrictions
    }
  }

  /**
   * Subtle vibration when eating a standard pellet.
   * Throttled so rapid eating produces a pleasant rhythm rather than continuous motor buzzing.
   */
  public pellet(): void {
    const now = performance.now();
    if (now - this.lastPelletTime < this.pelletThrottleMs) return;
    this.lastPelletTime = now;
    this.vibrate(8);
  }

  /**
   * Pulsing vibration when collecting a power pellet.
   */
  public powerPellet(): void {
    this.vibrate([25, 20, 35]);
  }

  /**
   * Punchy feedback when chomping a frightened ghost.
   */
  public eatGhost(): void {
    this.vibrate([40, 25, 70]);
  }

  /**
   * Stronger impact vibration when Pac-Man is caught by a ghost.
   */
  public death(): void {
    this.vibrate([100, 40, 160]);
  }

  /**
   * Triumphant rhythmic pattern upon completing a maze level.
   */
  public levelClear(): void {
    this.vibrate([50, 30, 50, 30, 120]);
  }

  /**
   * Subtle tactile feedback for interactive UI buttons and virtual controls.
   */
  public buttonTap(): void {
    this.vibrate(10);
  }
}

