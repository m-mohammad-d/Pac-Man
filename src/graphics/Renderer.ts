import * as THREE from 'three';
import { GraphicsSettings, ResolutionPreset } from '../settings/SettingsTypes';

export class Renderer {
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public canvas: HTMLCanvasElement;
  private currentResolution: ResolutionPreset = 'native';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060814);
    this.scene.fog = new THREE.FogExp2(0x060814, 0.012);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.updateDimensions();
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  public applySettings(settings: GraphicsSettings): void {
    this.currentResolution = settings.resolution;
    this.updateDimensions();

    this.renderer.shadowMap.enabled = settings.shadowsEnabled;
    this.renderer.toneMappingExposure = 1.0 + (settings.bloomGlowIntensity - 1.0) * 0.4;

    const pixelRatio = settings.performanceMode
      ? 1.0
      : settings.antiAliasing
      ? Math.min(window.devicePixelRatio, 2)
      : 1.0;
    this.renderer.setPixelRatio(pixelRatio);
  }

  private onResize(): void {
    this.updateDimensions();
  }

  private updateDimensions(): void {
    let width = window.innerWidth;
    let height = window.innerHeight;

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
    return window.innerWidth / window.innerHeight;
  }

  public render(camera: THREE.Camera): void {
    this.renderer.render(this.scene, camera);
  }

  public dispose(): void {
    window.removeEventListener('resize', this.onResize.bind(this));
    this.renderer.dispose();
  }
}
