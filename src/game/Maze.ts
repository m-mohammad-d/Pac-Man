import * as THREE from 'three';
import { TILE_SIZE, WALL_HEIGHT, GhostType } from '../utils/Constants';
import { MathUtils } from '../utils/MathUtils';

export const MAZE_LAYOUT: string[] = [
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#*####.#####.##.#####.####*#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.##### ## #####.######",
  "     #.##### ## #####.#     ",
  "     #.##    --    ##.#     ",
  "     #.## ###  ### ##.#     ",
  "######.## #GGGGGG# ##.######",
  "          #GGGGGG#          ",
  "######.## #GGGGGG# ##.######",
  "     #.## ######## ##.#     ",
  "     #.##          ##.#     ",
  "     #.## ######## ##.#     ",
  "######.## ######## ##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#*..##.......  .......##..*#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################"
];

export interface TileCoord {
  x: number;
  z: number;
}

export class Maze {
  public readonly width: number;
  public readonly height: number;
  public readonly grid: string[];
  public group: THREE.Group;

  public readonly tunnelRow: number = 14;

  constructor() {
    this.grid = MAZE_LAYOUT;
    this.height = this.grid.length;
    this.width = this.grid[0].length;
    this.group = new THREE.Group();
    this.build3DMaze();
  }

  private build3DMaze(): void {
    const wallGeo = new THREE.BoxGeometry(TILE_SIZE, WALL_HEIGHT, TILE_SIZE);
    const wallCapGeo = new THREE.BoxGeometry(TILE_SIZE, 0.1, TILE_SIZE);

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x0c142b,
      metalness: 0.6,
      roughness: 0.3
    });

    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x0088cc,
      emissiveIntensity: 0.6,
      metalness: 0.2,
      roughness: 0.2
    });

    // Floor
    const floorWidth = this.width * TILE_SIZE + 4;
    const floorHeight = this.height * TILE_SIZE + 4;
    const floorGeo = new THREE.PlaneGeometry(floorWidth, floorHeight);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x060814,
      roughness: 0.7,
      metalness: 0.3
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -WALL_HEIGHT / 2;
    floor.receiveShadow = true;
    this.group.add(floor);

    // Floor grid accents
    const gridHelper = new THREE.GridHelper(
      Math.max(floorWidth, floorHeight),
      Math.round(Math.max(this.width, this.height)),
      0x004488,
      0x001f3f
    );
    gridHelper.position.y = -WALL_HEIGHT / 2 + 0.02;
    this.group.add(gridHelper);

    // Build walls
    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const char = this.grid[z][x];
        const world = MathUtils.gridToWorld(x, z, this.width, this.height, TILE_SIZE);

        if (char === '#') {
          const wallMesh = new THREE.Mesh(wallGeo, wallMaterial);
          wallMesh.position.set(world.x, 0, world.z);
          wallMesh.castShadow = true;
          wallMesh.receiveShadow = true;
          this.group.add(wallMesh);

          // Glowing top neon border cap
          const capMesh = new THREE.Mesh(wallCapGeo, capMaterial);
          capMesh.position.set(world.x, WALL_HEIGHT / 2 + 0.05, world.z);
          this.group.add(capMesh);
        } else if (char === '-') {
          // Ghost house gate
          const gateGeo = new THREE.BoxGeometry(TILE_SIZE, 0.4, 0.4);
          const gateMat = new THREE.MeshStandardMaterial({
            color: 0xff007f,
            emissive: 0xff007f,
            emissiveIntensity: 0.8,
            transparent: true,
            opacity: 0.7
          });
          const gate = new THREE.Mesh(gateGeo, gateMat);
          gate.position.set(world.x, 0, world.z);
          this.group.add(gate);
        }
      }
    }
  }

  public isWall(x: number, z: number): boolean {
    if (z === this.tunnelRow && (x < 0 || x >= this.width)) {
      return false; // Tunnel wrap zone
    }
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return true;
    }
    return this.grid[z][x] === '#';
  }

  public isGhostDoor(x: number, z: number): boolean {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) return false;
    return this.grid[z][x] === '-';
  }

  public isGhostHouse(x: number, z: number): boolean {
    if (x < 0 || x >= this.width || z < 0 || z >= this.height) return false;
    const c = this.grid[z][x];
    return c === 'G' || c === '-';
  }

  public canMove(x: number, z: number, isGhost: boolean = false, allowDoor: boolean = false): boolean {
    // Tunnel wrapping
    if (z === this.tunnelRow && (x < 0 || x >= this.width)) {
      return true;
    }

    if (x < 0 || x >= this.width || z < 0 || z >= this.height) {
      return false;
    }

    const cell = this.grid[z][x];
    if (cell === '#') return false;
    if (cell === '-') {
      return isGhost && allowDoor;
    }
    return true;
  }

  public wrapTile(x: number, z: number): TileCoord {
    if (z === this.tunnelRow) {
      if (x < 0) return { x: this.width - 1, z };
      if (x >= this.width) return { x: 0, z };
    }
    return { x, z };
  }

  public getPacmanStartTile(): TileCoord {
    return { x: 13, z: 23 };
  }

  public getGhostStartTile(ghostType: GhostType): TileCoord {
    switch (ghostType) {
      case GhostType.BLINKY:
        return { x: 13, z: 11 }; // Directly outside ghost house
      case GhostType.PINKY:
        return { x: 13, z: 14 }; // Inside house center
      case GhostType.INKY:
        return { x: 11, z: 14 }; // Inside house left
      case GhostType.CLYDE:
        return { x: 15, z: 14 }; // Inside house right
    }
  }

  public getGhostHomeCorner(ghostType: GhostType): TileCoord {
    switch (ghostType) {
      case GhostType.BLINKY:
        return { x: this.width - 2, z: 1 }; // Top Right
      case GhostType.PINKY:
        return { x: 1, z: 1 }; // Top Left
      case GhostType.INKY:
        return { x: this.width - 2, z: this.height - 2 }; // Bottom Right
      case GhostType.CLYDE:
        return { x: 1, z: this.height - 2 }; // Bottom Left
    }
  }
}
