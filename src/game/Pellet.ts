import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import { TILE_SIZE } from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';

export class Pellet extends Entity {
  public readonly isPowerPellet: boolean;
  public collected: boolean = false;
  private glowMesh: THREE.Mesh | null = null;

  // Shared cached geometries and materials across all pellet instances
  private static regularGeo: THREE.SphereGeometry | null = null;
  private static regularMat: THREE.MeshStandardMaterial | null = null;
  private static powerGeo: THREE.SphereGeometry | null = null;
  private static powerMat: THREE.MeshStandardMaterial | null = null;
  private static powerGlowGeo: THREE.SphereGeometry | null = null;
  private static powerGlowMat: THREE.MeshBasicMaterial | null = null;

  constructor(tileX: number, tileZ: number, isPowerPellet: boolean, gridWidth: number, gridHeight: number) {
    super();
    this.tileX = tileX;
    this.tileZ = tileZ;
    this.isPowerPellet = isPowerPellet;

    const world = MathUtils.gridToWorld(tileX, tileZ, gridWidth, gridHeight, TILE_SIZE);
    this.setPosition(world.x, 0, world.z);

    if (isPowerPellet) {
      if (!Pellet.powerGeo) {
        Pellet.powerGeo = new THREE.SphereGeometry(0.38, 14, 14);
      }
      if (!Pellet.powerMat) {
        Pellet.powerMat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: 0xffea00,
          emissiveIntensity: 1.0,
          roughness: 0.2,
          metalness: 0.1
        });
      }
      const mesh = new THREE.Mesh(Pellet.powerGeo, Pellet.powerMat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.mesh.add(mesh);

      // Outer translucent glow shell
      if (!Pellet.powerGlowGeo) {
        Pellet.powerGlowGeo = new THREE.SphereGeometry(0.38 * 1.5, 12, 12);
      }
      if (!Pellet.powerGlowMat) {
        Pellet.powerGlowMat = new THREE.MeshBasicMaterial({
          color: 0xffea00,
          transparent: true,
          opacity: 0.3,
          wireframe: true
        });
      }
      this.glowMesh = new THREE.Mesh(Pellet.powerGlowGeo, Pellet.powerGlowMat);
      this.mesh.add(this.glowMesh);
    } else {
      if (!Pellet.regularGeo) {
        Pellet.regularGeo = new THREE.SphereGeometry(0.16, 10, 10);
      }
      if (!Pellet.regularMat) {
        Pellet.regularMat = new THREE.MeshStandardMaterial({
          color: 0xffe600,
          emissive: 0xff9900,
          emissiveIntensity: 0.6,
          roughness: 0.3,
          metalness: 0.1
        });
      }
      const mesh = new THREE.Mesh(Pellet.regularGeo, Pellet.regularMat);
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      this.mesh.add(mesh);
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
