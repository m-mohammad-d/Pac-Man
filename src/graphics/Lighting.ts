import * as THREE from 'three';
import { GraphicsSettings } from '../settings/SettingsTypes';

export class Lighting {
  public group: THREE.Group;
  public pacmanLight: THREE.PointLight;
  public ghostHouseLight: THREE.PointLight;
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;

  constructor() {
    this.group = new THREE.Group();

    // Ambient light with arcade dark blue tone
    this.ambientLight = new THREE.AmbientLight(0x222a44, 1.2);
    this.group.add(this.ambientLight);

    // Main overhead key light
    this.dirLight = new THREE.DirectionalLight(0xddeeff, 1.5);
    this.dirLight.position.set(10, 30, 20);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 0.5;
    this.dirLight.shadow.camera.far = 100;
    const d = 35;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.group.add(this.dirLight);

    // Pac-Man glow light
    this.pacmanLight = new THREE.PointLight(0xffe600, 2.5, 14, 1.2);
    this.pacmanLight.position.set(0, 1.0, 0);
    this.group.add(this.pacmanLight);

    // Ghost house neon glow
    this.ghostHouseLight = new THREE.PointLight(0xff0099, 2.0, 12, 1.5);
    this.ghostHouseLight.position.set(0, 1.5, 0);
    this.group.add(this.ghostHouseLight);
  }

  public applySettings(settings: GraphicsSettings): void {
    this.ambientLight.intensity = settings.ambientLightQuality;

    if (!settings.shadowsEnabled || settings.shadowQuality === 'off') {
      this.dirLight.castShadow = false;
      return;
    }

    this.dirLight.castShadow = true;
    let size = 1024;
    switch (settings.shadowQuality) {
      case 'low':
        size = 512;
        break;
      case 'medium':
        size = 1024;
        break;
      case 'high':
        size = 2048;
        break;
      case 'ultra':
        size = 4096;
        break;
    }

    this.dirLight.shadow.mapSize.width = size;
    this.dirLight.shadow.mapSize.height = size;
    if (this.dirLight.shadow.map) {
      this.dirLight.shadow.map.dispose();
      this.dirLight.shadow.map = null as any;
    }
  }

  public updatePacmanLight(pos: THREE.Vector3): void {
    this.pacmanLight.position.set(pos.x, pos.y + 0.8, pos.z);
  }
}
