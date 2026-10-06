import { Direction, TILE_SIZE } from "./Constants";

export class MathUtils {
  static gridToWorld(
    gridX: number,
    gridZ: number,
    gridWidth: number,
    gridHeight: number,
    tileSize: number = TILE_SIZE,
  ): { x: number; z: number } {
    const halfWidth = (gridWidth * tileSize) / 2;
    const halfHeight = (gridHeight * tileSize) / 2;
    return {
      x: gridX * tileSize - halfWidth + tileSize / 2,
      z: gridZ * tileSize - halfHeight + tileSize / 2,
    };
  }

  static worldToGrid(
    worldX: number,
    worldZ: number,
    gridWidth: number,
    gridHeight: number,
    tileSize: number = TILE_SIZE,
  ): { x: number; z: number } {
    const halfWidth = (gridWidth * tileSize) / 2;
    const halfHeight = (gridHeight * tileSize) / 2;
    return {
      x: Math.round((worldX + halfWidth - tileSize / 2) / tileSize),
      z: Math.round((worldZ + halfHeight - tileSize / 2) / tileSize),
    };
  }

  static manhattanDistance(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
  ): number {
    return Math.abs(x1 - x2) + Math.abs(z1 - z2);
  }

  static euclideanDistance(
    x1: number,
    z1: number,
    x2: number,
    z2: number,
  ): number {
    const dx = x1 - x2;
    const dz = z1 - z2;
    return Math.sqrt(dx * dx + dz * dz);
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  static angleFromDirection(dir: Direction): number {
    switch (dir) {
      case Direction.RIGHT:
        return Math.PI / 2;
      case Direction.LEFT:
        return -Math.PI / 2;
      case Direction.UP:
        return Math.PI;
      case Direction.DOWN:
        return 0;
      default:
        return 0;
    }
  }

  static lerpAngle(current: number, target: number, t: number): number {
    let diff = (target - current) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff * Math.max(0, Math.min(1, t));
  }

  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}
