import * as THREE from 'three';
import { Entity } from '../entities/Entity';
import {
  Direction,
  DIR_VECTORS,
  OPPOSITE_DIRECTIONS,
  GhostType,
  GhostMode,
  GHOST_COLORS,
  GHOST_BASE_SPEED,
  GHOST_FRIGHTENED_SPEED,
  GHOST_EATEN_SPEED,
  TILE_SIZE,
  FRIGHTENED_FLASH_TIME
} from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';
import { Maze, TileCoord } from './Maze';
import { Player } from './Player';
import { ColorblindMode } from '../settings/SettingsTypes';

export class Ghost extends Entity {
  public ghostType: GhostType;
  public mode: GhostMode = GhostMode.SCATTER;

  public currentDirection: Direction = Direction.UP;
  public nextTileX: number = 0;
  public nextTileZ: number = 0;
  public progress: number = 0;
  public speed: number = GHOST_BASE_SPEED;
  public speedMultiplier: number = 1.0;
  public colorblindMode: ColorblindMode = 'none';

  private maze: Maze;
  private player: Player;
  private blinkyRef: Ghost | null = null;

  // 3D Visuals
  private bodyMesh: THREE.Group;
  private bodyMaterial: THREE.MeshStandardMaterial;
  private leftPupil: THREE.Mesh;
  private rightPupil: THREE.Mesh;
  private leftEye: THREE.Mesh;
  private rightEye: THREE.Mesh;
  private eyesGroup: THREE.Group;
  private skirtGroup: THREE.Group;

  // Animation
  private floatOffset: number;
  private flashTimer: number = 0;

  // State timers
  public isInsideHouse: boolean = false;
  private houseExitTimer: number = 0;

  constructor(ghostType: GhostType, maze: Maze, player: Player) {
    super();
    this.ghostType = ghostType;
    this.maze = maze;
    this.player = player;
    this.floatOffset = Math.random() * Math.PI * 2;

    this.bodyMesh = new THREE.Group();
    this.eyesGroup = new THREE.Group();
    this.skirtGroup = new THREE.Group();

    // Base material
    this.bodyMaterial = new THREE.MeshStandardMaterial({
      color: GHOST_COLORS[this.ghostType],
      emissive: GHOST_COLORS[this.ghostType],
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.1
    });

    // Create eyes
    const eyeGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.25, 0.45, -0.45);
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.25, 0.45, -0.45);

    const pupilGeo = new THREE.SphereGeometry(0.08, 10, 10);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0022cc, roughness: 0.1 });
    this.leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.leftPupil.position.set(-0.25, 0.45, -0.6);
    this.rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    this.rightPupil.position.set(0.25, 0.45, -0.6);

    this.eyesGroup.add(this.leftEye);
    this.eyesGroup.add(this.rightEye);
    this.eyesGroup.add(this.leftPupil);
    this.eyesGroup.add(this.rightPupil);

    this.buildGhostModel();

    this.mesh.add(this.bodyMesh);
    this.mesh.add(this.eyesGroup);

    this.reset();
  }

  public setBlinkyRef(blinky: Ghost): void {
    this.blinkyRef = blinky;
  }

  private buildGhostModel(): void {
    const radius = 0.6;
    const height = 0.7;

    // Dome head
    const domeGeo = new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMesh = new THREE.Mesh(domeGeo, this.bodyMaterial);
    domeMesh.position.y = 0.35;
    this.bodyMesh.add(domeMesh);

    // Cylinder torso
    const cylGeo = new THREE.CylinderGeometry(radius, radius, height, 20, 1, true);
    const cylMesh = new THREE.Mesh(cylGeo, this.bodyMaterial);
    cylMesh.position.y = 0.0;
    this.bodyMesh.add(cylMesh);

    // Skirt ruffles
    const ruffleCount = 5;
    const ruffleRadius = radius / ruffleCount;
    const ruffleGeo = new THREE.ConeGeometry(ruffleRadius * 1.2, 0.3, 10);

    for (let i = 0; i < ruffleCount; i++) {
      const ruffle = new THREE.Mesh(ruffleGeo, this.bodyMaterial);
      const angle = (i / ruffleCount) * Math.PI * 2;
      const x = Math.cos(angle) * (radius - ruffleRadius * 0.5);
      const z = Math.sin(angle) * (radius - ruffleRadius * 0.5);
      ruffle.position.set(x, -0.35, z);
      ruffle.rotation.x = Math.PI; // Point down
      this.skirtGroup.add(ruffle);
    }
    this.bodyMesh.add(this.skirtGroup);
  }

  public reset(): void {
    const startTile = this.maze.getGhostStartTile(this.ghostType);
    this.tileX = startTile.x;
    this.tileZ = startTile.z;
    this.nextTileX = startTile.x;
    this.nextTileZ = startTile.z;
    this.progress = 0;
    this.mode = GhostMode.CHASE;
    this.currentDirection = Direction.UP;

    this.isInsideHouse = this.ghostType !== GhostType.BLINKY;
    switch (this.ghostType) {
      case GhostType.BLINKY:
        this.houseExitTimer = 0;
        break;
      case GhostType.PINKY:
        this.houseExitTimer = 2.0;
        break;
      case GhostType.INKY:
        this.houseExitTimer = 5.0;
        break;
      case GhostType.CLYDE:
        this.houseExitTimer = 8.0;
        break;
    }

    const world = MathUtils.gridToWorld(
      this.tileX,
      this.tileZ,
      this.maze.width,
      this.maze.height,
      TILE_SIZE
    );
    this.setPosition(world.x, 0.1, world.z);

    this.speed = GHOST_BASE_SPEED * this.speedMultiplier;
    this.updateAppearance();
  }

  public setFrightened(): void {
    if (this.mode === GhostMode.EATEN) return;
    this.mode = GhostMode.FRIGHTENED;
    this.speed = GHOST_FRIGHTENED_SPEED * this.speedMultiplier;
    this.flashTimer = 0;
    // Reverse direction immediately on entering frightened mode
    this.reverseDirection();
    this.updateAppearance();
  }

  public setEaten(): void {
    this.mode = GhostMode.EATEN;
    this.speed = GHOST_EATEN_SPEED;
    this.updateAppearance();
  }

  public restoreMode(): void {
    if (this.mode === GhostMode.FRIGHTENED) {
      this.mode = GhostMode.CHASE;
      this.speed = GHOST_BASE_SPEED * this.speedMultiplier;
      this.updateAppearance();
    }
  }

  private reverseDirection(): void {
    const opp = OPPOSITE_DIRECTIONS[this.currentDirection];
    if (opp !== Direction.NONE) {
      const tempX = this.tileX;
      const tempZ = this.tileZ;
      this.tileX = this.nextTileX;
      this.tileZ = this.nextTileZ;
      this.nextTileX = tempX;
      this.nextTileZ = tempZ;
      this.progress = Math.max(0, 1.0 - this.progress);
      this.currentDirection = opp;
    }
  }

  public update(deltaTime: number): void {
    // Floating levitation animation
    const time = performance.now() * 0.004;
    const floatY = Math.sin(time + this.floatOffset) * 0.12;

    // Handle house behavior
    if (this.isInsideHouse) {
      if (this.houseExitTimer > 0) {
        this.houseExitTimer -= deltaTime;
        // Bob up and down in spawn spot
        const startTile = this.maze.getGhostStartTile(this.ghostType);
        const world = MathUtils.gridToWorld(
          startTile.x,
          startTile.z,
          this.maze.width,
          this.maze.height,
          TILE_SIZE
        );
        this.setPosition(world.x, 0.1 + floatY, world.z);
        this.updateEyeDirection();
        return;
      } else {
        // Step-by-step egress
        if (this.tileX !== 13 && this.nextTileX === this.tileX) {
          this.nextTileX = 13 > this.tileX ? this.tileX + 1 : this.tileX - 1;
          this.currentDirection = 13 > this.tileX ? Direction.RIGHT : Direction.LEFT;
        } else if (this.tileZ > 11 && this.nextTileZ === this.tileZ) {
          this.nextTileZ = this.tileZ - 1;
          this.currentDirection = Direction.UP;
        } else if (this.tileZ <= 11) {
          this.isInsideHouse = false;
        }
      }
    }

    // Progress along current path
    this.progress += this.speed * deltaTime;

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
    this.setPosition(currentX, 0.1 + floatY, currentZ);

    if (this.progress >= 1.0) {
      this.tileX = this.nextTileX;
      this.tileZ = this.nextTileZ;
      this.progress = 0;

      // Wrap tunnel
      const wrapped = this.maze.wrapTile(this.tileX, this.tileZ);
      this.tileX = wrapped.x;
      this.tileZ = wrapped.z;

      // If eaten and reached ghost house door, revive!
      if (this.mode === GhostMode.EATEN) {
        if ((this.tileX === 13 || this.tileX === 14) && (this.tileZ === 11 || this.tileZ === 12)) {
          this.mode = GhostMode.CHASE;
          this.speed = GHOST_BASE_SPEED * this.speedMultiplier;
          this.isInsideHouse = false;
          this.updateAppearance();
        }
      }

      // Decide next direction via Pathfinding AI
      this.decideNextMove();
    }

    // Update eye direction
    this.updateEyeDirection();

    // Flashing when frightened mode is expiring
    if (this.mode === GhostMode.FRIGHTENED) {
      this.flashTimer += deltaTime;
    }
  }

  public updateFrightenedFlash(timeLeft: number): void {
    if (this.mode !== GhostMode.FRIGHTENED) return;

    if (timeLeft <= FRIGHTENED_FLASH_TIME) {
      const flash = Math.floor(timeLeft * 6) % 2 === 0;
      if (flash) {
        this.bodyMaterial.color.setHex(0xffffff);
        this.bodyMaterial.emissive.setHex(0xffffff);
      } else {
        this.bodyMaterial.color.setHex(0x1e38ff);
        this.bodyMaterial.emissive.setHex(0x1020aa);
      }
    } else {
      this.bodyMaterial.color.setHex(0x1e38ff);
      this.bodyMaterial.emissive.setHex(0x1020aa);
    }
  }

  private updateAppearance(): void {
    if (this.mode === GhostMode.EATEN) {
      this.bodyMesh.visible = false;
      this.eyesGroup.visible = true;
    } else if (this.mode === GhostMode.FRIGHTENED) {
      this.bodyMesh.visible = true;
      this.eyesGroup.visible = true;
      this.bodyMaterial.color.setHex(0x1e38ff);
      this.bodyMaterial.emissive.setHex(0x1020aa);
      (this.leftPupil.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
      (this.rightPupil.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
    } else {
      this.bodyMesh.visible = true;
      this.eyesGroup.visible = true;
      const color = this.getGhostColor();
      this.bodyMaterial.color.setHex(color);
      this.bodyMaterial.emissive.setHex(color);
      (this.leftPupil.material as THREE.MeshStandardMaterial).color.setHex(0x0022cc);
      (this.rightPupil.material as THREE.MeshStandardMaterial).color.setHex(0x0022cc);
    }
  }

  public setColorblindMode(mode: ColorblindMode): void {
    this.colorblindMode = mode;
    this.updateAppearance();
  }

  public getGhostColor(): number {
    if (this.colorblindMode === 'protanopia') {
      switch (this.ghostType) {
        case GhostType.BLINKY: return 0xd4a017;
        case GhostType.PINKY: return 0x6fa8dc;
        case GhostType.INKY: return 0x2b78e4;
        case GhostType.CLYDE: return 0xffffff;
      }
    } else if (this.colorblindMode === 'deuteranopia') {
      switch (this.ghostType) {
        case GhostType.BLINKY: return 0xe69138;
        case GhostType.PINKY: return 0x9fc5e8;
        case GhostType.INKY: return 0x0072b2;
        case GhostType.CLYDE: return 0xf1c232;
      }
    } else if (this.colorblindMode === 'tritanopia') {
      switch (this.ghostType) {
        case GhostType.BLINKY: return 0xd55e00;
        case GhostType.PINKY: return 0xcc79a7;
        case GhostType.INKY: return 0x009e73;
        case GhostType.CLYDE: return 0x56b4e9;
      }
    }
    return GHOST_COLORS[this.ghostType];
  }

  private updateEyeDirection(): void {
    const offset = 0.08;
    let ox = 0;
    let oz = 0;

    switch (this.currentDirection) {
      case Direction.UP:
        oz = -offset;
        break;
      case Direction.DOWN:
        oz = offset;
        break;
      case Direction.LEFT:
        ox = -offset;
        break;
      case Direction.RIGHT:
        ox = offset;
        break;
    }

    this.leftPupil.position.set(-0.25 + ox, 0.45, -0.6 + oz);
    this.rightPupil.position.set(0.25 + ox, 0.45, -0.6 + oz);
  }

  private decideNextMove(): void {
    const target = this.getTargetTile();
    const possibleDirs = [Direction.UP, Direction.LEFT, Direction.DOWN, Direction.RIGHT];
    const opposite = OPPOSITE_DIRECTIONS[this.currentDirection];

    const validMoves: { dir: Direction; dist: number; nextTile: TileCoord }[] = [];

    for (const dir of possibleDirs) {
      // Cannot turn 180 degrees back into self under normal conditions
      if (dir === opposite) continue;

      const vec = DIR_VECTORS[dir];
      const checkX = this.tileX + vec.x;
      const checkZ = this.tileZ + vec.z;

      const allowDoor = this.isInsideHouse || this.mode === GhostMode.EATEN;
      if (this.maze.canMove(checkX, checkZ, true, allowDoor)) {
        const dist = MathUtils.euclideanDistance(checkX, checkZ, target.x, target.z);
        validMoves.push({ dir, dist, nextTile: { x: checkX, z: checkZ } });
      }
    }

    // If no forward moves (dead end), allow reversing
    if (validMoves.length === 0) {
      const vec = DIR_VECTORS[opposite];
      const checkX = this.tileX + vec.x;
      const checkZ = this.tileZ + vec.z;
      this.currentDirection = opposite;
      this.nextTileX = checkX;
      this.nextTileZ = checkZ;
      return;
    }

    if (this.mode === GhostMode.FRIGHTENED) {
      // Frightened: pick pseudo-random valid turn
      const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
      this.currentDirection = randomMove.dir;
      this.nextTileX = randomMove.nextTile.x;
      this.nextTileZ = randomMove.nextTile.z;
    } else {
      // Pick move with shortest Euclidean distance to target (classic A*/BFS tile heuristic)
      validMoves.sort((a, b) => a.dist - b.dist);
      const bestMove = validMoves[0];
      this.currentDirection = bestMove.dir;
      this.nextTileX = bestMove.nextTile.x;
      this.nextTileZ = bestMove.nextTile.z;
    }
  }

  private getTargetTile(): TileCoord {
    // If inside house, target door exit
    if (this.isInsideHouse) {
      return { x: 13, z: 11 };
    }

    // If eaten, return to ghost house door
    if (this.mode === GhostMode.EATEN) {
      return { x: 13, z: 12 };
    }

    // If in scatter mode, go to designated home corner
    if (this.mode === GhostMode.SCATTER) {
      return this.maze.getGhostHomeCorner(this.ghostType);
    }

    // Chase Mode AI per ghost personality:
    switch (this.ghostType) {
      case GhostType.BLINKY:
        // Blinky: Directly targets Pac-Man's exact tile
        return { x: this.player.tileX, z: this.player.tileZ };

      case GhostType.PINKY: {
        // Pinky: Ambush target 4 tiles in front of Pac-Man's facing direction
        const dirVec = DIR_VECTORS[this.player.currentDirection];
        return {
          x: this.player.tileX + dirVec.x * 4,
          z: this.player.tileZ + dirVec.z * 4
        };
      }

      case GhostType.INKY: {
        // Inky: Complex flanker vector
        const dirVec = DIR_VECTORS[this.player.currentDirection];
        const pivotX = this.player.tileX + dirVec.x * 2;
        const pivotZ = this.player.tileZ + dirVec.z * 2;

        const blinkyX = this.blinkyRef ? this.blinkyRef.tileX : 13;
        const blinkyZ = this.blinkyRef ? this.blinkyRef.tileZ : 11;

        return {
          x: pivotX + (pivotX - blinkyX),
          z: pivotZ + (pivotZ - blinkyZ)
        };
      }

      case GhostType.CLYDE: {
        // Clyde: If distance > 8 tiles, chase Pac-Man; if <= 8 tiles, retreat to home corner
        const dist = MathUtils.euclideanDistance(
          this.tileX,
          this.tileZ,
          this.player.tileX,
          this.player.tileZ
        );
        if (dist > 8) {
          return { x: this.player.tileX, z: this.player.tileZ };
        } else {
          return this.maze.getGhostHomeCorner(GhostType.CLYDE);
        }
      }
    }
  }
}
