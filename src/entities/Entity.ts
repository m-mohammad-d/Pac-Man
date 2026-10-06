import * as THREE from 'three';

export abstract class Entity {
  public mesh: THREE.Group;
  public tileX: number = 0;
  public tileZ: number = 0;
  public active: boolean = true;

  constructor() {
    this.mesh = new THREE.Group();
  }

  public abstract update(deltaTime: number): void;

  public setPosition(x: number, y: number, z: number): void {
    this.mesh.position.set(x, y, z);
  }

  public get position(): THREE.Vector3 {
    return this.mesh.position;
  }

  public dispose(): void {
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else if (child.material) {
          child.material.dispose();
        }
      }
    });
  }
}

