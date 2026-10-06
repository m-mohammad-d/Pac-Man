import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

export class Effects {
  public group: THREE.Group;
  private particles: Particle[] = [];
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.PointsMaterial;
  private pointsMesh: THREE.Points;
  private maxParticles: number = 300;

  private posArray: Float32Array;
  private colArray: Float32Array;

  constructor() {
    this.group = new THREE.Group();

    this.posArray = new Float32Array(this.maxParticles * 3);
    this.colArray = new Float32Array(this.maxParticles * 3);

    this.particleGeo = new THREE.BufferGeometry();
    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(this.posArray, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(this.colArray, 3));

    this.particleMat = new THREE.PointsMaterial({
      size: 0.35,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.pointsMesh = new THREE.Points(this.particleGeo, this.particleMat);
    this.group.add(this.pointsMesh);
  }

  public spawnPelletBurst(pos: THREE.Vector3, isPower: boolean = false): void {
    const count = isPower ? 35 : 12;
    const baseColor = isPower ? new THREE.Color(0xffffff) : new THREE.Color(0xffe600);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * (isPower ? 7.0 : 3.5) + 1.0;
      const vy = Math.random() * 4.0 + 1.0;

      this.particles.push({
        position: pos.clone().add(new THREE.Vector3(0, 0.2, 0)),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          vy,
          Math.sin(angle) * speed
        ),
        color: baseColor.clone(),
        size: isPower ? 0.45 : 0.25,
        life: 0,
        maxLife: isPower ? 0.8 : 0.45
      });
    }
  }

  public spawnGhostBurst(pos: THREE.Vector3, colorHex: number = 0x00e5ff): void {
    const count = 40;
    const baseColor = new THREE.Color(colorHex);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const speed = Math.random() * 8.0 + 2.0;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      this.particles.push({
        position: pos.clone(),
        velocity: dir.multiplyScalar(speed),
        color: baseColor.clone(),
        size: 0.5,
        life: 0,
        maxLife: 1.0
      });
    }
  }

  public spawnDeathBurst(pos: THREE.Vector3): void {
    const count = 60;
    const yellowColor = new THREE.Color(0xffe600);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6.0 + 1.0;

      this.particles.push({
        position: pos.clone(),
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          Math.random() * 5.0 + 1.0,
          Math.sin(angle) * speed
        ),
        color: yellowColor.clone(),
        size: 0.4,
        life: 0,
        maxLife: 1.2
      });
    }
  }

  public update(deltaTime: number): void {
    const gravity = -9.8;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaTime;

      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.velocity.y += gravity * deltaTime * 0.5;
      p.position.addScaledVector(p.velocity, deltaTime);
    }

    // Update BufferGeometry
    const posAttr = this.particleGeo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleGeo.getAttribute('color') as THREE.BufferAttribute;

    const count = this.particles.length;
    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      const i3 = i * 3;

      this.posArray[i3] = p.position.x;
      this.posArray[i3 + 1] = p.position.y;
      this.posArray[i3 + 2] = p.position.z;

      const fade = 1 - p.life / p.maxLife;
      this.colArray[i3] = p.color.r * fade;
      this.colArray[i3 + 1] = p.color.g * fade;
      this.colArray[i3 + 2] = p.color.b * fade;
    }

    // Zero out unused slots
    for (let i = count; i < this.maxParticles; i++) {
      const i3 = i * 3;
      this.posArray[i3] = 0;
      this.posArray[i3 + 1] = -1000;
      this.posArray[i3 + 2] = 0;
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    this.particleGeo.setDrawRange(0, count);
  }

  public clear(): void {
    this.particles = [];
    this.particleGeo.setDrawRange(0, 0);
  }
}

