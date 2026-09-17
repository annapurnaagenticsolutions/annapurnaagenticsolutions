import * as THREE from 'three';
import type { LayerTheme } from '../types';

// ONEIRIC — Impossible Geometry
// Escher-like paradoxical structures for the dream world:
//   - Penrose stairs that loop back on themselves
//   - Floating broken archways at impossible angles
//   - Recursive nested doorways receding into infinity
//   - Twisting paradox columns whose top and bottom don't align
//   - Gravity-shift stairs that continue onto the ceiling
//
// All objects are self-animating via onBeforeRender callbacks so they need
// no external update loop. frustumCulled is set to false so partially
// off-screen impossible objects never vanish.

type Palette = LayerTheme['palette'];

export class ImpossibleGeometry {
  /** Disable frustum culling for an impossible object and all descendants. */
  private static markAsImpossible(obj: THREE.Object3D): void {
    obj.traverse((child: THREE.Object3D) => {
      child.frustumCulled = false;
    });
  }

  // =====================================================================
  //  createEscherStaircase
  // =====================================================================

  /**
   * A Penrose staircase: a square spiral of steps that loops back on itself.
   * Each side of the square has a run of steps ascending, then turns 90°,
   * and after four sides the top step connects back to the bottom — an
   * impossible loop. The whole structure rotates slowly.
   */
  static createEscherStaircase(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'escher-staircase';

    const palette = theme.palette;
    const accent = new THREE.Color(palette.accent);

    const stepMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: accent,
      emissiveIntensity: 0.14,
      roughness: 0.7,
      metalness: 0.1,
    });

    const stepsPerSide = 6;
    const stepWidth = 0.9;
    const stepDepth = 0.9;
    const stepHeight = 0.18;
    const sideLength = stepsPerSide * stepDepth;
    const radius = sideLength / 2;

    // Build four sides of the square. Each side ascends by stepsPerSide
    // steps, then turns 90°. Because the rise is continuous around the loop
    // but the square closes on itself, the geometry is impossible — the
    // last step is level with the first, yet everything ascended.
    let globalStep = 0;
    for (let side = 0; side < 4; side++) {
      const sideGroup = new THREE.Group();
      sideGroup.rotation.y = (side * Math.PI) / 2;

      for (let i = 0; i < stepsPerSide; i++) {
        const geo = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
        const step = new THREE.Mesh(geo, stepMat);
        // Position along the side, rising as we go.
        const along = i * stepDepth - radius + stepDepth / 2;
        step.position.set(along, globalStep * stepHeight, 0);
        sideGroup.add(step);
        globalStep++;
      }
      group.add(sideGroup);
    }

    // Central pillar — a thin emissive core that the stairs wind around.
    const coreGeo = new THREE.CylinderGeometry(0.12, 0.12, globalStep * stepHeight, 8);
    const coreMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.4,
    });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = (globalStep * stepHeight) / 2;
    group.add(core);

    group.frustumCulled = false;
    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;
      group.rotation.y += 0.15 * dt;
    };

    return group;
  }

  // =====================================================================
  //  createFloatingArch
  // =====================================================================

  /**
   * A broken archway floating in the void, with fragments suspended at
   * impossible angles around it. The main arch is a partial torus; the
   * fragments are smaller torus/box pieces that bob and rotate gently.
   */
  static createFloatingArch(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'floating-arch';

    const palette = theme.palette;
    const accent = new THREE.Color(palette.accent);

    const archMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: accent,
      emissiveIntensity: 0.15,
      roughness: 0.6,
      metalness: 0.15,
      transparent: true,
      opacity: 0.85,
    });

    // Main arch — a 3/4 torus so it reads as broken/incomplete.
    const archGeo = new THREE.TorusGeometry(1.2, 0.14, 10, 16, Math.PI * 1.5);
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.name = 'arch-main';
    group.add(arch);

    // Emissive inner edge.
    const innerGeo = new THREE.TorusGeometry(1.05, 0.03, 8, 16, Math.PI * 1.5);
    const innerMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.42,
      transparent: true,
      opacity: 0.7,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.name = 'arch-inner';
    group.add(inner);

    // Floating fragments around the arch at impossible angles.
    const fragMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.21,
      roughness: 0.4,
      metalness: 0.3,
      transparent: true,
      opacity: 0.6,
    });

    const fragments: THREE.Mesh[] = [];
    const fragCount = 5;
    for (let i = 0; i < fragCount; i++) {
      let frag: THREE.Mesh;
      if (i % 2 === 0) {
        // Small torus arc fragment.
        frag = new THREE.Mesh(
          new THREE.TorusGeometry(0.25, 0.06, 8, 10, Math.PI * 0.4),
          fragMat,
        );
      } else {
        // Box shard.
        frag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.12), fragMat);
      }
      // Distribute fragments around the arch at random-ish angles.
      const angle = (i / fragCount) * Math.PI * 2 + 0.3;
      const dist = 1.8 + (i % 2) * 0.4;
      frag.position.set(
        Math.cos(angle) * dist,
        Math.sin(angle) * dist * 0.6,
        (i - fragCount / 2) * 0.3,
      );
      frag.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      frag.userData.baseY = frag.position.y;
      frag.userData.bobPhase = Math.random() * Math.PI * 2;
      frag.userData.bobSpeed = 0.6 + Math.random() * 0.4;
      frag.userData.bobAmp = 0.15 + Math.random() * 0.15;
      frag.userData.rotSpeed = (Math.random() - 0.5) * 0.5;
      fragments.push(frag);
      group.add(frag);
    }

    group.frustumCulled = false;
    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;
      // Whole arch sways gently.
      group.rotation.z = Math.sin(now * 0.3) * 0.05;
      for (const frag of fragments) {
        const ud = frag.userData;
        frag.position.y = ud.baseY + Math.sin(now * ud.bobSpeed + ud.bobPhase) * ud.bobAmp;
        frag.rotation.y += ud.rotSpeed * dt;
        frag.rotation.x += ud.rotSpeed * 0.5 * dt;
      }
    };

    return group;
  }

  // =====================================================================
  //  createRecursiveDoorway
  // =====================================================================

  /**
   * A doorway within a doorway within a doorway — 6 nested rectangular
   * frames of decreasing size, slightly offset in Z, creating a tunnel
   * that recedes into infinity. Each frame has emissive accent edges.
   * Feels non-Euclidean because the frames don't converge linearly.
   */
  static createRecursiveDoorway(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'recursive-doorway';

    const palette = theme.palette;
    const accent = new THREE.Color(palette.accent);

    const frameCount = 6;
    const baseW = 2.0;
    const baseH = 2.6;
    const baseDepth = 0.12;

    for (let i = 0; i < frameCount; i++) {
      // Non-linear shrinkage so the tunnel feels dreamlike, not geometric.
      const t = i / (frameCount - 1);
      const scale = 1.0 - t * 0.7 - Math.sin(t * Math.PI) * 0.05;
      const w = baseW * scale;
      const h = baseH * scale;
      const zOffset = -i * 0.55;

      // Frame built from four thin boxes (top, bottom, left, right).
      const frameGroup = new THREE.Group();
      frameGroup.position.z = zOffset;

      const frameMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(palette.wall),
        emissive: accent,
        emissiveIntensity: 0.08 + t * 0.15, // deeper frames glow more
        roughness: 0.5,
        metalness: 0.2,
        transparent: true,
        opacity: 0.9 - t * 0.3,
      });

      const thickness = baseDepth * scale;
      const barT = thickness * 0.8;

      // Top
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, barT, thickness), frameMat);
      top.position.y = h / 2;
      frameGroup.add(top);
      // Bottom
      const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, barT, thickness), frameMat);
      bottom.position.y = -h / 2;
      frameGroup.add(bottom);
      // Left
      const left = new THREE.Mesh(new THREE.BoxGeometry(barT, h, thickness), frameMat);
      left.position.x = -w / 2;
      frameGroup.add(left);
      // Right
      const right = new THREE.Mesh(new THREE.BoxGeometry(barT, h, thickness), frameMat);
      right.position.x = w / 2;
      frameGroup.add(right);

      group.add(frameGroup);
    }

    // A faint glowing plane at the far end — the "light at the end".
    const endGeo = new THREE.PlaneGeometry(0.4, 0.5);
    const endMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const endPlane = new THREE.Mesh(endGeo, endMat);
    endPlane.position.z = -(frameCount - 1) * 0.55 - 0.3;
    group.add(endPlane);

    group.frustumCulled = false;
    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;
      // Slow breathing scale — the tunnel pulses as if alive.
      const breathe = 1.0 + Math.sin(now * 0.5) * 0.02;
      group.scale.setScalar(breathe);
      // End plane flickers.
      endMat.opacity = 0.6 + Math.sin(now * 2.0) * 0.2;
      // Subtle rotation so it never quite faces you straight on.
      group.rotation.y = Math.sin(now * 0.15) * 0.08;
    };

    return group;
  }

  // =====================================================================
  //  createImpossibleColumn
  // =====================================================================

  /**
   * A column that twists impossibly — a LatheGeometry whose profile points
   * are rotated by an increasing angle so the surface spirals. The top and
   * bottom don't align: a paradox column. Slightly self-rotating.
   */
  static createImpossibleColumn(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'impossible-column';

    const palette = theme.palette;
    const accent = new THREE.Color(palette.accent);

    // Build a lathe profile, then manually twist the resulting geometry
    // by rotating each vertex ring by an increasing angle around Y.
    const profile: THREE.Vector2[] = [];
    const segments = 14;
    const height = 3.0;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const y = t * height;
      // Radius oscillates — fluted column that swells and narrows.
      const r = 0.28 + Math.sin(t * Math.PI * 2.0) * 0.06;
      profile.push(new THREE.Vector2(r, y));
    }

    const geo = new THREE.LatheGeometry(profile, 12);
    geo.computeVertexNormals();

    // Twist: rotate each vertex by an angle proportional to its height.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const twistTotal = Math.PI * 1.5; // 270° twist over the height
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const angle = (y / height) * twistTotal;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      pos.setX(i, x * cos - z * sin);
      pos.setZ(i, x * sin + z * cos);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const colMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: accent,
      emissiveIntensity: 0.12,
      roughness: 0.6,
      metalness: 0.15,
    });
    const column = new THREE.Mesh(geo, colMat);
    column.name = 'column-body';
    // Offset so the column base sits at y=0 of the group.
    column.position.y = -height / 2;
    group.add(column);

    // Emissive spiral line wrapping the column to emphasise the twist.
    const spiralPoints: THREE.Vector3[] = [];
    const spiralTurns = 3;
    const spiralSegs = 60;
    for (let i = 0; i <= spiralSegs; i++) {
      const t = i / spiralSegs;
      const y = t * height - height / 2;
      const a = t * spiralTurns * Math.PI * 2;
      const r = 0.34 + Math.sin(t * Math.PI * 2.0) * 0.06;
      spiralPoints.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    const spiralGeo = new THREE.BufferGeometry().setFromPoints(spiralPoints);
    const spiralMat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.8,
    });
    const spiral = new THREE.Line(spiralGeo, spiralMat);
    group.add(spiral);

    // Capital (top) and base (bottom) — offset rotationally to sell the paradox.
    const capMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.27,
      roughness: 0.4,
      metalness: 0.3,
    });
    const capGeo = new THREE.CylinderGeometry(0.4, 0.32, 0.18, 12);
    const capital = new THREE.Mesh(capGeo, capMat);
    capital.position.y = height / 2;
    capital.rotation.y = twistTotal; // aligned with the twisted top
    group.add(capital);

    const base = new THREE.Mesh(capGeo.clone(), capMat);
    base.position.y = -height / 2;
    base.rotation.y = 0; // aligned with the untwisted bottom
    group.add(base);

    group.frustumCulled = false;
    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;
      group.rotation.y += 0.1 * dt;
    };

    return group;
  }

  // =====================================================================
  //  createGravityStairs
  // =====================================================================

  /**
   * The Inception "gravity shift" visual: stairs that curve upward, then
   * continue along the ceiling (inverted). Two segments — normal ascending
   * stairs, then a curved transition onto an inverted run on the ceiling.
   */
  static createGravityStairs(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'gravity-stairs';

    const palette = theme.palette;
    const accent = new THREE.Color(palette.accent);

    const stepMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: accent,
      emissiveIntensity: 0.15,
      roughness: 0.7,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    const stepW = 1.0;
    const stepD = 0.7;
    const stepH = 0.16;
    const ascendCount = 7;
    const ceilingCount = 7;
    const ceilingY = ascendCount * stepH + 1.2;

    // Segment 1: normal ascending stairs.
    for (let i = 0; i < ascendCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
      step.position.set(0, i * stepH, i * stepD);
      group.add(step);
    }

    // Transition: a few steps that curve over from wall to ceiling.
    const transCount = 4;
    for (let i = 0; i < transCount; i++) {
      const t = (i + 1) / (transCount + 1);
      const angle = t * Math.PI * 0.5; // 0 → 90°
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
      // Position along an arc from the top of the ascending run to the ceiling.
      const arcCx = 0;
      const arcCy = ascendCount * stepH;
      const arcCz = ascendCount * stepD;
      const arcR = 1.0;
      step.position.set(
        arcCx,
        arcCy + Math.sin(angle) * arcR,
        arcCz + Math.cos(angle) * arcR * 0.4,
      );
      step.rotation.x = -angle;
      group.add(step);
    }

    // Segment 2: inverted stairs along the ceiling — going "up" but upside down.
    for (let i = 0; i < ceilingCount; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), stepMat);
      // Place along the ceiling, receding in +Z, upside down.
      step.position.set(
        0,
        ceilingY,
        ascendCount * stepD + 0.8 + i * stepD,
      );
      step.rotation.x = Math.PI; // flip upside down
      group.add(step);
    }

    // Emissive handrail accent along the ascending run.
    const railPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= ascendCount; i++) {
      railPoints.push(new THREE.Vector3(stepW / 2 + 0.05, i * stepH + 0.3, i * stepD));
    }
    const railGeo = new THREE.BufferGeometry().setFromPoints(railPoints);
    const railMat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.7,
    });
    group.add(new THREE.Line(railGeo, railMat));

    group.frustumCulled = false;
    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;
      // Gentle sway as if gravity itself is uncertain.
      group.rotation.z = Math.sin(now * 0.4) * 0.04;
      group.rotation.y += 0.05 * dt;
    };

    return group;
  }

  // =====================================================================
  //  Tile-integrated impossible structures
  // =====================================================================

  /**
   * A wall that is actually a Penrose staircase ascending the screen.
   * 6-8 BoxGeometry steps are arranged in a vertical zig-zag that recedes
   * slightly into Z. The steps use the layer's wall color with emissive
   * accent edges. Built to fit inside a 1x1 tile.
   */
  static createPenroseWall(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'penrose-wall';

    const palette = theme.palette;
    const wallColor = new THREE.Color(palette.wall);
    const accent = new THREE.Color(palette.accent);

    const stepMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: accent,
      emissiveIntensity: 0.36,
      roughness: 0.7,
      metalness: 0.1,
    });

    const stepGeo = new THREE.BoxGeometry(0.4, 0.13, 0.13);
    const edgeGeo = new THREE.EdgesGeometry(stepGeo);
    const edgeMat = new THREE.LineBasicMaterial({
      color: accent,
      transparent: true,
      opacity: 0.9,
    });

    const steps = 8;
    const stepH = 0.16;
    const xs = [-0.25, 0, 0.25, 0, -0.25, 0, 0.25, 0];
    const stepMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < steps; i++) {
      const mesh = new THREE.Mesh(stepGeo, stepMat);
      mesh.position.set(xs[i], 0.08 + i * stepH, -0.05 - i * 0.02);
      mesh.userData.baseY = mesh.position.y;
      mesh.userData.phase = i * 0.5;

      const edges = new THREE.LineSegments(edgeGeo, edgeMat);
      mesh.add(edges);

      group.add(mesh);
      stepMeshes.push(mesh);
    }

    ImpossibleGeometry.markAsImpossible(group);

    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;

      for (let i = 0; i < stepMeshes.length; i++) {
        const s = stepMeshes[i];
        s.position.y = s.userData.baseY + Math.sin(now * 1.5 + s.userData.phase) * 0.015;
        s.rotation.y = Math.sin(now * 0.5 + s.userData.phase) * 0.05;
      }
      group.rotation.y = Math.sin(now * 0.2) * 0.03;
    };

    return group;
  }

  /**
   * A wall made of 3-4 nested door frames, each smaller and deeper in Z,
   * creating a tunnel-like wall. Thin BoxGeometry frames use the layer's
   * wall color with emissive accent. Fits inside a 1x1 tile.
   */
  static createRecursiveWall(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'recursive-wall';

    const palette = theme.palette;
    const wallColor = new THREE.Color(palette.wall);
    const accent = new THREE.Color(palette.accent);

    const frameCount = 4;
    const baseW = 0.85;
    const baseH = 1.05;
    const baseDepth = 0.05;

    for (let i = 0; i < frameCount; i++) {
      const t = i / (frameCount - 1);
      const scale = 1.0 - t * 0.55;
      const w = baseW * scale;
      const h = baseH * scale;
      const d = baseDepth * scale;
      const z = -i * 0.12;

      const frameGroup = new THREE.Group();
      frameGroup.position.z = z;

      const barT = Math.max(0.03, d * 0.8);
      const frameMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        emissive: accent,
        emissiveIntensity: 0.1 + t * 0.15,
        roughness: 0.7,
        metalness: 0.1,
      });

      const top = new THREE.Mesh(new THREE.BoxGeometry(w, barT, d), frameMat);
      top.position.y = h - barT / 2;
      frameGroup.add(top);

      const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, barT, d), frameMat);
      bottom.position.y = barT / 2;
      frameGroup.add(bottom);

      const left = new THREE.Mesh(new THREE.BoxGeometry(barT, h - 2 * barT, d), frameMat);
      left.position.set(-w / 2 + barT / 2, h / 2, 0);
      frameGroup.add(left);

      const right = new THREE.Mesh(new THREE.BoxGeometry(barT, h - 2 * barT, d), frameMat);
      right.position.set(w / 2 - barT / 2, h / 2, 0);
      frameGroup.add(right);

      group.add(frameGroup);
    }

    ImpossibleGeometry.markAsImpossible(group);

    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;

      const breathe = 1.0 + Math.sin(now * 0.8) * 0.015;
      group.scale.setScalar(breathe);
      group.rotation.y = Math.sin(now * 0.2) * 0.04;
    };

    return group;
  }

  /**
   * A doorway that is also a Penrose staircase leading up and through.
   * The player walks through it, but the steps appear to loop. Built to
   * fit inside a 1x1 tile.
   */
  static createPenroseDoor(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'penrose-door';

    const palette = theme.palette;
    const wallColor = new THREE.Color(palette.wall);
    const accent = new THREE.Color(palette.accent);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: accent,
      emissiveIntensity: 0.21,
      roughness: 0.8,
      metalness: 0.05,
    });

    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const colLeft = new THREE.Mesh(colGeo, stoneMat);
    colLeft.position.set(-0.42, 0.6, 0);
    group.add(colLeft);

    const colRight = new THREE.Mesh(colGeo.clone(), stoneMat);
    colRight.position.set(0.42, 0.6, 0);
    group.add(colRight);

    const lintel = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 16, Math.PI), stoneMat);
    lintel.position.set(0, 1.2, 0);
    group.add(lintel);

    const inner = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.03, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({
        color: accent,
        emissive: accent,
        emissiveIntensity: 0.45,
        roughness: 0.3,
      }),
    );
    inner.position.set(0, 1.2, 0);
    group.add(inner);

    const stepMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: accent,
      emissiveIntensity: 0.36,
      roughness: 0.7,
      metalness: 0.1,
    });
    const stepGeo = new THREE.BoxGeometry(0.5, 0.08, 0.1);
    const stepMeshes: THREE.Mesh[] = [];

    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(stepGeo, stepMat);
      mesh.position.set(0, 0.06 + i * 0.17, -0.08 - i * 0.06);
      mesh.userData.baseZ = mesh.position.z;
      mesh.userData.phase = i * 0.8;

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(stepGeo),
        new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.8 }),
      );
      mesh.add(edges);

      group.add(mesh);
      stepMeshes.push(mesh);
    }

    const markerGeo = new THREE.CircleGeometry(0.3, 16);
    const markerMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.01;
    group.add(marker);

    ImpossibleGeometry.markAsImpossible(group);

    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;

      group.rotation.y += 0.1 * dt;
      for (let i = 0; i < stepMeshes.length; i++) {
        const s = stepMeshes[i];
        s.position.z = s.userData.baseZ + Math.sin(now * 1.2 + s.userData.phase) * 0.02;
      }
      markerMat.emissiveIntensity = 0.35 + Math.sin(now * 2) * 0.1;
    };

    return group;
  }

  /**
   * A doorway where the columns twist 90° at the top and meet an arch.
   * The arch appears to defy gravity by rotating back on itself.
   * Fits inside a 1x1 tile.
   */
  static createGravityArchway(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'gravity-archway';

    const palette = theme.palette;
    const wallColor = new THREE.Color(palette.wall);
    const accent = new THREE.Color(palette.accent);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: accent,
      emissiveIntensity: 0.21,
      roughness: 0.8,
      metalness: 0.05,
    });

    const lowerH = 0.7;
    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, lowerH, 8);
    const leftLower = new THREE.Mesh(colGeo, stoneMat);
    leftLower.position.set(-0.4, lowerH / 2, 0);
    group.add(leftLower);

    const rightLower = new THREE.Mesh(colGeo.clone(), stoneMat);
    rightLower.position.set(0.4, lowerH / 2, 0);
    group.add(rightLower);

    const topH = 0.35;
    const topGeo = new THREE.CylinderGeometry(0.06, 0.06, topH, 8);
    const leftTop = new THREE.Mesh(topGeo, stoneMat);
    leftTop.position.set(-0.2, 0.95, 0);
    leftTop.rotation.z = Math.PI / 2;
    group.add(leftTop);

    const rightTop = new THREE.Mesh(topGeo.clone(), stoneMat);
    rightTop.position.set(0.2, 0.95, 0);
    rightTop.rotation.z = -Math.PI / 2;
    group.add(rightTop);

    const arch = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.07, 8, 16, Math.PI), stoneMat);
    arch.position.set(0, 0.95, 0);
    group.add(arch);

    const ringMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.45,
      roughness: 0.3,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.04, 8, 16, Math.PI * 1.5), ringMat);
    ring.position.set(0, 0.95, 0.05);
    ring.rotation.x = Math.PI / 2;
    ring.rotation.z = Math.PI / 4;
    group.add(ring);

    const markerGeo = new THREE.CircleGeometry(0.3, 16);
    const markerMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.01;
    group.add(marker);

    ImpossibleGeometry.markAsImpossible(group);

    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;

      group.rotation.y += 0.1 * dt;
      ring.rotation.z += 0.5 * dt;
      markerMat.emissiveIntensity = 0.35 + Math.sin(now * 2) * 0.1;
    };

    return group;
  }

  /**
   * A tall impossible tower/spire that stands at the room center.
   * Uses LatheGeometry, CylinderGeometry and TorusGeometry for visual
   * complexity. The base sits on the floor (y=0) and it rises to y=5.
   */
  static createCentralMonolith(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'central-monolith';

    const palette = theme.palette;
    const wallColor = new THREE.Color(palette.wall);
    const accent = new THREE.Color(palette.accent);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.0,
      roughness: 0.7,
      metalness: 0.1,
    });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 16), bodyMat);
    base.position.y = 0.3;
    group.add(base);

    const profile: THREE.Vector2[] = [];
    const segs = 16;
    const height = 7.0;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const y = 0.6 + t * height;
      const r = 1.0 * (1 - t) + 0.04 * Math.sin(t * Math.PI * 5);
      profile.push(new THREE.Vector2(Math.max(0.03, r), y));
    }

    const spireGeo = new THREE.LatheGeometry(profile, 10);
    spireGeo.computeVertexNormals();
    const spire = new THREE.Mesh(spireGeo, bodyMat);
    spire.position.y = 0;
    group.add(spire);

    const ringMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: accent,
      emissiveIntensity: 0.04,
      roughness: 0.3,
      metalness: 0.3,
      transparent: true,
      opacity: 0.65,
    });
    const rings: THREE.Mesh[] = [];

    for (let i = 0; i < 3; i++) {
      const t = (i + 1) / 4;
      const r = 0.85 * (1 - t * 0.6);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 10, 24), ringMat);
      ring.position.y = 1.5 + t * 4.5;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
      rings.push(ring);
    }

    ImpossibleGeometry.markAsImpossible(group);

    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;

      group.rotation.y += 0.15 * dt;
      for (let i = 0; i < rings.length; i++) {
        rings[i].rotation.y += (0.2 + i * 0.1) * dt;
      }
      // Body is unlit stone; pulsing is reserved for the rings.
    };

    return group;
  }

  // =====================================================================
  //  createRandom — convenience picker
  // =====================================================================

  /**
   * Pick a random impossible structure for placement around the room.
   * Returns a fresh THREE.Group each call.
   */
  static createRandom(theme: LayerTheme): THREE.Group {
    const makers: Array<() => THREE.Group> = [
      () => ImpossibleGeometry.createEscherStaircase(theme),
      () => ImpossibleGeometry.createFloatingArch(theme),
      () => ImpossibleGeometry.createRecursiveDoorway(theme),
      () => ImpossibleGeometry.createImpossibleColumn(theme),
      () => ImpossibleGeometry.createGravityStairs(theme),
      () => ImpossibleGeometry.createGravityArchway(theme),
    ];
    const idx = Math.floor(Math.random() * makers.length);
    return makers[idx]();
  }
}
