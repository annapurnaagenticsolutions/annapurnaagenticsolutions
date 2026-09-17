// ONEIRIC — Player entity behavior
// Movement, tile collision (circle-rect against tile grid), light radius,
// damage handling, and fragment pickup. The Player data lives in GameState;
// this module provides pure behavior functions operating on that data.

import type { Player, InputState, Room, TileType } from '../types';
import { BALANCE } from '../data/balance';

const TILE_SIZE = BALANCE.tileSize;
const PLAYER_RADIUS = 10; // collision radius in pixels

export class PlayerEntity {
  /**
   * Create a new Player at the given pixel coordinates with BALANCE defaults.
   */
  static create(
    x: number,
    y: number,
    echoCapacityBonus: number = 0,
  ): Player {
    return {
      x,
      y,
      vx: 0,
      vy: 0,
      hp: BALANCE.playerMaxHp,
      maxHp: BALANCE.playerMaxHp,
      lightRadius: BALANCE.playerLightRadius,
      speed: BALANCE.playerSpeed,
      hasSeed: false,
      facing: 0,
      invulnTimer: 0,
      surgeTimer: 0,
      surgeCooldown: 0,
      isSurging: false,
      echoesLeft: BALANCE.echoLureBaseCapacity + echoCapacityBonus,
    };
  }

  /**
   * Attempt to trigger a Lucid Surge (Phase Dash).
   * Returns true if surge was successfully initiated.
   */
  static triggerSurge(player: Player, cooldownReduction: number = 0): boolean {
    if (player.surgeCooldown > 0 || player.isSurging) return false;
    player.isSurging = true;
    player.surgeTimer = BALANCE.lucidSurgeDuration;
    player.surgeCooldown = Math.max(1.0, BALANCE.lucidSurgeBaseCooldown - cooldownReduction);
    player.invulnTimer = Math.max(player.invulnTimer, BALANCE.lucidSurgeDuration + 0.1);
    return true;
  }

  /**
   * Update the player: read input, apply velocity, resolve tile collisions
   * on X then Y separately, update facing, decrement invulnerability, and
   * recompute light radius from stability.
   *
   * `dt` is the EFFECTIVE dt (time dilation already applied by caller).
   * `stability` is 0-100 from GameState.
   */
  static update(
    player: Player,
    input: InputState,
    room: Room,
    dt: number,
    stability: number,
    reducedMotion: boolean,
  ): void {
    // --- Timers ------------------------------------------------------------
    if (player.surgeCooldown > 0) {
      player.surgeCooldown = Math.max(0, player.surgeCooldown - dt);
    }

    if (player.surgeTimer > 0) {
      player.surgeTimer -= dt;
      if (player.surgeTimer <= 0) {
        player.surgeTimer = 0;
        player.isSurging = false;
      }
    }

    // --- Input -------------------------------------------------------------
    let dx = 0;
    let dy = 0;
    const keys = input.keys;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    // Normalize diagonal so speed is consistent
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.SQRT2;
      dx *= inv;
      dy *= inv;
    }

    // If surging and no input, surge forward in current facing direction
    if (player.isSurging && dx === 0 && dy === 0) {
      dx = Math.cos(player.facing);
      dy = Math.sin(player.facing);
    }

    // Acceleration-based movement — gives the player a sense of weight.
    const currentSpeed = player.isSurging
      ? player.speed * BALANCE.lucidSurgeSpeedMultiplier
      : player.speed;

    const targetVx = dx * currentSpeed;
    const targetVy = dy * currentSpeed;
    const accelRate = player.isSurging ? 28.0 : 12.0; // snappier during surge
    const lerpFactor = 1 - Math.exp(-accelRate * dt);

    player.vx += (targetVx - player.vx) * lerpFactor;
    player.vy += (targetVy - player.vy) * lerpFactor;

    // Deadzone — if velocity is very small, zero it out to prevent drift
    if (Math.abs(player.vx) < 1) player.vx = 0;
    if (Math.abs(player.vy) < 1) player.vy = 0;

    // --- Move + collide (separate-axis resolution) -------------------------
    // X axis
    const nextX = player.x + player.vx * dt;
    if (!PlayerEntity.circleHitsWall(room, nextX, player.y)) {
      player.x = nextX;
    } else {
      // Snap to the edge of the offending wall tile based on movement dir.
      player.x = PlayerEntity.snapAxis(room, player.x, player.y, nextX, true);
      player.vx = 0;
    }

    // Y axis
    const nextY = player.y + player.vy * dt;
    if (!PlayerEntity.circleHitsWall(room, player.x, nextY)) {
      player.y = nextY;
    } else {
      player.y = PlayerEntity.snapAxis(room, player.x, player.y, nextY, false);
      player.vy = 0;
    }

    // --- Facing ------------------------------------------------------------
    if (player.vx !== 0 || player.vy !== 0) {
      player.facing = Math.atan2(player.vy, player.vx);
    }

    // --- Invulnerability ---------------------------------------------------
    if (player.invulnTimer > 0) {
      player.invulnTimer = Math.max(0, player.invulnTimer - dt);
    }

    // --- Light radius (shrinks with stability, floored at 15%) ------------
    player.lightRadius =
      BALANCE.playerLightRadius * Math.max(0.15, stability / 100);

    // reducedMotion is a rendering concern; kept in signature per contract.
    void reducedMotion;
  }

  /**
   * Apply damage to the player. Returns true if damage was applied (player
   * was not invulnerable), false otherwise. Sets invulnTimer on success.
   */
  static takeDamage(player: Player, amount: number): boolean {
    if (player.invulnTimer > 0) return false;
    player.hp = Math.max(0, player.hp - amount);
    player.invulnTimer = BALANCE.playerInvulnTime;
    return true;
  }

  /**
   * Circle-rect collision: does the player's collision circle overlap the
   * given tile (in tile coords)? tileSize is the pixel size of one tile.
   */
  static collidesWithTile(
    player: Player,
    tileX: number,
    tileY: number,
    tileSize: number,
  ): boolean {
    const r = PLAYER_RADIUS;
    const rectLeft = tileX * tileSize;
    const rectRight = rectLeft + tileSize;
    const rectTop = tileY * tileSize;
    const rectBottom = rectTop + tileSize;

    const closestX = Math.max(rectLeft, Math.min(player.x, rectRight));
    const closestY = Math.max(rectTop, Math.min(player.y, rectBottom));

    const ddx = player.x - closestX;
    const ddy = player.y - closestY;
    return ddx * ddx + ddy * ddy < r * r;
  }

  /**
   * Light gradient descriptor for the renderer.
   */
  static getLightGradient(player: Player): {
    inner: string;
    outer: string;
    radius: number;
  } {
    return {
      inner: 'rgba(255, 240, 200, 0.35)',
      outer: 'rgba(255, 240, 200, 0)',
      radius: player.lightRadius,
    };
  }

  /**
   * Is the player within pickup radius of the given object position?
   */
  static pickupFragment(player: Player, objX: number, objY: number): boolean {
    const r = BALANCE.fragmentPickupRadius + PLAYER_RADIUS;
    const ddx = player.x - objX;
    const ddy = player.y - objY;
    return ddx * ddx + ddy * ddy <= r * r;
  }

  // --- Internal helpers ---------------------------------------------------

  /**
   * Is the tile at (tx, ty) a wall (type 1)? Out-of-bounds counts as wall.
   */
  private static isWallTile(room: Room, tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= room.gridW || ty >= room.gridH) {
      return true;
    }
    const t: TileType = room.tiles[ty * room.gridW + tx];
    return t === 1;
  }

  /**
   * Does the player circle at (px, py) overlap any wall tile?
   * Scans the tile range overlapping the circle's bounding box.
   */
  private static circleHitsWall(room: Room, px: number, py: number): boolean {
    const r = PLAYER_RADIUS;
    const minTx = Math.floor((px - r) / TILE_SIZE);
    const maxTx = Math.floor((px + r) / TILE_SIZE);
    const minTy = Math.floor((py - r) / TILE_SIZE);
    const maxTy = Math.floor((py + r) / TILE_SIZE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (!PlayerEntity.isWallTile(room, tx, ty)) continue;
        const rectLeft = tx * TILE_SIZE;
        const rectRight = rectLeft + TILE_SIZE;
        const rectTop = ty * TILE_SIZE;
        const rectBottom = rectTop + TILE_SIZE;
        const closestX = Math.max(rectLeft, Math.min(px, rectRight));
        const closestY = Math.max(rectTop, Math.min(py, rectBottom));
        const ddx = px - closestX;
        const ddy = py - closestY;
        if (ddx * ddx + ddy * ddy < r * r) return true;
      }
    }
    return false;
  }

  /**
   * Snap the player to the edge of the wall tile it collided with along a
   * single axis. `onX` true = X-axis movement, false = Y-axis movement.
   * `prev` is the current safe position; `next` is the colliding position.
   */
  private static snapAxis(
    room: Room,
    prevX: number,
    prevY: number,
    next: number,
    onX: boolean,
  ): number {
    const r = PLAYER_RADIUS;
    if (onX) {
      const movingRight = next > prevX;
      // Find the wall tile column we ran into.
      const tx = Math.floor(next / TILE_SIZE);
      // Scan the vertical span of the player for a wall in that column.
      const minTy = Math.floor((prevY - r) / TILE_SIZE);
      const maxTy = Math.floor((prevY + r) / TILE_SIZE);
      for (let ty = minTy; ty <= maxTy; ty++) {
        if (PlayerEntity.isWallTile(room, tx, ty)) {
          if (movingRight) {
            return tx * TILE_SIZE - r - 0.01;
          } else {
            return (tx + 1) * TILE_SIZE + r + 0.01;
          }
        }
      }
      return prevX; // no wall found in span, stay put (safe fallback)
    } else {
      const movingDown = next > prevY;
      const ty = Math.floor(next / TILE_SIZE);
      const minTx = Math.floor((prevX - r) / TILE_SIZE);
      const maxTx = Math.floor((prevX + r) / TILE_SIZE);
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (PlayerEntity.isWallTile(room, tx, ty)) {
          if (movingDown) {
            return ty * TILE_SIZE - r - 0.01;
          } else {
            return (ty + 1) * TILE_SIZE + r + 0.01;
          }
        }
      }
      return prevY; // no wall found in span, stay put (safe fallback)
    }
  }
}
