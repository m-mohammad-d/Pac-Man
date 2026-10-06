import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import { TILE_SIZE } from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';

export class Pellet extends Entity {
  public readonly isPowerPellet: boolean;
  public collected: boolean = false;
  private glowMesh: THREE.Mesh | null = null;

  constructor(tileX: number, tileZ: number, isPowerPellet: boolean, gridWidth: number, gridHeight: number) {
    super();
    this.tileX = tileX;
    this.tileZ = tileZ;
    this.isPowerPellet = isPowerPellet;

    const world = MathUtils.gridToWorld(tileX, tileZ, gridWidth, gridHeight, TILE_SIZE);
    this.setPosition(world.x, 0, world.z);

    const radius = isPowerPellet ? 0.38 : 0.16;

    const geometry = new THREE.SphereGeometry(radius, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: isPowerPellet ? 0xffffff : 0xffe600,
      emissive: isPowerPellet ? 0xffea00 : 0xff9900,
      emissiveIntensity: isPowerPellet ? 1.0 : 0.6,
      roughness: 0.2,
      metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    this.mesh.add(mesh);

    if (isPowerPellet) {
      // Outer translucent glow shell
      const glowGeo = new THREE.SphereGeometry(radius * 1.5, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0xffea00,
        transparent: true,
        opacity: 0.3,
        wireframe: true
      });
      this.glowMesh = new THREE.Mesh(glowGeo, glowMat);
      this.mesh.add(this.glowMesh);
    }
  }

  public update(deltaTime: number): void {
    if (this.collected) return;

    if (this.isPowerPellet) {
      const time = performance.now() * 0.005;
      const scale = 1.0 + Math.sin(time) * 0.25;
      this.mesh.scale.set(scale, scale, scale);
      if (this.glowMesh) {
        this.glowMesh.rotation.y += deltaTime * 2.0;
        this.glowMesh.rotation.x += deltaTime * 1.5;
      }
    }
  }

  public collect(): void {
    this.collected = true;
    this.mesh.visible = false;
    this.active = false;
  }

  public reset(): void {
    this.collected = false;
    this.mesh.visible = true;
    this.active = true;
    this.mesh.scale.set(1, 1, 1);
  }
}
