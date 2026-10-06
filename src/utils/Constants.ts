export enum Direction {
  NONE = 'NONE',
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export interface Vector2D {
  x: number;
  z: number;
}

export const DIR_VECTORS: Record<Direction, Vector2D> = {
  [Direction.NONE]: { x: 0, z: 0 },
  [Direction.UP]: { x: 0, z: -1 },
  [Direction.DOWN]: { x: 0, z: 1 },
  [Direction.LEFT]: { x: -1, z: 0 },
  [Direction.RIGHT]: { x: 1, z: 0 }
};

export const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  [Direction.NONE]: Direction.NONE,
  [Direction.UP]: Direction.DOWN,
  [Direction.DOWN]: Direction.UP,
  [Direction.LEFT]: Direction.RIGHT,
  [Direction.RIGHT]: Direction.LEFT
};

export const TILE_SIZE = 2.0;
export const WALL_HEIGHT = 1.6;
export const PLAYER_RADIUS = 0.7;

export const PLAYER_BASE_SPEED = 6.0; // tiles per second
export const GHOST_BASE_SPEED = 5.2; // tiles per second
export const GHOST_FRIGHTENED_SPEED = 3.2; // tiles per second
export const GHOST_EATEN_SPEED = 12.0; // tiles per second

export const FRIGHTENED_DURATION = 8.0; // seconds
export const FRIGHTENED_FLASH_TIME = 2.5; // seconds before finish to flash

export const PELLET_SCORE = 10;
export const POWER_PELLET_SCORE = 50;
export const GHOST_SCORES = [200, 400, 800, 1600];

export enum GhostType {
  BLINKY = 'BLINKY',
  PINKY = 'PINKY',
  INKY = 'INKY',
  CLYDE = 'CLYDE'
}

export enum GhostMode {
  SCATTER = 'SCATTER',
  CHASE = 'CHASE',
  FRIGHTENED = 'FRIGHTENED',
  EATEN = 'EATEN'
}

export const GHOST_COLORS: Record<GhostType, number> = {
  [GhostType.BLINKY]: 0xff2a2a,
  [GhostType.PINKY]: 0xff70a6,
  [GhostType.INKY]: 0x00e5ff,
  [GhostType.CLYDE]: 0xff9f1c
};

export enum CameraMode {
  GAMEPLAY = 'GAMEPLAY',
  DEATH = 'DEATH',
  MENU = 'MENU',
  OVERVIEW = 'OVERVIEW'
}

