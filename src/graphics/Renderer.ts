import * as THREE from 'three';
import { GraphicsSettings, ResolutionPreset } from '../settings/SettingsTypes';
import { ResponsiveManager, ViewportInfo } from '../utils/ResponsiveManager';

export class Renderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public canvas: HTMLCanvasElement;
  private currentResolution: ResolutionPreset = 'native';
  private currentSettings?: GraphicsSettings;
  private responsiveManager: ResponsiveManager;
  private unsubscribeResponsive?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.responsiveManager = ResponsiveManager.getInstance();
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060814);
    this.scene.fog = new THREE.FogExp2(0x060814, 0.012);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    this.unsubscribeResponsive = this.responsiveManager.subscribe((info) => {
      this.onResponsiveChange(info);
    });

    this.updateDimensions();
  }

  public applySettings(settings: GraphicsSettings): void {
    this.currentSettings = settings;
    this.currentResolution = settings.resolution;
    this.updateDimensions();

    this.renderer.shadowMap.enabled = settings.shadowsEnabled;
    this.renderer.toneMappingExposure = 1.0 + (settings.bloomGlowIntensity - 1.0) * 0.4;

    this.updatePixelRatio();
  }

  private updatePixelRatio(): void {
    const isMobile = this.responsiveManager.isMobile();
    const s = this.currentSettings;

    let targetDpr = window.devicePixelRatio || 1;

    if (s?.batterySaver || s?.performanceMode) {
      targetDpr = 1.0;
    } else if (s?.preset === 'mobile_low' || s?.preset === 'low') {
      targetDpr = Math.min(1.0, window.devicePixelRatio || 1);
    } else if (s?.preset === 'mobile_medium') {
      targetDpr = Math.min(1.25, window.devicePixelRatio || 1);
    } else if (s?.preset === 'mobile_high') {
      targetDpr = Math.min(1.5, window.devicePixelRatio || 1);
    } else if (isMobile) {
      targetDpr = Math.min(1.5, window.devicePixelRatio || 1);
    } else {
      targetDpr = s?.antiAliasing ? Math.min(window.devicePixelRatio || 1, 2) : 1.0;
    }

    this.renderer.setPixelRatio(targetDpr);
  }

  private onResponsiveChange(_info: ViewportInfo): void {
    this.updateDimensions();
    this.updatePixelRatio();
  }

  private updateDimensions(): void {
    const info = this.responsiveManager.getInfo();
    let width = info.width;
    let height = info.height;

    if (this.currentResolution === '1280x720') {
      width = Math.min(width, 1280);
      height = Math.min(height, 720);
    } else if (this.currentResolution === '1920x1080') {
      width = Math.min(width, 1920);
      height = Math.min(height, 1080);
    } else if (this.currentResolution === '2560x1440') {
      width = Math.min(width, 2560);
      height = Math.min(height, 1440);
    }

    this.renderer.setSize(width, height, false);
    if (this.currentResolution !== 'native') {
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
    } else {
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
    }
  }

  public getAspectRatio(): number {
    return this.responsiveManager.getAspectRatio();
  }

  public render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  public dispose(): void {
    if (this.unsubscribeResponsive) {
      this.unsubscribeResponsive();
    }
    this.renderer.dispose();
  }
}
