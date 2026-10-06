import { Player } from './Player';
import { Ghost } from './Ghost';
import { Pellet } from './Pellet';
import { GhostMode } from '../utils/Constants';

export type GhostCollisionType = 'KILL_PLAYER' | 'EAT_GHOST';

export interface GhostCollisionResult {
  ghost: Ghost;
  type: GhostCollisionType;
}

export class CollisionSystem {
  private readonly playerRadius: number = 0.65;
  private readonly ghostRadius: number = 0.6;
  private readonly pelletRadius: number = 0.45;

  public checkPelletCollision(player: Player, pellets: Pellet[]): Pellet | null {
    const playerX = player.position.x;
    const playerZ = player.position.z;
    const hitThreshold = this.playerRadius + this.pelletRadius;
    const hitThresholdSq = hitThreshold * hitThreshold;

    for (let i = 0; i < pellets.length; i++) {
      const pellet = pellets[i];
      if (pellet.collected || !pellet.active) continue;

      // Fast tile check first
      const dxTile = Math.abs(player.tileX - pellet.tileX);
      const dzTile = Math.abs(player.tileZ - pellet.tileZ);
      if (dxTile > 1 || dzTile > 1) continue;

      const dx = playerX - pellet.position.x;
      const dz = playerZ - pellet.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= hitThresholdSq) {
        return pellet;
      }
    }
    return null;
  }

  public checkGhostCollision(player: Player, ghosts: Ghost[]): GhostCollisionResult | null {
    const playerX = player.position.x;
    const playerZ = player.position.z;
    const hitThreshold = this.playerRadius + this.ghostRadius;
    const hitThresholdSq = hitThreshold * hitThreshold;

    for (let i = 0; i < ghosts.length; i++) {
      const ghost = ghosts[i];
      if (!ghost.active || ghost.mode === GhostMode.EATEN) continue;

      const dx = playerX - ghost.position.x;
      const dz = playerZ - ghost.position.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= hitThresholdSq) {
        if (ghost.mode === GhostMode.FRIGHTENED) {
          return { ghost, type: 'EAT_GHOST' };
        } else {
          return { ghost, type: 'KILL_PLAYER' };
        }
      }
    }
    return null;
  }
}

