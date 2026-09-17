// ONEIRIC — Room helper utilities
// Provides tile access, coordinate conversion, bounds, and off-screen regeneration.

import type { Room, TileType, LayerTheme } from '../types';
import { BALANCE } from '../data/balance';

export class RoomHelper {
  /** Get the tile type at grid coords (x, y). Out-of-bounds returns void (3). */
  static getTile(room: Room, x: number, y: number): TileType {
    if (x < 0 || y < 0 || x >= room.gridW || y >= room.gridH) {
      return 3; // void
    }
    return room.tiles[y * room.gridW + x] as TileType;
  }

  /** True if the tile at (x, y) is a wall (1). Out-of-bounds counts as wall. */
  static isWall(room: Room, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= room.gridW || y >= room.gridH) {
      return true;
    }
    return room.tiles[y * room.gridW + x] === 1;
  }

  /** True if the tile at (x, y) is floor (0) or door (2) — both walkable. */
  static isFloor(room: Room, x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= room.gridW || y >= room.gridH) {
      return false;
    }
    const t = room.tiles[y * room.gridW + x];
    return t === 0 || t === 2;
  }

  /** Convert grid coords to pixel coords (top-left of the tile). */
  static tileToPixel(tileX: number, tileY: number): { x: number; y: number } {
    return {
      x: tileX * BALANCE.tileSize,
      y: tileY * BALANCE.tileSize,
    };
  }

  /** Convert pixel coords to grid coords (floored). */
  static pixelToTile(px: number, py: number): { x: number; y: number } {
    return {
      x: Math.floor(px / BALANCE.tileSize),
      y: Math.floor(py / BALANCE.tileSize),
    };
  }

  /** Pixel bounds of the room (top-left at bounds.x/y, size = grid * tileSize). */
  static getBounds(room: Room): { x: number; y: number; w: number; h: number } {
    return {
      x: room.bounds.x,
      y: room.bounds.y,
      w: room.gridW * BALANCE.tileSize,
      h: room.gridH * BALANCE.tileSize,
    };
  }

  /**
   * "Layers of Fear" off-screen regeneration.
   * If the theme's visualRule is 'regenerate' and the room has been off-screen,
   * regenerate the tile layout using a fresh seeded pass. Objects and doors are
   * preserved (their pixel positions remain valid since the grid dimensions don't change).
   * Returns a new Room (immutable update) — or the original if no regen is needed.
   */
  static regenerateIfNeeded(room: Room, theme: LayerTheme, seed: number): Room {
    if (theme.visualRule !== 'regenerate' || !room.hasBeenOffscreen) {
      return room;
    }

    // Rebuild the tile layout with a derived seed so each regen differs.
    const regenSeed = (seed ^ 0x9e3779b9) ^ (room.id * 2654435761);
    const rng = mulberry32(regenSeed >>> 0);

    const gridW = room.gridW;
    const gridH = room.gridH;
    const total = gridW * gridH;
    const tiles: TileType[] = new Array(total).fill(1); // start all walls

    // Open architectural hall with a 1-tile border and a few pillars.
    const border = 1;
    for (let y = 0; y < gridH; y++) {
      for (let x = 0; x < gridW; x++) {
        if (x >= border && x < gridW - border && y >= border && y < gridH - border) {
          tiles[y * gridW + x] = 0;
        }
      }
    }

    const interiorW = gridW - border * 2;
    const interiorH = gridH - border * 2;
    const pillarCount = Math.min(8, Math.floor(interiorW * interiorH * 0.05));
    for (let i = 0; i < pillarCount; i++) {
      const px = border + Math.floor(rng() * interiorW);
      const py = border + Math.floor(rng() * interiorH);
      tiles[py * gridW + px] = 1;
    }

    // Preserve door tiles (set them back to 2) so doors remain walkable.
    for (const door of room.doors) {
      if (
        door.x >= 0 &&
        door.y >= 0 &&
        door.x < gridW &&
        door.y < gridH
      ) {
        tiles[door.y * gridW + door.x] = 2;
      }
    }

    return {
      ...room,
      tiles,
      hasBeenOffscreen: false,
    };
  }
}

// --- Seeded RNG (mulberry32) — local copy for regeneration ---
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
