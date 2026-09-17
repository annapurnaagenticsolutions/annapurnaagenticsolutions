// ONEIRIC — Projection (subconscious defense) entity
// AI state machine: patrol → alert → chase → patrol, with REAL Bresenham
// line-of-sight against the room tile grid. Speed/damage scale with depth.

import type { Projection, Player, Room, TileType } from '../types';
import { BALANCE } from '../data/balance';

const TILE_SIZE = BALANCE.tileSize;

export class ProjectionEntity {
  /**
   * Create a Projection at pixel coords. Speed and damage scale slightly
   * with depth (deeper layers = more dangerous projections).
   */
  static create(id: number, x: number, y: number, depth: number): Projection {
    const depthBoost = 1 + (depth - 1) * 0.12; // +12% per layer beyond 1
    return {
      id,
      x,
      y,
      vx: 0,
      vy: 0,
      state: 'patrol',
      alertTimer: 0,
      lastKnownPlayerX: 0,
      lastKnownPlayerY: 0,
      losLostTimer: 0,
      speed: BALANCE.projectionSpeed * depthBoost,
      damage: BALANCE.projectionDamage,
      radius: 12,
      patrolDir: Math.random() * Math.PI * 2,
      patrolTimer: 2 + Math.random(), // 2-3s before first direction change
      distractionTarget: null,
    };
  }

  /**
   * Update the projection's AI state machine.
   *
   * patrol     — wander; if lure active → distracted; if LOS to player within alertRange → alert
   * distracted — move toward the echo lure; if lure expires → patrol
   * alert      — stop, face player, count down; on 0 → chase; if LOS lost → patrol
   * chase      — move toward last known position; if lure nearby → distracted; if LOS lost > losLostTime → patrol
   *
   * The caller is responsible for applying damage when the projection is
   * close enough (see damagePlayer); this function only moves the entity.
   */
  static update(
    proj: Projection,
    player: Player,
    room: Room,
    dt: number,
    echoLures?: { x: number; y: number; timer: number; radius: number }[],
    depth: number = 1,
  ): void {
    const hasLOS = ProjectionEntity.lineOfSight(proj, player, room);
    const distToPlayer = Math.hypot(player.x - proj.x, player.y - proj.y);

    // Check for nearby active Echo Lures
    let activeLure: { x: number; y: number; timer: number; radius: number } | null = null;
    if (echoLures && echoLures.length > 0) {
      for (const lure of echoLures) {
        if (lure.timer > 0) {
          const distToLure = Math.hypot(lure.x - proj.x, lure.y - proj.y);
          if (distToLure <= lure.radius) {
            activeLure = lure;
            break;
          }
        }
      }
    }

    if (activeLure && proj.state !== 'distracted') {
      proj.state = 'distracted';
      proj.distractionTarget = { x: activeLure.x, y: activeLure.y };
    }

    switch (proj.state) {
      // --- DISTRACTED ------------------------------------------------------
      case 'distracted': {
        if (!activeLure || activeLure.timer <= 0) {
          proj.state = 'patrol';
          proj.distractionTarget = null;
          proj.patrolTimer = 1.5 + Math.random();
          break;
        }

        const ldx = activeLure.x - proj.x;
        const ldy = activeLure.y - proj.y;
        const ldist = Math.hypot(ldx, ldy);

        if (ldist > 8) {
          const nx = ldx / ldist;
          const ny = ldy / ldist;
          proj.vx = nx * proj.speed * 1.1;
          proj.vy = ny * proj.speed * 1.1;

          const stepX = proj.x + proj.vx * dt;
          const stepY = proj.y + proj.vy * dt;
          if (!ProjectionEntity.hitsWall(room, stepX, proj.y)) proj.x = stepX;
          if (!ProjectionEntity.hitsWall(room, proj.x, stepY)) proj.y = stepY;
        } else {
          proj.vx = 0;
          proj.vy = 0;
        }
        break;
      }

      // --- PATROL ----------------------------------------------------------
      case 'patrol': {
        proj.patrolTimer -= dt;
        if (proj.patrolTimer <= 0) {
          // Pick a new patrol direction every 2-3 seconds.
          proj.patrolDir = Math.random() * Math.PI * 2;
          proj.patrolTimer = 2 + Math.random();
        }

        const moveX = Math.cos(proj.patrolDir) * proj.speed * dt;
        const moveY = Math.sin(proj.patrolDir) * proj.speed * dt;
        const newX = proj.x + moveX;
        const newY = proj.y + moveY;

        // If we hit a wall, pick a new direction immediately.
        if (ProjectionEntity.hitsWall(room, newX, newY)) {
          proj.patrolDir = Math.random() * Math.PI * 2;
          proj.patrolTimer = 2 + Math.random();
        } else {
          proj.x = newX;
          proj.y = newY;
        }

        // Spot the player? (Unless player is currently in Lucid Surge phase)
        if (hasLOS && distToPlayer <= BALANCE.projectionAlertRange && !player.isSurging) {
          proj.state = 'alert';
          proj.alertTimer = BALANCE.projectionAlertTime;
          proj.lastKnownPlayerX = player.x;
          proj.lastKnownPlayerY = player.y;
        }
        break;
      }

      // --- ALERT -----------------------------------------------------------
      case 'alert': {
        // Stop and face the player.
        proj.vx = 0;
        proj.vy = 0;
        proj.alertTimer -= dt;

        // Keep tracking the player's known position while we can see them.
        if (hasLOS && !player.isSurging) {
          proj.lastKnownPlayerX = player.x;
          proj.lastKnownPlayerY = player.y;
          proj.losLostTimer = 0;
        }

        if ((!hasLOS || player.isSurging) && distToPlayer > BALANCE.projectionAlertRange) {
          // Lost them before committing → back to patrol.
          proj.state = 'patrol';
          proj.patrolTimer = 2 + Math.random();
          break;
        }

        if (proj.alertTimer <= 0) {
          proj.state = 'chase';
          proj.losLostTimer = 0;
        }
        break;
      }

      // --- CHASE -----------------------------------------------------------
      case 'chase': {
        const chaseSpeed = depth >= 3 ? BALANCE.projectionChaseSpeed * 1.3 : BALANCE.projectionChaseSpeed;

        if (hasLOS && !player.isSurging) {
          // Refresh last known position while we can see the player.
          proj.lastKnownPlayerX = player.x;
          proj.lastKnownPlayerY = player.y;
          proj.losLostTimer = 0;
        } else {
          proj.losLostTimer += dt;
          if (proj.losLostTimer >= BALANCE.projectionLosLostTime) {
            // Gave up — return to patrol.
            proj.state = 'patrol';
            proj.patrolTimer = 2 + Math.random();
            break;
          }
        }

        // Move toward last known player position.
        const tdx = proj.lastKnownPlayerX - proj.x;
        const tdy = proj.lastKnownPlayerY - proj.y;
        const tdist = Math.hypot(tdx, tdy);
        if (tdist > 1) {
          const nx = tdx / tdist;
          const ny = tdy / tdist;
          proj.vx = nx * chaseSpeed;
          proj.vy = ny * chaseSpeed;

          const stepX = proj.x + proj.vx * dt;
          const stepY = proj.y + proj.vy * dt;
          // Slide along walls: try X then Y independently.
          if (!ProjectionEntity.hitsWall(room, stepX, proj.y)) {
            proj.x = stepX;
          }
          if (!ProjectionEntity.hitsWall(room, proj.x, stepY)) {
            proj.y = stepY;
          }
        } else {
          proj.vx = 0;
          proj.vy = 0;
        }
        break;
      }
    }
  }

  /**
   * REAL Bresenham line-of-sight: walk the tile grid from the projection's
   * tile to the player's tile using the integer Bresenham line algorithm.
   * If ANY tile along the line is a wall (type 1), the line is blocked.
   *
   * This is a true LOS check — not a distance check.
   */
  static lineOfSight(
    proj: Projection,
    player: Player,
    room: Room,
  ): boolean {
    const x0 = Math.floor(proj.x / TILE_SIZE);
    const y0 = Math.floor(proj.y / TILE_SIZE);
    const x1 = Math.floor(player.x / TILE_SIZE);
    const y1 = Math.floor(player.y / TILE_SIZE);

    // Bresenham's line algorithm (integer, all-octant).
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    let cx = x0;
    let cy = y0;

    // Guard against pathological loops.
    const maxSteps = dx + dy + 2;

    for (let i = 0; i <= maxSteps; i++) {
      // Don't block on the start/end tiles themselves (entities can stand
      // adjacent to walls). Check every intermediate tile.
      if (!(cx === x0 && cy === y0) && !(cx === x1 && cy === y1)) {
        if (ProjectionEntity.tileIsWall(room, cx, cy)) {
          return false;
        }
      }

      if (cx === x1 && cy === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        cx += sx;
      }
      if (e2 < dx) {
        err += dx;
        cy += sy;
      }
    }

    return true;
  }

  /**
   * Is the projection close enough to damage the player? Returns true if
   * their circles overlap. The caller applies the actual damage + stability
   * penalty via PlayerEntity.takeDamage.
   */
  static damagePlayer(proj: Projection, player: Player): boolean {
    const r = proj.radius + 10; // player collision radius
    const ddx = proj.x - player.x;
    const ddy = proj.y - player.y;
    return ddx * ddx + ddy * ddy <= r * r;
  }

  /**
   * Pick a random floor tile position for spawning a projection, biased away
   * from the room center so enemies don't spawn on top of the player.
   */
  static getSpawnPosition(room: Room, rng: () => number): { x: number; y: number } {
    const cx = room.gridW / 2;
    const cy = room.gridH / 2;
    const minDistFromCenter = Math.min(room.gridW, room.gridH) * 0.3;

    for (let attempt = 0; attempt < 64; attempt++) {
      const tx = Math.floor(rng() * room.gridW);
      const ty = Math.floor(rng() * room.gridH);
      const t: TileType = room.tiles[ty * room.gridW + tx];
      if (t !== 0) continue; // only floor tiles
      const d = Math.hypot(tx - cx, ty - cy);
      if (d < minDistFromCenter) continue;
      return {
        x: tx * TILE_SIZE + TILE_SIZE / 2,
        y: ty * TILE_SIZE + TILE_SIZE / 2,
      };
    }
    // Fallback: any floor tile.
    for (let i = 0; i < room.tiles.length; i++) {
      if (room.tiles[i] === 0) {
        const tx = i % room.gridW;
        const ty = Math.floor(i / room.gridW);
        return {
          x: tx * TILE_SIZE + TILE_SIZE / 2,
          y: ty * TILE_SIZE + TILE_SIZE / 2,
        };
      }
    }
    // Ultimate fallback: room center.
    return {
      x: room.bounds.x + room.bounds.w / 2,
      y: room.bounds.y + room.bounds.h / 2,
    };
  }

  // --- Internal helpers ---------------------------------------------------

  private static tileIsWall(room: Room, tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= room.gridW || ty >= room.gridH) {
      return true;
    }
    return room.tiles[ty * room.gridW + tx] === 1;
  }

  /**
   * Does the projection's circle at (px, py) overlap any wall tile?
   */
  private static hitsWall(room: Room, px: number, py: number): boolean {
    const r = 12;
    const minTx = Math.floor((px - r) / TILE_SIZE);
    const maxTx = Math.floor((px + r) / TILE_SIZE);
    const minTy = Math.floor((py - r) / TILE_SIZE);
    const maxTy = Math.floor((py + r) / TILE_SIZE);

    for (let ty = minTy; ty <= maxTy; ty++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        if (ProjectionEntity.tileIsWall(room, tx, ty)) {
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
    }
    return false;
  }
}
