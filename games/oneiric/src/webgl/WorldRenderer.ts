import * as THREE from 'three';
import { SceneManager } from './SceneManager';
import { CharacterFactory } from './CharacterFactory';
import { ArchitectureFactory } from './ArchitectureFactory';
import { WorldFolder } from './WorldFolder';
import type { LayerTheme, TileType, HubDoor } from '../types';

// ONEIRIC — World renderer
// Takes game state and updates the 3D scene each frame.
//
// Coordinate mapping: game x -> Three.js x, game y -> Three.js z (depth).
// Game coords are in pixels (tileSize=32 in balance). We scale to world units
// using WORLD_TILE_SIZE = 2 so a 24x16 room fits comfortably in the camera view.

const WORLD_TILE_SIZE = 2;
const PIXEL_TO_WORLD = WORLD_TILE_SIZE / 32; // 32px tile -> 2 world units

// Projection state -> emissive color mapping.
const PROJECTION_COLORS: Record<string, THREE.ColorRepresentation> = {
  patrol: '#3a1a1a',
  alert: '#c47a2a',
  chase: '#ff2a2a',
};

interface TrackedMesh {
  mesh: THREE.Object3D;
}

export class WorldRenderer {
  private sceneManager: SceneManager;
  private world: THREE.Group;
  private environment: THREE.Group;
  private particles: THREE.Group;

  // Tracked room contents so we can dispose on room change.
  private tiles: THREE.Object3D[] = [];
  private objects: THREE.Object3D[] = [];
  private projections: THREE.Object3D[] = [];

  // Player + lantern references.
  private playerGroup: THREE.Group | null = null;
  private lanternLight: THREE.PointLight | null = null;
  private totemMesh: THREE.Object3D | null = null;

  // Kick visual effect.
  private kickTimer = 0;
  private kickRing: THREE.Mesh | null = null;
  private kickColor = new THREE.Color('#ffffff');

  // Particle field reference.
  private particleField: THREE.Points | null = null;

  // Current room/layer tracking.
  private currentRoomId: number | null = null;
  private currentLayerDepth: number | null = null;
  private currentTheme: any = null;
  private roomBounds = { minX: -20, maxX: 20, minZ: -12, maxZ: 12 };

  // Cache of projection id -> group for updates.
  private projectionMap: Map<number, THREE.Group> = new Map();

  // World folding specialist — applies the Inception world-fold vertex shader.
  private worldFolder: WorldFolder = new WorldFolder();

  constructor(sceneManager: SceneManager) {
    this.sceneManager = sceneManager;
    this.world = new THREE.Group();
    this.world.name = 'world';
    this.environment = new THREE.Group();
    this.environment.name = 'environment';
    this.world.add(this.environment);
    this.particles = new THREE.Group();
    this.particles.name = 'particles';

    // Diorama ground — far below the room so the actual floor plane is visible.
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshBasicMaterial({ color: 0x0a0a0a });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -50;
    ground.name = 'ground-plane';
    this.world.add(ground);

    this.sceneManager.getScene().add(this.world);
    this.sceneManager.getScene().add(this.particles);
  }

  /** Main per-frame update. */
  update(state: any, layer: any, room: any, dt: number, time: number): void {
    if (!state || !layer || !room) return;

    // --- Detect layer change first ---
    // When the player descends, the theme must update before the room is rebuilt
    // so tiles, objects, and floor use the new palette.
    if (this.currentLayerDepth !== layer.depth && layer.theme) {
      this.setLayerTheme(layer.theme);
      this.currentLayerDepth = layer.depth;
      this.clearRoom(); // force rebuild with the new theme
    }

    // --- Detect room change ---
    if (this.currentRoomId !== room.id) {
      this.clearRoom();
      this.buildRoom(room, layer);
      // Diorama: no world-fold injection — it warps the floor even at 0 strength
      // because the shader cannot invert arbitrary model matrices.
      this.currentRoomId = room.id;
    }

    // --- Update player ---
    this.updatePlayer(state, time);

    // --- Update kick effect ---
    this.updateKick(dt, state);

    // --- Update projections ---
    this.updateProjections(layer.projections ?? [], time);

    // --- Update Echo Lures ---
    this.updateEchoLures(state.echoLures ?? [], time);

    // --- Update anchors and memory objects ---
    this.updateAnchors(time);

    // --- Camera framing ---
    this.sceneManager.setCameraTarget(0, 0, 0.08);

    const px = state.player.x * PIXEL_TO_WORLD;
    const pz = state.player.y * PIXEL_TO_WORLD;

    // --- Update world fold ---
    this.worldFolder.setPlayerPosition(px, pz);
    this.worldFolder.update(time);

    // --- Update particles ---
    this.updateParticles(dt, time);
  }

  /** Update loop for 3D Architect's Gateway Antechamber. */
  updateHub(state: any, theme: LayerTheme, dt: number, time: number): void {
    if (!state) return;
    this.updatePlayer(state, time);
    this.sceneManager.setCameraTarget(0, 0, 0.08);

    const px = state.player.x * PIXEL_TO_WORLD;
    const pz = state.player.y * PIXEL_TO_WORLD;
    this.worldFolder.setPlayerPosition(px, pz);
    this.worldFolder.update(time);
    this.updateParticles(dt, time);
  }

  /** Build the 3D Architect's Gateway Antechamber with target consciousness doors. */
  buildGatewayAntechamber(theme: LayerTheme, hubDoors: HubDoor[]): void {
    this.clearRoom();
    this.currentRoomId = -999;
    this.currentLayerDepth = 0;
    this.setLayerTheme(theme);

    // Continuous circular stone floor
    const floorGeo = new THREE.CylinderGeometry(18, 18, 0.4, 32);
    const floorColor = new THREE.Color(theme.palette.floor);
    const floorMat = new THREE.MeshStandardMaterial({
      color: floorColor,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.name = 'hub-floor';
    floor.position.set(0, -0.2, 0);
    this.world.add(floor);
    this.tiles.push(floor);

    // Central Totem Monolith
    const totemPillar = ArchitectureFactory.createBrutalistMonolith(theme, 1.1);
    totemPillar.position.set(0, 0, 0);
    this.world.add(totemPillar);
    this.tiles.push(totemPillar);

    // Perimeter boundary pillars
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const pillar = ArchitectureFactory.createBrutalistMonolith(theme, 0.85);
      pillar.position.set(Math.cos(angle) * 16, 0, Math.sin(angle) * 16);
      this.world.add(pillar);
      this.tiles.push(pillar);
    }

    // Spawn Gateway Portal Doors
    for (const door of hubDoors) {
      const portal = ArchitectureFactory.createGatewayPortal(theme, door.target, door.label, 1.1);
      portal.position.set(door.x * PIXEL_TO_WORLD, 0, door.y * PIXEL_TO_WORLD);
      portal.rotation.y = door.angle;
      this.world.add(portal);
      this.tiles.push(portal);
    }
  }

  // --- Room building ---

  private buildRoom(room: any, layer: any): void {
    const theme: LayerTheme | null = this.currentTheme ?? layer?.theme ?? null;

    const gridW: number = room.gridW ?? 24;
    const tiles: number[] = room.tiles ?? [];

    // Center the room around origin in world space.
    const offsetX = -((gridW * WORLD_TILE_SIZE) / 2);
    const gridH: number = room.gridH ?? 16;
    const offsetZ = -((gridH * WORLD_TILE_SIZE) / 2);

    // --- Single continuous floor plane ---
    // Per-tile rounded boxes created a grid of bright edges. A single plane
    // with the floor material reads as continuous cut stone and lets the
    // walls/doors cast shadows on a flat surface.
    if (theme) {
      const floorW = gridW * WORLD_TILE_SIZE;
      const floorD = gridH * WORLD_TILE_SIZE;
      const floorGeo = new THREE.PlaneGeometry(floorW, floorD);
      floorGeo.rotateX(-Math.PI / 2);
      const floorColor = new THREE.Color(theme.palette.floor);
      const floorMat = new THREE.MeshBasicMaterial({ color: floorColor });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.name = 'room-floor';
      floor.position.set(0, -0.15, 0);
      this.world.add(floor);
      this.tiles.push(floor);
    }

    // Keep camera inside the room so the frame is always architecture, not void.
    // With the low camera, a smaller margin still keeps the room in view while
    // letting the player stay closer to the center of the screen.
    const margin = 4;
    this.roomBounds = {
      minX: offsetX + margin,
      maxX: -offsetX - margin,
      minZ: offsetZ + margin,
      maxZ: -offsetZ - margin,
    };

    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        const idx = y * gridW + x;
        const tileType = tiles[idx];
        if (tileType === undefined) continue;
        if (!theme) continue;
        const mesh = ArchitectureFactory.createTile(tileType as TileType, theme, x, y);
        if (!mesh) continue;
        // Scale 1x1 tile to WORLD_TILE_SIZE and position.
        // Diorama: walls and doors are clean low-poly slabs of the same height.
        const yScale = tileType === 1 || tileType === 2 ? 1.0 : 1.0;
        mesh.scale.set(WORLD_TILE_SIZE, WORLD_TILE_SIZE * yScale, WORLD_TILE_SIZE);
        mesh.position.y = 0;
        mesh.position.x = offsetX + x * WORLD_TILE_SIZE + WORLD_TILE_SIZE / 2;
        mesh.position.z = offsetZ + y * WORLD_TILE_SIZE + WORLD_TILE_SIZE / 2;
        // Diorama: no per-object shadows to keep the floor clean.
        this.world.add(mesh);
        this.tiles.push(mesh);
      }
    }

    // --- Place objects ---
    const accentColor = layer?.theme?.palette?.accent ?? '#e8c89a';
    const fgColor = layer?.theme?.palette?.fg ?? '#d4a574';
    for (const obj of room.objects ?? []) {
      if (obj.collected) continue;
      const mesh = this.createObject(obj, accentColor, fgColor);
      if (!mesh) continue;
      mesh.position.x = obj.x * PIXEL_TO_WORLD;
      mesh.position.z = obj.y * PIXEL_TO_WORLD;
      mesh.userData.objectId = obj.id;
      mesh.userData.objectType = obj.type;
      this.world.add(mesh);
      this.objects.push(mesh);
    }

    // Impossible geometry: only the central monolith; the scattered props and
    // floating fragments were reading as white wireframe clutter.
    if (theme) {
      if (typeof (ArchitectureFactory as any).createImpossibleElements === 'function') {
        const impossible = (ArchitectureFactory as any).createImpossibleElements(theme);
        if (impossible) {
          impossible.scale.setScalar(1.25);
          this.world.add(impossible);
          this.tiles.push(impossible);
        }
      }
    }
  }

  private createObject(obj: any, accentColor: string, fgColor: string): THREE.Object3D | null {
    switch (obj.type) {
      case 'fragment': {
        const mesh = CharacterFactory.createFragment(accentColor);
        mesh.scale.setScalar(1.8);
        mesh.name = `obj-fragment-${obj.id}`;
        return mesh;
      }
      case 'descent-anchor': {
        const group = CharacterFactory.createAnchor('descent-anchor', accentColor);
        group.scale.setScalar(1.7);
        group.name = `obj-descent-${obj.id}`;
        return group;
      }
      case 'seed-anchor': {
        const group = CharacterFactory.createAnchor('seed-anchor', accentColor);
        group.scale.setScalar(1.7);
        group.name = `obj-seed-${obj.id}`;
        return group;
      }
      case 'disturbance': {
        // A faint, unsettling orb — unlit fg color.
        const geo = new THREE.SphereGeometry(0.35, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(fgColor),
          transparent: true,
          opacity: 0.6,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = `obj-disturbance-${obj.id}`;
        return mesh;
      }
      case 'memory': {
        // Environmental storytelling object — composed by CharacterFactory.
        const mesh = CharacterFactory.createMemoryObject(obj.memoryKind, this.currentTheme);
        if (mesh) {
          mesh.scale.setScalar(2.0);
          mesh.name = `obj-memory-${obj.id}`;
          return mesh;
        }
        return null;
      }
      default:
        return null;
    }
  }

  // --- Kick effect ---

  public triggerKick(color: string): void {
    this.kickTimer = 0.55;
    this.kickColor.set(color);

    if (this.kickRing) {
      this.world.remove(this.kickRing);
      this.disposeObject(this.kickRing);
      this.kickRing = null;
    }

    const ringGeo = new THREE.TorusGeometry(0.4, 0.06, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.kickColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    this.kickRing = new THREE.Mesh(ringGeo, ringMat);
    this.kickRing.name = 'kickRing';
    this.kickRing.rotation.x = -Math.PI / 2;
    this.world.add(this.kickRing);
  }

  private updateKick(dt: number, state: any): void {
    if (this.kickTimer > 0) {
      this.kickTimer -= dt;
      const t = Math.max(0, this.kickTimer) / 0.55;
      if (this.kickRing) {
        this.kickRing.scale.setScalar(0.5 + (1 - t) * 6.0);
        (this.kickRing.material as THREE.MeshBasicMaterial).opacity = t * 0.8;
        this.kickRing.position.set(
          state.player.x * PIXEL_TO_WORLD,
          0.05,
          state.player.y * PIXEL_TO_WORLD,
        );
      }
      if (this.kickTimer <= 0 && this.kickRing) {
        this.world.remove(this.kickRing);
        this.disposeObject(this.kickRing);
        this.kickRing = null;
      }
    }
  }

  // --- Player ---

  private updatePlayer(state: any, time: number): void {
    const player = state.player;
    if (!player) return;

    if (!this.playerGroup) {
      const totemType = state.totem?.type ?? 'top';
      const playerColor = this.currentTheme?.palette.fg ?? '#e0c0a0';
      const palette = this.currentTheme?.palette;
      this.playerGroup = CharacterFactory.createPlayer(playerColor, totemType, palette);
      this.playerGroup.scale.setScalar(3.5);
      this.world.add(this.playerGroup);
      this.lanternLight = this.playerGroup.getObjectByName('lanternLight') as THREE.PointLight | null;
      this.totemMesh = this.playerGroup.getObjectByName('totemMesh') as THREE.Object3D | null;
    }

    const px = player.x * PIXEL_TO_WORLD;
    const pz = player.y * PIXEL_TO_WORLD;

    // Idle bob + kick lunge: lean back and thrust totem forward when kicking.
    const bob = Math.sin(time * 1.8) * 0.04;
    const kickLunge = this.kickTimer > 0 ? (1 - this.kickTimer / 0.55) : 0;
    this.playerGroup.position.set(px, bob, pz);
    this.playerGroup.rotation.x = kickLunge * -0.25;

    // Rotate to face movement/facing direction.
    // facing is an angle in radians in the game's 2D plane (x, y -> x, z).
    this.playerGroup.rotation.y = -player.facing + Math.PI / 2;

    // Head bob and basket sway for life.
    const head = this.playerGroup.getObjectByName('headGroup');
    if (head) {
      head.rotation.x = Math.sin(time * 1.8 + Math.PI / 2) * 0.04;
    }
    const basket = this.playerGroup.getObjectByName('basket');
    if (basket) {
      basket.rotation.z = Math.sin(time * 1.8) * 0.05;
    }

    // Spin the 3D totem and lunge it during kicks.
    if (this.totemMesh) {
      this.totemMesh.rotation.y += (8.0 + kickLunge * 16.0) * 0.016;
      this.totemMesh.position.y = (this.totemMesh.userData.baseY ?? 1.0) + Math.sin(time * 3) * 0.04 + kickLunge * 0.25;
      this.totemMesh.position.z = kickLunge * 0.25;
      this.totemMesh.rotation.x = kickLunge * 0.4;
    }

    // Bob the lantern slightly for life.
    const lantern = this.playerGroup.getObjectByName('lantern');
    if (lantern) {
      lantern.position.y = 1.0 + Math.sin(time * 3) * 0.05;
    }

    // Lantern intensity scales with stability (dimmer = lower stability).
    // Base intensity 7.0 with range 45 — bright enough to illuminate the room.
    // Minimum intensity 4.0 ensures the world is never invisible even at 0 stability.
    if (this.lanternLight) {
      const stability = Math.max(0, Math.min(100, state.stability ?? 100));
      const intensityFactor = 0.55 + (stability / 100) * 0.45; // 0.55 .. 1.0
      this.lanternLight.intensity = Math.max(4.0, 7.0 * intensityFactor);
      // Flicker slightly at low stability — the dreamer is losing grip.
      // But never let it go below 3.0 — the world must stay visible.
      if (stability < 40) {
        this.lanternLight.intensity = Math.max(3.5, this.lanternLight.intensity * (0.8 + Math.random() * 0.4));
      }
    }
  }

  // --- Projections ---

  private updateProjections(projections: any[], time: number): void {
    const aliveIds = new Set<number>();

    for (const proj of projections) {
      aliveIds.add(proj.id);
      let group = this.projectionMap.get(proj.id);

      if (!group) {
        group = CharacterFactory.createProjection('#c44545');
        group.scale.setScalar(2.0);
        this.projectionMap.set(proj.id, group);
        this.world.add(group);
        this.projections.push(group);
      }

      const px = proj.x * PIXEL_TO_WORLD;
      const pz = proj.y * PIXEL_TO_WORLD;
      group.position.set(px, 0, pz);

      // Rotate to face movement direction.
      const angle = Math.atan2(proj.vx, -proj.vy);
      if (proj.vx !== 0 || proj.vy !== 0) {
        group.rotation.y = angle;
      }

      // Update emissive color based on state.
      const colorHex = PROJECTION_COLORS[proj.state] ?? PROJECTION_COLORS.patrol;
      const color = new THREE.Color(colorHex);
      const body = group.getObjectByName('projectionBody');
      const head = group.getObjectByName('projectionHead');
      const glow = group.getObjectByName('projectionGlow') as THREE.PointLight | null;
      if (body) {
        const mat = (body as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissive = color;
        mat.emissiveIntensity = proj.state === 'chase' ? 0.8 : proj.state === 'alert' ? 0.5 : 0.25;
      }
      if (head) {
        const mat = (head as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissive = color;
        mat.emissiveIntensity = proj.state === 'chase' ? 0.6 : 0.3;
      }
      if (glow) {
        glow.color = color;
        glow.intensity = proj.state === 'chase' ? 1.0 : proj.state === 'alert' ? 0.7 : 0.4;
      }

      // Walking / idle animation.
      const isMoving = Math.abs(proj.vx) > 0.01 || Math.abs(proj.vy) > 0.01;
      const speed = isMoving ? 7.0 : 2.0;
      const amp = isMoving ? 0.35 : 0.08;
      const phase = time * speed + proj.id;
      const leftLeg = group.getObjectByName('leftLeg');
      const rightLeg = group.getObjectByName('rightLeg');
      const leftKnee = group.getObjectByName('leftKnee');
      const rightKnee = group.getObjectByName('rightKnee');
      const leftArm = group.getObjectByName('leftArm');
      const rightArm = group.getObjectByName('rightArm');
      const leftElbow = group.getObjectByName('leftElbow');
      const rightElbow = group.getObjectByName('rightElbow');
      if (leftLeg && rightLeg) {
        leftLeg.rotation.x = Math.sin(phase) * amp;
        rightLeg.rotation.x = Math.sin(phase + Math.PI) * amp;
        if (leftKnee && rightKnee) {
          leftKnee.rotation.x = Math.max(0, Math.sin(phase + Math.PI / 2) * 0.4);
          rightKnee.rotation.x = Math.max(0, Math.sin(phase + Math.PI * 1.5) * 0.4);
        }
      }
      if (leftArm && rightArm) {
        leftArm.rotation.x = 0.12 + Math.sin(phase + Math.PI) * amp * 0.5;
        rightArm.rotation.x = 0.12 + Math.sin(phase) * amp * 0.5;
        if (leftElbow && rightElbow) {
          leftElbow.rotation.x = Math.max(0, Math.sin(phase) * 0.3);
          rightElbow.rotation.x = Math.max(0, Math.sin(phase + Math.PI) * 0.3);
        }
      }
      // Idle bob / chase pulse.
      group.position.y = isMoving ? Math.sin(phase * 2) * 0.04 : Math.sin(time * 2 + proj.id) * 0.05;
    }

    // Remove projections that are no longer alive.
    for (let i = this.projections.length - 1; i >= 0; i--) {
      const group = this.projections[i];
      const id = group.userData.projId as number | undefined;
      // Find id via map reverse lookup.
      let foundId: number | null = null;
      for (const [k, v] of this.projectionMap) {
        if (v === group) { foundId = k; break; }
      }
      if (foundId !== null && !aliveIds.has(foundId)) {
        this.disposeObject(group);
        this.world.remove(group);
        this.projections.splice(i, 1);
        this.projectionMap.delete(foundId);
      }
    }
  }

  // --- Echo Lures ---

  private echoLureMap: Map<number, THREE.Group> = new Map();

  private updateEchoLures(lures: any[], time: number): void {
    const activeIds = new Set<number>();

    for (const lure of lures) {
      if (lure.timer <= 0) continue;
      activeIds.add(lure.id);
      let group = this.echoLureMap.get(lure.id);

      if (!group) {
        group = new THREE.Group();
        group.name = `lure-${lure.id}`;

        const ringGeo = new THREE.TorusGeometry(0.8, 0.04, 6, 24);
        const accent = this.currentTheme?.palette.accent ?? '#e8c89a';
        const ringMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(accent),
          emissive: new THREE.Color(accent),
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.8,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.name = 'lureRing';
        group.add(ring);

        const pointLight = new THREE.PointLight(new THREE.Color(accent), 2.0, 8);
        pointLight.position.y = 0.5;
        group.add(pointLight);

        this.echoLureMap.set(lure.id, group);
        this.world.add(group);
      }

      const px = lure.x * PIXEL_TO_WORLD;
      const pz = lure.y * PIXEL_TO_WORLD;
      group.position.set(px, 0.05, pz);

      const ring = group.getObjectByName('lureRing');
      if (ring) {
        const pulse = 1 + (time * 4) % 2.5;
        ring.scale.setScalar(pulse);
        const mat = (ring as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.opacity = Math.max(0, 0.9 - (pulse - 1) * 0.4);
      }
    }

    // Clean up expired lures
    for (const [id, group] of this.echoLureMap.entries()) {
      if (!activeIds.has(id)) {
        this.disposeObject(group);
        this.world.remove(group);
        this.echoLureMap.delete(id);
      }
    }
  }

  // --- Anchors & Memory Objects ---

  private updateAnchors(time: number): void {
    for (const obj of this.objects) {
      const type = obj.userData.objectType as string | undefined;
      if (type === 'descent-anchor') {
        const torus = obj.getObjectByName('portalTorus');
        if (torus) torus.rotation.z = time * 1.2;
        const disc = obj.getObjectByName('portalDisc');
        if (disc) {
          const mat = (disc as THREE.Mesh).material as THREE.MeshStandardMaterial;
          mat.opacity = 0.4 + Math.sin(time * 2) * 0.15;
        }
      } else if (type === 'seed-anchor') {
        const seed = obj.getObjectByName('seedMesh');
        if (seed) {
          const s = 1 + Math.sin(time * 2.5) * 0.15;
          seed.scale.setScalar(s);
          seed.rotation.y = time * 0.8;
        }
        const light = obj.getObjectByName('seedLight') as THREE.PointLight | null;
        if (light) {
          light.intensity = 2.5 + Math.sin(time * 2.5) * 0.8;
        }
      } else if (type === 'fragment') {
        // Float + spin fragments.
        obj.rotation.y = time * 1.5;
        obj.position.y = 0.8 + Math.sin(time * 2 + (obj.userData.objectId ?? 0)) * 0.15;
      } else if (type === 'disturbance') {
        // Pulse disturbance orbs.
        const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 0.5 + Math.sin(time * 4 + (obj.userData.objectId ?? 0)) * 0.4;
        obj.position.y = 0.8 + Math.sin(time * 1.5 + (obj.userData.objectId ?? 0)) * 0.1;
      } else if (type === 'memory') {
        // Pulse memory resonance halo
        const halo = obj.getObjectByName('resonance-halo');
        if (halo) {
          const s = 1.0 + Math.sin(time * 2.2 + (obj.userData.objectId ?? 0)) * 0.12;
          halo.scale.setScalar(s);
        }
      }
    }
  }

  // --- Environment ---

  private buildEnvironment(theme: LayerTheme): void {
    if (this.environment) {
      this.disposeObject(this.environment);
      this.environment.clear();
    } else {
      this.environment = new THREE.Group();
      this.environment.name = 'environment';
      this.world.add(this.environment);
    }

    // Infinite surreal brutalist void plinth & horizon rings framing the room.
    const voidGroup = ArchitectureFactory.createSurrealVoid(theme);
    this.environment.add(voidGroup);

    // Imposing brutalist monoliths framing the perimeter corners.
    const monolithPositions = [
      { x: -28, z: -20, s: 1.2 },
      { x: 28, z: -20, s: 1.1 },
      { x: -28, z: 20, s: 1.3 },
      { x: 28, z: 20, s: 1.0 },
      { x: 0, z: -24, s: 1.5 },
    ];
    for (const p of monolithPositions) {
      const monolith = ArchitectureFactory.createBrutalistMonolith(theme, p.s);
      monolith.position.set(p.x, 0, p.z);
      this.environment.add(monolith);
    }

    // Floating arches overlooking the abyss.
    const archPositions = [
      { x: -32, z: 0, rot: Math.PI / 4, s: 0.9 },
      { x: 32, z: 0, rot: -Math.PI / 4, s: 0.9 },
    ];
    for (const p of archPositions) {
      const arch = ArchitectureFactory.createFloatingArch(theme, p.s);
      arch.position.set(p.x, 0, p.z);
      arch.rotation.y = p.rot;
      this.environment.add(arch);
    }
  }

  // --- Particles ---

  private updateParticles(dt: number, time: number): void {
    if (!this.particleField) return;
    const mat = this.particleField.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = time;
    // Gentle rotation for drift/void fields.
    const type = this.currentTheme?.particleType ?? 'drift';
    if (type === 'drift' || type === 'void') {
      this.particleField.rotation.y = time * 0.02;
    }
  }

  // --- Theme ---

  setLayerTheme(theme: any): void {
    this.currentTheme = theme;
    // Rebuild the player on layer change so the cloak color follows the theme.
    if (this.playerGroup) {
      this.disposeObject(this.playerGroup);
      this.world.remove(this.playerGroup);
      this.playerGroup = null;
      this.lanternLight = null;
      this.totemMesh = null;
    }
    const palette = theme.palette;
    if (!palette) return;

    // --- World fold strength based on layer depth ---
    // Persistent world fold disabled — it was making the floor read as a
    // vertical wall and hiding the room. Impossible architecture, lighting,
    // and color grade now carry the Inception-style dream identity.
    const depth: number = theme.depth ?? 1;
    let foldStrength = 0.0;
    this.worldFolder.setFoldStrength(foldStrength);

    // Diorama: no fog, no bloom haze.
    const fogDensity = 0.0;
    const bloomStrength = 0.0;

    // Color grade tint — blend fg with white so it tints without darkening.
    const fgColor = new THREE.Color(palette.fg ?? '#ffffff');
    const whiteColor = new THREE.Color(0xffffff);
    const tint = fgColor.clone().lerp(whiteColor, 0.5); // 50% toward white — brighter

    this.sceneManager.setTheme(
      palette.bg ?? '#000000',
      palette.fog ?? '#000000',
      fogDensity,
      bloomStrength,
      tint,
    );

    // Update ground plane color to match the layer theme
    const ground = this.world.getObjectByName('ground-plane') as THREE.Mesh | null;
    if (ground) {
      const groundMat = ground.material as THREE.MeshBasicMaterial;
      const bgColor = new THREE.Color(palette.bg ?? '#1a1410');
      groundMat.color.copy(bgColor);
    }

    // Rebuild diorama environment (base, trees, rocks, tent).
    this.buildEnvironment(theme);

    // Rebuild particle field.
    this.rebuildParticles(theme);
  }

  private rebuildParticles(theme: any): void {
    if (this.particleField) {
      this.disposeObject(this.particleField);
      this.particles.remove(this.particleField);
      this.particleField = null;
    }

    const type = theme.particleType ?? 'drift';
    if (type === 'void' && theme.depth >= 99) {
      // Limbo: very sparse void particles.
      this.particleField = CharacterFactory.createParticleField(60, theme.palette?.fg ?? '#ffffff', 'void', 60);
    } else {
      const color = theme.palette?.fg ?? '#ffffff';
      const count = type === 'rain' ? 150 : type === 'ash' ? 100 : 80;
      this.particleField = CharacterFactory.createParticleField(count, color, type, 60);
    }

    if (this.particleField) {
      this.particles.add(this.particleField);
    }
  }

  // --- Cleanup ---

  clearRoom(): void {
    // Remove the world-fold shader injection before disposing meshes.
    this.worldFolder.dispose(this.world);

    // Remove + dispose tiles.
    for (const tile of this.tiles) {
      this.disposeObject(tile);
      this.world.remove(tile);
    }
    this.tiles = [];

    // Remove + dispose objects.
    for (const obj of this.objects) {
      this.disposeObject(obj);
      this.world.remove(obj);
    }
    this.objects = [];

    // Remove projections (they belong to the layer, but we clear on room change
    // since the layer's projection list is rebuilt by the game logic).
    for (const proj of this.projections) {
      this.disposeObject(proj);
      this.world.remove(proj);
    }
    this.projections = [];
    this.projectionMap.clear();

    this.currentRoomId = null;
  }

  dispose(): void {
    this.clearRoom();

    if (this.playerGroup) {
      this.disposeObject(this.playerGroup);
      this.world.remove(this.playerGroup);
      this.playerGroup = null;
      this.lanternLight = null;
    }

    if (this.environment) {
      this.disposeObject(this.environment);
      this.world.remove(this.environment);
      (this as any).environment = null;
    }

    if (this.particleField) {
      this.disposeObject(this.particleField);
      this.particles.remove(this.particleField);
      this.particleField = null;
    }

    this.sceneManager.getScene().remove(this.world);
    this.sceneManager.getScene().remove(this.particles);
  }

  // --- Helpers ---

  private disposeObject(obj: THREE.Object3D): void {
    obj.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else if (mat) {
        mat.dispose();
      }
    });
  }
}
