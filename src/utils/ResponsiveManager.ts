export interface ViewportInfo {
  width: number;
  height: number;
  aspectRatio: number;
  dpr: number;
  isPortrait: boolean;
  isLandscape: boolean;
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
}

export type ResponsiveListener = (info: ViewportInfo) => void;

export class ResponsiveManager {
  private static instance: ResponsiveManager;
  private listeners: Set<ResponsiveListener> = new Set();
  private currentInfo: ViewportInfo;
  private resizeRafId: number | null = null;

  private constructor() {
    this.currentInfo = this.measure();
    this.bindEvents();
  }

  public static getInstance(): ResponsiveManager {
    if (!ResponsiveManager.instance) {
      ResponsiveManager.instance = new ResponsiveManager();
    }
    return ResponsiveManager.instance;
  }

  public getInfo(): ViewportInfo {
    return this.currentInfo;
  }

  public isPortrait(): boolean {
    return this.currentInfo.isPortrait;
  }

  public isMobile(): boolean {
    return this.currentInfo.isMobile;
  }

  public isTouch(): boolean {
    return this.currentInfo.isTouch;
  }

  public getAspectRatio(): number {
    return this.currentInfo.aspectRatio;
  }

  /**
   * Calculates an adaptive vertical FOV for Three.js perspective cameras.
   * When in portrait mode (aspect < 1.0), perspective cameras naturally crop the sides.
   * This adapts the vertical FOV so that horizontal corridor coverage remains visible.
   */
  public getAdaptiveFov(baseFov: number = 48): number {
    const aspect = this.currentInfo.aspectRatio;
    if (aspect >= 1.2) {
      return baseFov;
    }

    // In portrait, expand FOV proportionally to keep horizontal width in frame
    const baseAspect = 1.33; // Reference 4:3 baseline aspect ratio
    const radFov = (baseFov * Math.PI) / 180;
    // Calculate horizontal half-angle
    const halfTanH = Math.tan(radFov / 2) * (baseAspect / Math.max(0.48, aspect));
    const adaptedRad = 2 * Math.atan(halfTanH);
    const adaptedFov = (adaptedRad * 180) / Math.PI;

    // Clamp between baseFov and 78 degrees to avoid extreme fisheye distortion
    return Math.min(78, Math.max(baseFov, Math.round(adaptedFov)));
  }

  public subscribe(listener: ResponsiveListener): () => void {
    this.listeners.add(listener);
    listener(this.currentInfo);
    return () => this.listeners.delete(listener);
  }

  private measure(): ViewportInfo {
    const width = window.innerWidth || document.documentElement.clientWidth || 360;
    const height = window.innerHeight || document.documentElement.clientHeight || 640;
    const aspectRatio = width / Math.max(1, height);
    const isPortrait = height > width;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const hasTouch = typeof window !== 'undefined' && (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints && navigator.maxTouchPoints > 0) ||
      ((navigator as any).msMaxTouchPoints && (navigator as any).msMaxTouchPoints > 0)
    );

    const isMobileUa = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua);
    const isTabletUa = /ipad|tablet|(android(?!.*mobile))/i.test(ua);

    const isMobileByDimension = Math.min(width, height) <= 600 || (width <= 820 && hasTouch);
    const isMobile = isMobileUa || (hasTouch && isMobileByDimension);
    const isTablet = isTabletUa || (hasTouch && !isMobile && Math.min(width, height) <= 1024);

    return {
      width,
      height,
      aspectRatio,
      dpr,
      isPortrait,
      isLandscape: !isPortrait,
      isMobile,
      isTablet,
      isTouch: !!hasTouch
    };
  }

  private bindEvents(): void {
    const handleUpdate = () => {
      if (this.resizeRafId !== null) {
        cancelAnimationFrame(this.resizeRafId);
      }
      this.resizeRafId = requestAnimationFrame(() => {
        this.currentInfo = this.measure();
        this.notifyListeners();
        this.resizeRafId = null;
      });
    };

    window.addEventListener('resize', handleUpdate, { passive: true });
    window.addEventListener('orientationchange', () => {
      // Delay slightly for mobile browser navigation bars to finish orientation redraw
      setTimeout(handleUpdate, 100);
      setTimeout(handleUpdate, 300);
    }, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleUpdate, { passive: true });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentInfo);
      } catch (err) {
        console.error('Error in ResponsiveManager listener:', err);
      }
    });
  }
}

