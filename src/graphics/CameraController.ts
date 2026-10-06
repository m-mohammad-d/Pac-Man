import * as THREE from 'three';
import { CameraMode } from '../utils/Constants';

export interface CameraSettings {
  distance: number;
  height: number;
  minDistance: number;
  maxDistance: number;
  pitchAngle: number;
  yawAngle: number;
  targetOffsetY: number;
  lookAheadZ: number;
  fov: number;

  smoothSpeed: number;
  lookAtSmoothSpeed: number;
  rotationSpeed: number;

  collisionMargin: number;
  minObstructionDistance: number;

  deathZoomMultiplier: number;
  deathHeightMultiplier: number;

  overviewHeight: number;
  overviewDistance: number;
  overviewFov: number;

  menuHeight: number;
  menuDistance: number;
  menuPitch: number;

  zoomStep: number;
}

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  distance: 18.0,
  height: 20.0,
  minDistance: 8.0,
  maxDistance: 34.0,
  pitchAngle: 0.94, // ~54 degrees downward angle
  yawAngle: 0.0,   // Fixed facing forward down the maze corridors
  targetOffsetY: 0.4,
  lookAheadZ: -2.0, // Look slightly ahead into the corridor
  fov: 48,

  smoothSpeed: 5.5,
  lookAtSmoothSpeed: 6.5,
  rotationSpeed: 4.0,

  collisionMargin: 0.8,
  minObstructionDistance: 6.0,

  deathZoomMultiplier: 1.35,
  deathHeightMultiplier: 1.25,

  overviewHeight: 46.0,
  overviewDistance: 22.0,
  overviewFov: 52,

  menuHeight: 42.0,
  menuDistance: 28.0,
  menuPitch: 0.95,

  zoomStep: 2.0
};

export class CameraController {
  public camera: THREE.PerspectiveCamera;
  public mode: CameraMode = CameraMode.GAMEPLAY;
  public settings: CameraSettings;

  // Smoothing state vectors
  private currentPosition: THREE.Vector3 = new THREE.Vector3();
  private currentLookAt: THREE.Vector3 = new THREE.Vector3();
  private desiredPosition: THREE.Vector3 = new THREE.Vector3();
  private desiredLookAt: THREE.Vector3 = new THREE.Vector3();

  // Raycaster for obstruction/clipping prevention
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private obstacleMeshes: THREE.Object3D[] = [];
  private currentObstructionFactor: number = 1.0; // 1 = full distance, <1 = pulled closer

  // Attract mode drift timer for MENU mode
  private menuTime: number = 0;

  // Internal flags
  private isInitialized: boolean = false;

  constructor(aspectRatio: number, settings: Partial<CameraSettings> = {}) {
    this.settings = { ...DEFAULT_CAMERA_SETTINGS, ...settings };
    this.camera = new THREE.PerspectiveCamera(
      this.settings.fov,
      aspectRatio,
      0.1,
      250
    );

    // Initial default placement
    this.camera.position.set(0, this.settings.menuHeight, this.settings.menuDistance);
    this.camera.lookAt(0, 0, 0);
    this.currentPosition.copy(this.camera.position);
    this.currentLookAt.set(0, 0, 0);
  }

  public setObstacleRoot(root: THREE.Object3D): void {
    this.obstacleMeshes = [];
    root.traverse((child) => {
      // Collect wall meshes, ignoring floor planes or small items
      if (child instanceof THREE.Mesh) {
        if (child.geometry instanceof THREE.BoxGeometry) {
          this.obstacleMeshes.push(child);
        }
      }
    });
  }

  public updateAspect(aspectRatio: number): void {
    this.camera.aspect = aspectRatio;
    this.camera.updateProjectionMatrix();
  }

  public setMode(mode: CameraMode): void {
    this.mode = mode;
    if (mode === CameraMode.OVERVIEW) {
      this.camera.fov = this.settings.overviewFov;
    } else {
      this.camera.fov = this.settings.fov;
    }
    this.camera.updateProjectionMatrix();
  }

  public toggleMode(): CameraMode {
    if (this.mode === CameraMode.GAMEPLAY) {
      this.setMode(CameraMode.OVERVIEW);
    } else if (this.mode === CameraMode.OVERVIEW) {
      this.setMode(CameraMode.MENU);
    } else {
      this.setMode(CameraMode.GAMEPLAY);
    }
    return this.mode;
  }

  public zoomIn(): void {
    this.settings.distance = Math.max(
      this.settings.minDistance,
      this.settings.distance - this.settings.zoomStep
    );
    this.settings.height = Math.max(
      this.settings.minDistance,
      this.settings.height - this.settings.zoomStep
    );
  }

  public zoomOut(): void {
    this.settings.distance = Math.min(
      this.settings.maxDistance,
      this.settings.distance + this.settings.zoomStep
    );
    this.settings.height = Math.min(
      this.settings.maxDistance,
      this.settings.height + this.settings.zoomStep
    );
  }

  public adjustPitch(delta: number): void {
    // Keep pitch bounded between 30 degrees (0.5 rad) and 80 degrees (1.4 rad)
    this.settings.pitchAngle = Math.max(0.5, Math.min(1.4, this.settings.pitchAngle + delta));
  }

  public adjustYaw(delta: number): void {
    this.settings.yawAngle = (this.settings.yawAngle + delta) % (Math.PI * 2);
  }

  public resetToDefaults(): void {
    this.settings = { ...DEFAULT_CAMERA_SETTINGS };
    this.camera.fov = this.settings.fov;
    this.camera.updateProjectionMatrix();
  }

  public update(
    targetPos: THREE.Vector3,
    deltaTime: number,
    isDying: boolean = false
  ): void {
    // Determine active behavior mode
    let effectiveMode = this.mode;
    if (isDying && this.mode === CameraMode.GAMEPLAY) {
      effectiveMode = CameraMode.DEATH;
    }

    switch (effectiveMode) {
      case CameraMode.GAMEPLAY:
        this.updateGameplayCamera(targetPos, deltaTime);
        break;
      case CameraMode.DEATH:
        this.updateDeathCamera(targetPos, deltaTime);
        break;
      case CameraMode.OVERVIEW:
        this.updateOverviewCamera(targetPos, deltaTime);
        break;
      case CameraMode.MENU:
        this.updateMenuCamera(deltaTime);
        break;
    }
  }

  private updateGameplayCamera(targetPos: THREE.Vector3, deltaTime: number): void {
    // 1. Establish LookAt target (centered slightly ahead of Pac-Man in corridor)
    this.desiredLookAt.set(
      targetPos.x,
      targetPos.y + this.settings.targetOffsetY,
      targetPos.z + this.settings.lookAheadZ
    );

    // 2. Fixed angle offset vector
    // Calculate spherical/polar offset based on fixed pitch and yaw
    const dist = this.settings.distance;
    const height = this.settings.height;

    // Fixed South-to-North orientation with optional user yaw
    const offsetX = Math.sin(this.settings.yawAngle) * dist;
    const offsetZ = Math.cos(this.settings.yawAngle) * dist;

    const idealCamPos = new THREE.Vector3(
      targetPos.x + offsetX,
      targetPos.y + height,
      targetPos.z + offsetZ
    );

    // 3. Obstruction / Wall Clipping Detection with Raycaster
    let targetObstructionFactor = 1.0;

    if (this.obstacleMeshes.length > 0) {
      const rayOrigin = this.desiredLookAt.clone();
      const rayDir = idealCamPos.clone().sub(rayOrigin);
      const totalDist = rayDir.length();
      rayDir.normalize();

      this.raycaster.set(rayOrigin, rayDir);
      this.raycaster.near = 0.5;
      this.raycaster.far = totalDist;

      const hits = this.raycaster.intersectObjects(this.obstacleMeshes, false);

      if (hits.length > 0) {
        // Find closest valid wall obstruction
        const closestHit = hits[0];
        const safeDist = Math.max(
          this.settings.minObstructionDistance,
          closestHit.distance - this.settings.collisionMargin
        );
        targetObstructionFactor = Math.min(1.0, safeDist / totalDist);
      }
    }

    // Smoothly interpolate obstruction factor to avoid snappy transitions
    const obstructionDamp = 1.0 - Math.exp(-10.0 * deltaTime);
    this.currentObstructionFactor += (targetObstructionFactor - this.currentObstructionFactor) * obstructionDamp;

    // Apply obstruction pull-in
    this.desiredPosition.copy(this.desiredLookAt).add(
      idealCamPos.clone().sub(this.desiredLookAt).multiplyScalar(this.currentObstructionFactor)
    );

    // 4. Apply smooth frame-rate independent interpolation
    this.applySmoothing(deltaTime, this.settings.smoothSpeed, this.settings.lookAtSmoothSpeed);
  }

  private updateDeathCamera(targetPos: THREE.Vector3, deltaTime: number): void {
    // Frame Pac-Man directly in center without look-ahead
    this.desiredLookAt.set(targetPos.x, targetPos.y + 0.3, targetPos.z);

    // Slightly elevated and pulled-back for cinematic defeat focus
    const dist = this.settings.distance * this.settings.deathZoomMultiplier;
    const height = this.settings.height * this.settings.deathHeightMultiplier;

    this.desiredPosition.set(
      targetPos.x,
      targetPos.y + height,
      targetPos.z + dist
    );

    // Slower, graceful easing on death
    this.applySmoothing(deltaTime, 3.0, 4.0);
  }

  private updateOverviewCamera(targetPos: THREE.Vector3, deltaTime: number): void {
    // High tactical arcade overview tracking the player softly
    this.desiredLookAt.set(
      targetPos.x * 0.4,
      0,
      targetPos.z * 0.4
    );

    this.desiredPosition.set(
      targetPos.x * 0.25,
      this.settings.overviewHeight,
      targetPos.z * 0.25 + this.settings.overviewDistance
    );

    this.applySmoothing(deltaTime, 4.0, 4.0);
  }

  private updateMenuCamera(deltaTime: number): void {
    // Attract mode subtle orbital drift over maze
    this.menuTime += deltaTime * 0.3;
    const driftX = Math.sin(this.menuTime) * 3.5;
    const driftZ = Math.cos(this.menuTime * 0.8) * 2.0;

    this.desiredLookAt.set(0, 0, 0);
    this.desiredPosition.set(
      driftX,
      this.settings.menuHeight,
      this.settings.menuDistance + driftZ
    );

    this.applySmoothing(deltaTime, 2.5, 3.0);
  }

  private applySmoothing(
    deltaTime: number,
    posSmoothSpeed: number,
    lookSmoothSpeed: number
  ): void {
    if (!this.isInitialized) {
      this.currentPosition.copy(this.desiredPosition);
      this.currentLookAt.copy(this.desiredLookAt);
      this.camera.position.copy(this.currentPosition);
      this.camera.lookAt(this.currentLookAt);
      this.isInitialized = true;
      return;
    }

    // Frame-rate independent exponential damping
    const posAlpha = 1.0 - Math.exp(-posSmoothSpeed * deltaTime);
    const lookAlpha = 1.0 - Math.exp(-lookSmoothSpeed * deltaTime);

    this.currentPosition.lerp(this.desiredPosition, posAlpha);
    this.currentLookAt.lerp(this.desiredLookAt, lookAlpha);

    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
  }

  public resetImmediate(targetPos: THREE.Vector3): void {
    this.desiredLookAt.set(
      targetPos.x,
      targetPos.y + this.settings.targetOffsetY,
      targetPos.z + this.settings.lookAheadZ
    );

    const dist = this.settings.distance;
    const height = this.settings.height;
    this.desiredPosition.set(
      targetPos.x,
      targetPos.y + height,
      targetPos.z + dist
    );

    this.currentPosition.copy(this.desiredPosition);
    this.currentLookAt.copy(this.desiredLookAt);
    this.camera.position.copy(this.currentPosition);
    this.camera.lookAt(this.currentLookAt);
    this.currentObstructionFactor = 1.0;
    this.isInitialized = true;
  }
}
