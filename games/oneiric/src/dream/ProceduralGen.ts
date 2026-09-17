// ONEIRIC — Procedural dream layer generation
// Real BFS-connected room generation with a seeded RNG (mulberry32).
// No Math.random is used for deterministic generation.

import type {
  DreamLayer,
  Room,
  TileType,
  Door,
  DreamObject,
  LayerTheme,
  MemoryObjectKind,
} from '../types';
import { BALANCE } from '../data/balance';
import { getThemeForDepth } from '../data/layers';

// Maximum depth (used to decide seed-anchor placement).
const MAX_DEPTH = 3;

export class ProceduralGen {
  private rng: () => number;
  private seed: number;
  private objectIdCounter = 0;

  constructor(seed: number) {
    this.seed = seed >>> 0;
    this.rng = mulberry32(this.seed);
  }

  /**
   * Generate a full dream layer at the given depth.
   * Produces BFS-connected rooms with doors linking them sequentially,
   * places objects, applies the theme visual rule, and sets time/instability rates.
   */
  generateLayer(depth: number, memoryObjects?: MemoryObjectKind[]): DreamLayer {
    const theme = getThemeForDepth(depth);
    const roomCount = BALANCE.roomsPerLayer[depth - 1] ?? 4;
    const gridW = BALANCE.roomGridW;
    const gridH = BALANCE.roomGridH;

    const rooms: Room[] = [];
    for (let i = 0; i < roomCount; i++) {
      rooms.push(this.generateRoom(i, gridW, gridH, depth, theme, memoryObjects));
    }

    // Connect rooms sequentially with doors: room[i] east -> room[i+1] west.
    for (let i = 0; i < rooms.length - 1; i++) {
      this.connectRooms(rooms[i], rooms[i + 1], i, i + 1);
    }

    // Place layer-level anchors.
    const lastRoom = rooms[rooms.length - 1];
    let descentAnchor: { x: number; y: number } | null = null;
    let seedAnchor: { x: number; y: number } | null = null;

    if (depth < MAX_DEPTH) {
      // Descent anchor in the last room.
      const anchorTile = this.findFloorTile(lastRoom);
      if (anchorTile) {
        const px = Room_tileToPixel(anchorTile.x, anchorTile.y);
        descentAnchor = {
          x: px.x + BALANCE.tileSize / 2,
          y: px.y + BALANCE.tileSize / 2,
        };
        lastRoom.objects.push({
          id: this.nextObjectId(),
          type: 'descent-anchor',
          x: descentAnchor.x,
          y: descentAnchor.y,
          collected: false,
          radius: 20,
        });
      }
    } else {
      // Seed anchor in the last room of the deepest layer.
      const anchorTile = this.findFloorTile(lastRoom);
      if (anchorTile) {
        const px = Room_tileToPixel(anchorTile.x, anchorTile.y);
        seedAnchor = {
          x: px.x + BALANCE.tileSize / 2,
          y: px.y + BALANCE.tileSize / 2,
        };
        lastRoom.objects.push({
          id: this.nextObjectId(),
          type: 'seed-anchor',
          x: seedAnchor.x,
          y: seedAnchor.y,
          collected: false,
          radius: 20,
        });
      }
    }

    // Apply theme visual rule to all rooms.
    for (const room of rooms) {
      this.applyVisualRule(room, theme);
    }

    const timeScale =
      BALANCE.timeScaleBase * Math.pow(BALANCE.timeScalePerDepth, depth - 1);
    const instabilityRate =
      BALANCE.stabilityDrainBase +
      BALANCE.stabilityDrainPerDepth * (depth - 1);
    // Per-layer spawn rate: Layer 1 = calm (8s), Layer 2 = tension (5s), Layer 3 = urgent (3s)
    const spawnIntervals = [8.0, 5.0, 3.0];
    const spawnInterval = spawnIntervals[Math.min(depth - 1, spawnIntervals.length - 1)] ?? 5.0;
    const projectionSpawnRate = 1 / spawnInterval;

    return {
      depth,
      theme,
      timeScale,
      rooms,
      currentRoomIndex: 0,
      instabilityRate,
      projectionSpawnRate,
      projections: [],
      seedPlantedHere: false,
      descentAnchor,
      seedAnchor,
    };
  }

  /**
   * Generate Limbo: a single screen with sparse floor tiles and one fragment.
   */
  generateLimbo(): Room {
    const gridW = BALANCE.roomGridW;
    const gridH = BALANCE.roomGridH;
    const total = gridW * gridH;
    const tiles: TileType[] = new Array(total).fill(1); // all walls

    // Sparse floor: ~30% tiles carved around center.
    const minFloors = Math.floor(total * 0.3);
    let cx = Math.floor(gridW / 2);
    let cy = Math.floor(gridH / 2);
    let floorCount = 0;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let steps = total * 2;
    while (floorCount < minFloors && steps-- > 0) {
      const idx = cy * gridW + cx;
      if (tiles[idx] === 1) {
        tiles[idx] = 0;
        floorCount++;
      }
      const [dx, dy] = dirs[Math.floor(this.rng() * 4)];
      cx = Math.max(0, Math.min(gridW - 1, cx + dx));
      cy = Math.max(0, Math.min(gridH - 1, cy + dy));
    }

    // BFS-connectivity guarantee for limbo too.
    this.ensureConnectivity(tiles, gridW, gridH);

    const room: Room = {
      id: 0,
      bounds: { x: 0, y: 0, w: gridW * BALANCE.tileSize, h: gridH * BALANCE.tileSize },
      gridW,
      gridH,
      tiles,
      doors: [],
      objects: [],
      cleared: false,
      visited: false,
      hasBeenOffscreen: false,
    };

    // Place one fragment at a random floor tile.
    const floorTiles = this.listFloorTiles(room);
    if (floorTiles.length > 0) {
      const pick = floorTiles[Math.floor(this.rng() * floorTiles.length)];
      const px = Room_tileToPixel(pick.x, pick.y);
      room.objects.push({
        id: this.nextObjectId(),
        type: 'fragment',
        x: px.x + BALANCE.tileSize / 2,
        y: px.y + BALANCE.tileSize / 2,
        collected: false,
        radius: 12,
      });
    }

    return room;
  }

  /**
   * Generate a large Limbo room (3x normal grid size).
   * The fragment is placed far from the player's spawn (opposite corner).
   */
  generateLargeLimbo(): Room {
    const gridW = BALANCE.roomGridW * 3;
    const gridH = BALANCE.roomGridH * 3;
    const total = gridW * gridH;
    const tiles: TileType[] = new Array(total).fill(1); // all walls

    // Sparse floor: ~30% tiles carved around center.
    const minFloors = Math.floor(total * 0.3);
    let cx = Math.floor(gridW / 2);
    let cy = Math.floor(gridH / 2);
    let floorCount = 0;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    let steps = total * 2;
    while (floorCount < minFloors && steps-- > 0) {
      const idx = cy * gridW + cx;
      if (tiles[idx] === 1) {
        tiles[idx] = 0;
        floorCount++;
      }
      const [dx, dy] = dirs[Math.floor(this.rng() * 4)];
      cx = Math.max(0, Math.min(gridW - 1, cx + dx));
      cy = Math.max(0, Math.min(gridH - 1, cy + dy));
    }

    // BFS-connectivity guarantee.
    this.ensureConnectivity(tiles, gridW, gridH);

    const room: Room = {
      id: 0,
      bounds: { x: 0, y: 0, w: gridW * BALANCE.tileSize, h: gridH * BALANCE.tileSize },
      gridW,
      gridH,
      tiles,
      doors: [],
      objects: [],
      cleared: false,
      visited: false,
      hasBeenOffscreen: false,
    };

    // Place the fragment at the opposite corner from the player spawn.
    // Player spawns at center; place fragment at a far corner tile.
    const floorTilesList = this.listFloorTiles(room);
    if (floorTilesList.length > 0) {
      // Find the floor tile farthest from center.
      const center = { x: Math.floor(gridW / 2), y: Math.floor(gridH / 2) };
      let farthest = floorTilesList[0];
      let maxDist = 0;
      for (const t of floorTilesList) {
        const dx = t.x - center.x;
        const dy = t.y - center.y;
        const dist = dx * dx + dy * dy;
        if (dist > maxDist) {
          maxDist = dist;
          farthest = t;
        }
      }
      const px = Room_tileToPixel(farthest.x, farthest.y);
      room.objects.push({
        id: this.nextObjectId(),
        type: 'fragment',
        x: px.x + BALANCE.tileSize / 2,
        y: px.y + BALANCE.tileSize / 2,
        collected: false,
        radius: 12,
      });
    }

    return room;
  }

  // --- Internal generation helpers ---

  private generateRoom(
    id: number,
    gridW: number,
    gridH: number,
    depth: number,
    theme: LayerTheme,
    memoryObjects?: MemoryObjectKind[]
  ): Room {
    const total = gridW * gridH;
    const tiles: TileType[] = new Array(total).fill(1); // start all walls

    // Open architectural hall: a single connected floor with a 1-tile wall
    // border and a few internal pillars. This reads as a composed 3D space
    // from the low camera instead of a top-down wall maze.
    const border = 1;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (x >= border && x < gridW - border && y >= border && y < gridH - border) {
          tiles[y * gridW + x] = 0;
        }
      }
    }

    // Colonnade border: alternating wall/floor tiles so the room reads as an
    // open architectural hall rather than a sealed box, while out-of-bounds
    // collision still keeps the player inside.
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (x === 0 || x === gridW - 1 || y === 0 || y === gridH - 1) {
          tiles[y * gridW + x] = (x + y) % 2 === 0 ? 1 : 0;
        }
      }
    }

    // A few random pillars for visual rhythm (not maze-like obstacles).
    const interiorW = gridW - border * 2;
    const interiorH = gridH - border * 2;
    const pillarCount = Math.min(4, Math.floor(interiorW * interiorH * 0.02));
    for (let i = 0; i < pillarCount; i++) {
      const px = border + Math.floor(this.rng() * interiorW);
      const py = border + Math.floor(this.rng() * interiorH);
      tiles[py * gridW + px] = 1;
    }

    // REAL BFS connectivity check: every floor tile reachable from center.
    this.ensureConnectivity(tiles, gridW, gridH);

    const room: Room = {
      id: depth * 1000 + id,
      bounds: { x: 0, y: 0, w: gridW * BALANCE.tileSize, h: gridH * BALANCE.tileSize },
      gridW,
      gridH,
      tiles,
      doors: [],
      objects: [],
      cleared: false,
      visited: false,
      hasBeenOffscreen: false,
    };

    // Place objects: fragments + disturbance + memory objects.
    this.placeObjects(room, depth, memoryObjects);

    return room;
  }

  /**
   * Real BFS from the center tile. If any floor tile is unreachable,
   * carve a straight path (Manhattan) from center to that tile.
   * Repeat until all floor tiles are reachable (bounded iterations).
   */
  private ensureConnectivity(tiles: TileType[], gridW: number, gridH: number): void {
    const center = { x: Math.floor(gridW / 2), y: Math.floor(gridH / 2) };
    // Ensure center is floor.
    if (tiles[center.y * gridW + center.x] !== 0) {
      tiles[center.y * gridW + center.x] = 0;
    }

    let guard = 0;
    while (guard++ < 1000) {
      const reachable = this.bfsReachable(tiles, gridW, gridH, center.x, center.y);
      // Find an unreachable floor tile.
      let unreachable: { x: number; y: number } | null = null;
      for (let y = 0; y < gridH && !unreachable; y++) {
        for (let x = 0; x < gridW && !unreachable; x++) {
          if (tiles[y * gridW + x] === 0 && !reachable[y * gridW + x]) {
            unreachable = { x, y };
          }
        }
      }
      if (!unreachable) {
        return; // all connected
      }
      // Carve a path from center to the unreachable tile (Manhattan walk).
      this.carvePath(tiles, gridW, gridH, center.x, center.y, unreachable.x, unreachable.y);
    }
  }

  /** BFS traversal returning a boolean array of reachable floor/door tiles. */
  private bfsReachable(
    tiles: TileType[],
    gridW: number,
    gridH: number,
    startX: number,
    startY: number
  ): boolean[] {
    const total = gridW * gridH;
    const visited = new Array<boolean>(total).fill(false);
    const queue: number[] = [];
    const startIdx = startY * gridW + startX;
    visited[startIdx] = true;
    queue.push(startIdx);

    const dirs = [1, -1, gridW, -gridW];
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      const x = idx % gridW;
      const y = Math.floor(idx / gridW);
      // 4-neighbourhood, respecting grid edges.
      // Right
      if (x + 1 < gridW) {
        const n = idx + 1;
        if (!visited[n] && (tiles[n] === 0 || tiles[n] === 2)) {
          visited[n] = true;
          queue.push(n);
        }
      }
      // Left
      if (x - 1 >= 0) {
        const n = idx - 1;
        if (!visited[n] && (tiles[n] === 0 || tiles[n] === 2)) {
          visited[n] = true;
          queue.push(n);
        }
      }
      // Down
      if (y + 1 < gridH) {
        const n = idx + gridW;
        if (!visited[n] && (tiles[n] === 0 || tiles[n] === 2)) {
          visited[n] = true;
          queue.push(n);
        }
      }
      // Up
      if (y - 1 >= 0) {
        const n = idx - gridW;
        if (!visited[n] && (tiles[n] === 0 || tiles[n] === 2)) {
          visited[n] = true;
          queue.push(n);
        }
      }
      // Suppress unused-var lint for dirs (kept for clarity).
      void dirs;
    }
    return visited;
  }

  /** Carve a Manhattan path from (x0,y0) to (x1,y1), setting tiles to floor. */
  private carvePath(
    tiles: TileType[],
    gridW: number,
    gridH: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void {
    let x = x0;
    let y = y0;
    // Move horizontally first, then vertically.
    while (x !== x1) {
      x += x1 > x ? 1 : -1;
      if (tiles[y * gridW + x] !== 2) {
        tiles[y * gridW + x] = 0;
      }
    }
    while (y !== y1) {
      y += y1 > y ? 1 : -1;
      if (tiles[y * gridW + x] !== 2) {
        tiles[y * gridW + x] = 0;
      }
    }
  }

  /**
   * Connect two rooms sequentially: roomA's east door -> roomB's west door.
   * Finds an east-edge floor tile in A and a west-edge floor tile in B,
   * then registers Door objects on both. (Rooms are logically adjacent;
   * the engine handles transitions.)
   */
  private connectRooms(roomA: Room, roomB: Room, roomAIndex: number, roomBIndex: number): void {
    // East door on A: rightmost column floor tile.
    let eastTile: { x: number; y: number } | null = null;
    for (let y = 0; y < roomA.gridH; y++) {
      const x = roomA.gridW - 1;
      if (roomA.tiles[y * roomA.gridW + x] === 0) {
        // Prefer a tile near vertical center.
        if (
          !eastTile ||
          Math.abs(y - Math.floor(roomA.gridH / 2)) <
            Math.abs(eastTile.y - Math.floor(roomA.gridH / 2))
        ) {
          eastTile = { x, y };
        }
      }
    }
    // If none, carve one at center-right.
    if (!eastTile) {
      const y = Math.floor(roomA.gridH / 2);
      const x = roomA.gridW - 1;
      roomA.tiles[y * roomA.gridW + x] = 0;
      eastTile = { x, y };
    }

    // West door on B: leftmost column floor tile.
    let westTile: { x: number; y: number } | null = null;
    for (let y = 0; y < roomB.gridH; y++) {
      const x = 0;
      if (roomB.tiles[y * roomB.gridW + x] === 0) {
        if (
          !westTile ||
          Math.abs(y - Math.floor(roomB.gridH / 2)) <
            Math.abs(westTile.y - Math.floor(roomB.gridH / 2))
        ) {
          westTile = { x, y };
        }
      }
    }
    if (!westTile) {
      const y = Math.floor(roomB.gridH / 2);
      const x = 0;
      roomB.tiles[y * roomB.gridW + x] = 0;
      westTile = { x, y };
    }

    // Set door tiles.
    roomA.tiles[eastTile.y * roomA.gridW + eastTile.x] = 2;
    roomB.tiles[westTile.y * roomB.gridW + westTile.x] = 2;

    const doorA: Door = {
      x: eastTile.x,
      y: eastTile.y,
      side: 'east',
      connectsToRoom: roomBIndex,
    };
    const doorB: Door = {
      x: westTile.x,
      y: westTile.y,
      side: 'west',
      connectsToRoom: roomAIndex,
    };
    roomA.doors.push(doorA);
    roomB.doors.push(doorB);
  }

  /** Place fragments, disturbance objects, and memory objects in a room. */
  private placeObjects(room: Room, depth: number, memoryObjects?: MemoryObjectKind[]): void {
    const floorTiles = this.listFloorTiles(room);
    if (floorTiles.length === 0) return;

    const fragCount =
      BALANCE.fragmentCountPerRoom[depth - 1] ??
      BALANCE.fragmentCountPerRoom[0];

    // Shuffle a copy of floor tiles for placement.
    const shuffled = [...floorTiles];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    let placed = 0;
    for (let i = 0; i < shuffled.length && placed < fragCount; i++) {
      const t = shuffled[i];
      const px = Room_tileToPixel(t.x, t.y);
      room.objects.push({
        id: this.nextObjectId(),
        type: 'fragment',
        x: px.x + BALANCE.tileSize / 2,
        y: px.y + BALANCE.tileSize / 2,
        collected: false,
        radius: 12,
      });
      placed++;
    }

    // Disturbance object: 40% chance per room.
    if (this.rng() < BALANCE.disturbanceObjectChance && shuffled.length > placed) {
      const t = shuffled[placed];
      const px = Room_tileToPixel(t.x, t.y);
      room.objects.push({
        id: this.nextObjectId(),
        type: 'disturbance',
        x: px.x + BALANCE.tileSize / 2,
        y: px.y + BALANCE.tileSize / 2,
        collected: false,
        radius: 16,
      });
      placed++;
    }

    // Memory objects: place 1-2 per room from the target's memory list.
    // These are non-interactive (no collision, no pickup) — environmental storytelling.
    if (memoryObjects && memoryObjects.length > 0 && shuffled.length > placed) {
      const memCount = 1 + (this.rng() < 0.5 ? 1 : 0); // 1 or 2
      for (let i = 0; i < memCount && placed < shuffled.length; i++) {
        const t = shuffled[placed];
        const px = Room_tileToPixel(t.x, t.y);
        const kind = memoryObjects[Math.floor(this.rng() * memoryObjects.length)];
        room.objects.push({
          id: this.nextObjectId(),
          type: 'memory',
          x: px.x + BALANCE.tileSize / 2,
          y: px.y + BALANCE.tileSize / 2,
          collected: false,
          radius: 14,
          memoryKind: kind,
        });
        placed++;
      }
    }
  }

  /** Apply the theme's visual rule to a room. */
  private applyVisualRule(room: Room, theme: LayerTheme): void {
    if (theme.visualRule === 'mirror') {
      // Flip the tile grid horizontally.
      const mirrored: TileType[] = new Array(room.tiles.length);
      for (let y = 0; y < room.gridH; y++) {
        for (let x = 0; x < room.gridW; x++) {
          mirrored[y * room.gridW + x] =
            room.tiles[y * room.gridW + (room.gridW - 1 - x)];
        }
      }
      room.tiles = mirrored;
      // Mirror door x-coords.
      for (const door of room.doors) {
        door.x = room.gridW - 1 - door.x;
        // Swap east/west sides.
        if (door.side === 'east') door.side = 'west';
        else if (door.side === 'west') door.side = 'east';
      }
    } else if (theme.visualRule === 'regenerate') {
      // Mark for off-screen regen handling. The Room stays as-is until
      // RoomHelper.regenerateIfNeeded is called after it goes off-screen.
      room.hasBeenOffscreen = false;
    }
    // 'normal' -> nothing.
  }

  /** Return a list of all floor tile coords in the room. */
  private listFloorTiles(room: Room): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < room.gridH; y++) {
      for (let x = 0; x < room.gridW; x++) {
        if (room.tiles[y * room.gridW + x] === 0) {
          out.push({ x, y });
        }
      }
    }
    return out;
  }

  /** Find a floor tile near the center of the room. */
  private findFloorTile(room: Room): { x: number; y: number } | null {
    const center = { x: Math.floor(room.gridW / 2), y: Math.floor(room.gridH / 2) };
    // BFS outward from center for nearest floor tile.
    const visited = new Set<number>();
    const queue: { x: number; y: number }[] = [center];
    visited.add(center.y * room.gridW + center.x);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (room.tiles[cur.y * room.gridW + cur.x] === 0) {
        return cur;
      }
      const dirs = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];
      for (const [dx, dy] of dirs) {
        const nx = cur.x + dx;
        const ny = cur.y + dy;
        if (nx < 0 || ny < 0 || nx >= room.gridW || ny >= room.gridH) continue;
        const idx = ny * room.gridW + nx;
        if (visited.has(idx)) continue;
        visited.add(idx);
        queue.push({ x: nx, y: ny });
      }
    }
    return null;
  }

  private nextObjectId(): number {
    return this.objectIdCounter++;
  }
}

// --- Local helpers (avoid circular import with Room.ts) ---

function Room_tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: tileX * BALANCE.tileSize,
    y: tileY * BALANCE.tileSize,
  };
}

// --- Seeded RNG: mulberry32 ---
function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
