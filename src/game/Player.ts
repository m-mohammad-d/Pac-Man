import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import { Direction, DIR_VECTORS, OPPOSITE_DIRECTIONS, PLAYER_BASE_SPEED, TILE_SIZE } from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';
import { Maze } from './Maze';

export class Player extends Entity {
  public currentDirection: Direction = Direction.NONE;
  public requestedDirection: Direction = Direction.NONE;

  public nextTileX: number = 0;
  public nextTileZ: number = 0;
  public progress: number = 0; // 0 to 1 between tile and nextTile
  public speed: number = PLAYER_BASE_SPEED;

  public targetRotationY: number = 0;
  public currentRotationY: number = 0;

  // 3D Model parts
  private upperJaw: THREE.Group;
  private lowerJaw: THREE.Group;
  private chompPhase: number = 0;
  private chompSpeed: number = 18.0;
  public isMoving: boolean = false;

  private maze: Maze;

  constructor(maze: Maze) {
    super();
    this.maze = maze;

    // Create container groups for upper and lower jaws
    this.upperJaw = new THREE.Group();
    this.lowerJaw = new THREE.Group();

    this.buildPacmanModel();

    this.mesh.add(this.upperJaw);
    this.mesh.add(this.lowerJaw);

    this.reset();
  }

  private buildPacmanModel(): void {
    const radius = 0.65;
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xffe600,
      emissive: 0xffb700,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.15
    });

    // Upper jaw hemisphere (0 to PI in theta)
    const upperGeo = new THREE.SphereGeometry(
      radius,
      24,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const upperMesh = new THREE.Mesh(upperGeo, bodyMat);
    upperMesh.castShadow = true;
    this.upperJaw.add(upperMesh);

    // Flat mouth interior disc for upper jaw
    const discGeo = new THREE.CircleGeometry(radius, 24);
    const insideMat = new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.DoubleSide });
    const upperDisc = new THREE.Mesh(discGeo, insideMat);
    upperDisc.rotation.x = Math.PI / 2;
    this.upperJaw.add(upperDisc);

    // Lower jaw hemisphere (PI/2 to PI in phi)
    const lowerGeo = new THREE.SphereGeometry(
      radius,
      24,
      16,
      0,
      Math.PI * 2,
      Math.PI / 2,
      Math.PI / 2
    );
    const lowerMesh = new THREE.Mesh(lowerGeo, bodyMat);
    lowerMesh.castShadow = true;
    this.lowerJaw.add(lowerMesh);

    const lowerDisc = new THREE.Mesh(discGeo, insideMat);
    lowerDisc.rotation.x = -Math.PI / 2;
    this.lowerJaw.add(lowerDisc);

    // Eyes on upper jaw
    const eyeGeo = new THREE.SphereGeometry(0.1, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.1 });

    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.35, 0.35, -0.38);
    this.upperJaw.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.35, 0.35, -0.38);
    this.upperJaw.add(rightEye);
  }

  public reset(): void {
    const start = this.maze.getPacmanStartTile();
    this.tileX = start.x;
    this.tileZ = start.z;
    this.nextTileX = start.x;
    this.nextTileZ = start.z;
    this.progress = 0;
    this.currentDirection = Direction.NONE;
    this.requestedDirection = Direction.NONE;
    this.isMoving = false;

    const world = MathUtils.gridToWorld(
      this.tileX,
      this.tileZ,
      this.maze.width,
      this.maze.height,
      TILE_SIZE
    );
    this.setPosition(world.x, 0.1, world.z);

    this.targetRotationY = Math.PI; // Face UP initially
    this.currentRotationY = Math.PI;
    this.mesh.rotation.y = Math.PI;

    this.upperJaw.rotation.x = 0;
    this.lowerJaw.rotation.x = 0;
    this.mesh.visible = true;
  }

  public setRequestedDirection(dir: Direction): void {
    if (dir === Direction.NONE) return;
    this.requestedDirection = dir;

    // Instant reverse check
    if (
      this.currentDirection !== Direction.NONE &&
      dir === OPPOSITE_DIRECTIONS[this.currentDirection]
    ) {
      // Instantly turn back towards previous tile
      const tempX = this.tileX;
      const tempZ = this.tileZ;
      this.tileX = this.nextTileX;
      this.tileZ = this.nextTileZ;
      this.nextTileX = tempX;
      this.nextTileZ = tempZ;
      this.progress = Math.max(0, 1.0 - this.progress);
      this.currentDirection = dir;
      this.updateTargetRotation();
    }
  }

  public update(deltaTime: number): void {
    // If stopped, try to start moving in requested or current direction
    if (this.currentDirection === Direction.NONE) {
      if (this.requestedDirection !== Direction.NONE) {
        if (this.canMoveInDirection(this.requestedDirection)) {
          this.startMovingInDirection(this.requestedDirection);
        }
      }
    }

    if (this.currentDirection !== Direction.NONE) {
      this.isMoving = true;
      this.progress += this.speed * deltaTime;

      // World position interpolation
      const fromWorld = MathUtils.gridToWorld(
        this.tileX,
        this.tileZ,
        this.maze.width,
        this.maze.height,
        TILE_SIZE
      );
      const toWorld = MathUtils.gridToWorld(
        this.nextTileX,
        this.nextTileZ,
        this.maze.width,
        this.maze.height,
        TILE_SIZE
      );

      const currentX = MathUtils.lerp(fromWorld.x, toWorld.x, this.progress);
      const currentZ = MathUtils.lerp(fromWorld.z, toWorld.z, this.progress);
      this.setPosition(currentX, 0.1, currentZ);

      // Tile arrival
      if (this.progress >= 1.0) {
        this.tileX = this.nextTileX;
        this.tileZ = this.nextTileZ;
        this.progress = 0;

        // Wrap coordinates if needed
        const wrapped = this.maze.wrapTile(this.tileX, this.tileZ);
        this.tileX = wrapped.x;
        this.tileZ = wrapped.z;

        // Try requested turn first
        if (
          this.requestedDirection !== Direction.NONE &&
          this.canMoveInDirection(this.requestedDirection)
        ) {
          this.startMovingInDirection(this.requestedDirection);
        } else if (this.canMoveInDirection(this.currentDirection)) {
          // Keep going forward
          this.startMovingInDirection(this.currentDirection);
        } else {
          // Hit a wall
          this.currentDirection = Direction.NONE;
          this.isMoving = false;
        }
      }
    } else {
      this.isMoving = false;
    }

    // Animate mouth chomp
    if (this.isMoving) {
      this.chompPhase += deltaTime * this.chompSpeed;
      const angle = (Math.sin(this.chompPhase) * 0.5 + 0.5) * 0.45; // 0 to 0.45 radians
      this.upperJaw.rotation.x = -angle;
      this.lowerJaw.rotation.x = angle;
    } else {
      this.upperJaw.rotation.x = -0.1;
      this.lowerJaw.rotation.x = 0.1;
    }

    // Smooth rotation towards movement direction
    this.currentRotationY = MathUtils.lerpAngle(
      this.currentRotationY,
      this.targetRotationY,
      Math.min(1.0, deltaTime * 14.0)
    );
    this.mesh.rotation.y = this.currentRotationY;
  }

  private canMoveInDirection(dir: Direction): boolean {
    const vec = DIR_VECTORS[dir];
    const targetX = this.tileX + vec.x;
    const targetZ = this.tileZ + vec.z;
    return this.maze.canMove(targetX, targetZ, false, false);
  }

  private startMovingInDirection(dir: Direction): void {
    this.currentDirection = dir;
    const vec = DIR_VECTORS[dir];
    this.nextTileX = this.tileX + vec.x;
    this.nextTileZ = this.tileZ + vec.z;
    this.updateTargetRotation();
  }

  private updateTargetRotation(): void {
    this.targetRotationY = MathUtils.angleFromDirection(this.currentDirection);
  }

  public playDeathAnimation(progress: number): void {
    // Spin and shrink down
    this.mesh.rotation.y += 0.3;
    const scale = Math.max(0.01, 1.0 - progress);
    this.mesh.scale.set(scale, scale, scale);
    this.upperJaw.rotation.x = -progress * 1.5;
    this.lowerJaw.rotation.x = progress * 1.5;
  }
}
