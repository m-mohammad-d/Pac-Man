import * as THREE from 'three';

export class Lighting {
  public group: THREE.Group;
  public pacmanLight: THREE.PointLight;
  public ghostHouseLight: THREE.PointLight;

  constructor() {
    this.group = new THREE.Group();

    // Ambient light with arcade dark blue tone
    const ambientLight = new THREE.AmbientLight(0x222a44, 1.2);
    this.group.add(ambientLight);

    // Main overhead key light
    const dirLight = new THREE.DirectionalLight(0xddeeff, 1.5);
    dirLight.position.set(10, 30, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    const d = 35;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.bias = -0.0005;
    this.group.add(dirLight);

    // Pac-Man glow light
    this.pacmanLight = new THREE.PointLight(0xffe600, 2.5, 14, 1.2);
    this.pacmanLight.position.set(0, 1.0, 0);
    this.group.add(this.pacmanLight);

    // Ghost house neon glow
    this.ghostHouseLight = new THREE.PointLight(0xff0099, 2.0, 12, 1.5);
    this.ghostHouseLight.position.set(0, 1.5, 0);
    this.group.add(this.ghostHouseLight);
  }

  public updatePacmanLight(pos: THREE.Vector3): void {
    this.pacmanLight.position.set(pos.x, pos.y + 0.8, pos.z);
  }
}

