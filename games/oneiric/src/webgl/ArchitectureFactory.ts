import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { LayerTheme, TileType } from '../types';
import { ImpossibleGeometry } from './ImpossibleGeometry';

// ONEIRIC — Architecture Factory
// Replaces bare BoxGeometry tiles with composed dream architecture.
// Each layer has a distinct geometry vocabulary:
//   classical — arched doorways, fluted columns, beveled stone floors
//   glass     — semi-transparent walls, mirror floors, ring doorways
//   fractured — buckling walls with vertex displacement, broken columns, cracked edges

type Palette = LayerTheme['palette'];

export class ArchitectureFactory {
  // --- Cached shared resources ---

  private static noiseTexture: THREE.CanvasTexture | null = null;

  /** A small grayscale noise canvas used as a bump map for floor surface detail. */
  private static getNoiseTexture(): THREE.CanvasTexture {
    if (ArchitectureFactory.noiseTexture) return ArchitectureFactory.noiseTexture;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      // Mid-range grayscale noise — reads as subtle stone texture under light.
      const v = Math.floor(40 + Math.random() * 160);
      imageData.data[i] = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // Large, slow repeat so the noise reads as stone texture, not grain.
    texture.repeat.set(0.25, 0.25);
    ArchitectureFactory.noiseTexture = texture;
    return texture;
  }

  // =====================================================================
  //  createTile
  // =====================================================================

  /**
   * Build a composed architectural tile.
   * @param tileType  0=floor, 1=wall, 2=door, 3=void
   * @param theme     the layer theme (palette + architectureStyle)
   * @param x         tile grid X (used for per-tile variation)
   * @param z         tile grid Z (used for per-tile variation)
   * @returns Object3D (Mesh or Group) or null for void tiles.
   */
  static createTile(tileType: TileType, theme: LayerTheme, x: number, z: number): THREE.Object3D | null {
    const style = theme.architectureStyle ?? 'classical';
    const palette = theme.palette;

    switch (tileType) {
      case 0:
        return null; // floor is built as a single plane in WorldRenderer
      case 1:
        return ArchitectureFactory.createWall(palette, style, x, z);
      case 2:
        return ArchitectureFactory.createDoor(palette, style);
      case 3:
        return null; // void — no mesh
      default:
        return null;
    }
  }

  // ---------------------------------------------------------------------
  //  Floor (tileType 0)
  // ---------------------------------------------------------------------

  private static createFloor(palette: Palette, style: string, tileX: number, tileZ: number): THREE.Mesh {
    // Beveled stone slab — tiles touch with rounded edges so the floor reads
    // as continuous cut stone, not a checkerboard. Subtle height/color
    // variation breaks the flatness without creating a grid.
    const height = 0.08;
    const geo = new RoundedBoxGeometry(1.0, height, 1.0, 2, 0.04);

    const isGlass = style === 'glass';
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.floor),
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0.25,
      roughness: isGlass ? 0.05 : 0.92,
      metalness: isGlass ? 0.6 : 0.05,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = height / 2 - 0.05;
    mesh.name = 'tile-floor';
    return mesh;
  }

  // ---------------------------------------------------------------------
  //  Wall (tileType 1)
  // ---------------------------------------------------------------------

  private static createWall(palette: Palette, style: string, tileX: number, tileZ: number): THREE.Object3D {
    switch (style) {
      case 'glass':
        return ArchitectureFactory.createGlassWall(palette);
      case 'fractured':
        return ArchitectureFactory.createFracturedWall(palette, tileX, tileZ);
      default:
        return ArchitectureFactory.createClassicalWall(palette);
    }
  }

  /** Classical wall: tall extruded arch profile + fluted columns at each end. */
  private static createClassicalWall(palette: Palette): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tile-wall';

    const h = 2.2;
    const top = 2.6;

    // --- Arch profile: rectangular with a rounded (arched) top ---
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0);
    shape.lineTo(-0.5, h);
    shape.quadraticCurveTo(-0.5, top, 0, top);
    shape.quadraticCurveTo(0.5, top, 0.5, h);
    shape.lineTo(0.5, 0);
    shape.closePath();

    const wallGeo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
    wallGeo.translate(0, 0, -0.5); // centre on Z so the tile sits at origin

    const wallMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.35,
      roughness: 0.9,
      metalness: 0.05,
    });
    group.add(new THREE.Mesh(wallGeo, wallMat));

    // --- Stone plinth / base that gives the wall a foundation and hides the
    //     void below when the room floats. Extends slightly outside the tile. ---
    const plinthGeo = new THREE.BoxGeometry(1.05, 2.4, 1.05);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.25,
      roughness: 0.95,
      metalness: 0.0,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -1.2;
    group.add(plinth);

    // --- Fluted columns at each end (base wider → shaft narrow → capital wider) ---
    const colProfile = [
      new THREE.Vector2(0.13, 0.0),  // base outer
      new THREE.Vector2(0.13, 0.08), // base
      new THREE.Vector2(0.07, 0.16), // transition to shaft
      new THREE.Vector2(0.07, h - 0.1), // shaft
      new THREE.Vector2(0.13, h), // capital
      new THREE.Vector2(0.13, top - 0.1),  // capital top
    ];
    const colGeo = new THREE.LatheGeometry(colProfile, 8);
    const colMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
      roughness: 0.7,
      metalness: 0.1,
    });

    const colLeft = new THREE.Mesh(colGeo, colMat);
    colLeft.position.set(-0.5, 0, 0);
    group.add(colLeft);

    const colRight = new THREE.Mesh(colGeo.clone(), colMat);
    colRight.position.set(0.5, 0, 0);
    group.add(colRight);

    return group;
  }

  /** Glass wall: tall semi-transparent physical material + thin accent column. */
  private static createGlassWall(palette: Palette): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tile-wall';

    const h = 2.4;
    const geo = new THREE.BoxGeometry(1, h, 1);
    const mat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
      transmission: 0.6,
      roughness: 0.15,
      thickness: 0.3,
      transparent: true,
      opacity: 0.7,
      ior: 1.4,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    group.add(mesh);

    // Glass plinth / base.
    const plinthGeo = new THREE.BoxGeometry(1.05, 2.4, 1.05);
    const plinthMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.25,
      transmission: 0.4,
      roughness: 0.2,
      thickness: 0.2,
      transparent: true,
      opacity: 0.6,
      ior: 1.4,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -1.2;
    group.add(plinth);

    // Thin twisted column accent at one edge.
    const colGeo = new THREE.CylinderGeometry(0.06, 0.06, h, 6);
    const colMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.4,
    });
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(0.45, h / 2, 0);
    group.add(col);

    return group;
  }

  /** Fractured wall: tall vertex-displaced box + emissive crack lines. */
  private static createFracturedWall(palette: Palette, tileX: number, tileZ: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tile-wall';

    const h = 2.2;
    const geo = new THREE.BoxGeometry(1, h, 1);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const phase = tileX * 0.7 + tileZ * 0.5;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const disp = Math.sin(vx * 4 + vy * 3 + phase) * 0.15;
      pos.setX(i, vx + disp);
      pos.setZ(i, vz + disp * 0.5);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.35,
      roughness: 0.9,
      metalness: 0.05,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = h / 2;
    group.add(mesh);

    // Fractured stone plinth / base.
    const plinthGeo = new THREE.BoxGeometry(1.05, 2.4, 1.05);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.25,
      roughness: 0.95,
      metalness: 0.0,
    });
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.y = -1.2;
    group.add(plinth);

    // Emissive crack lines along displaced edges.
    const edges = new THREE.EdgesGeometry(geo);
    const lineMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0.5,
    });
    const lines = new THREE.LineSegments(edges, lineMat);
    lines.position.y = h / 2;
    group.add(lines);

    return group;
  }

  // ---------------------------------------------------------------------
  //  Door (tileType 2)
  // ---------------------------------------------------------------------

  private static createDoor(palette: Palette, style: string): THREE.Object3D {
    switch (style) {
      case 'glass':
        return ArchitectureFactory.createGlassDoor(palette);
      case 'fractured':
        return ArchitectureFactory.createFracturedDoor(palette);
      default:
        return ArchitectureFactory.createClassicalDoor(palette);
    }
  }

  /** Classical door: tall two columns + half-arch lintel + accent inner frame. */
  private static createClassicalDoor(palette: Palette): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tile-door';

    const h = 2.2;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.35,
      roughness: 0.8,
    });

    // Two columns.
    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, h, 8);
    const colLeft = new THREE.Mesh(colGeo, stoneMat);
    colLeft.position.set(-0.5, h / 2, 0);
    group.add(colLeft);
    const colRight = new THREE.Mesh(colGeo.clone(), stoneMat);
    colRight.position.set(0.5, h / 2, 0);
    group.add(colRight);

    // Half-arch lintel on top.
    const lintelGeo = new THREE.TorusGeometry(0.5, 0.06, 8, 16, Math.PI);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.position.set(0, h, 0);
    group.add(lintel);

    // Inner frame — accent.
    const innerGeo = new THREE.TorusGeometry(0.42, 0.03, 8, 16, Math.PI);
    const innerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(0, h, 0);
    group.add(inner);

    // Subtle floor marker.
    // Floor marker removed — door columns/arch are enough to identify exits.

    return group;
  }

  /** Glass door: a tall ring you step through. */
  private static createGlassDoor(palette: Palette): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tile-door';

    const h = 1.8;
    const ringGeo = new THREE.TorusGeometry(0.55, 0.08, 12, 32);
    const ringMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.2,
      transmission: 0.3,
      roughness: 0.1,
      metalness: 0.5,
      transparent: true,
      opacity: 0.85,
      ior: 1.4,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, h, 0);
    ring.scale.set(1, 1.5, 1);
    group.add(ring);

    // Inner glow ring.
    const innerGeo = new THREE.TorusGeometry(0.45, 0.02, 8, 32);
    const innerMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.6,
    });
    const inner = new THREE.Mesh(innerGeo, innerMat);
    inner.position.set(0, h, 0);
    group.add(inner);

    // Floor marker removed — door columns/arch are enough to identify exits.

    return group;
  }

  /** Fractured door: broken arch — straight left column, tilted right column, cracked lintel. */
  private static createFracturedDoor(palette: Palette): THREE.Group {
    const group = new THREE.Group();
    group.name = 'tile-door';

    const h = 2.2;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.wall),
      emissiveIntensity: 0.35,
      roughness: 0.9,
    });
    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, h, 8);

    // Left column — straight.
    const colLeft = new THREE.Mesh(colGeo, stoneMat);
    colLeft.position.set(-0.5, h / 2, 0);
    group.add(colLeft);

    // Right column — tilted 15°.
    const colRight = new THREE.Mesh(colGeo.clone(), stoneMat);
    colRight.position.set(0.5, h / 2 - 0.05, 0);
    colRight.rotation.z = THREE.MathUtils.degToRad(15);
    group.add(colRight);

    // Cracked lintel — two half-torus pieces with a gap.
    const lintelMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
      roughness: 0.8,
    });
    const leftLintel = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.06, 8, 12, Math.PI),
      lintelMat,
    );
    leftLintel.position.set(-0.3, h, 0);
    group.add(leftLintel);

    const rightLintel = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.06, 8, 12, Math.PI),
      lintelMat,
    );
    rightLintel.position.set(0.3, h, 0);
    group.add(rightLintel);

    // Emissive crack lines on the straight column.
    const crackMat = new THREE.LineBasicMaterial({
      color: new THREE.Color(palette.accent),
      transparent: true,
      opacity: 0.4,
    });
    const leftEdges = new THREE.EdgesGeometry(colGeo);
    const leftLines = new THREE.LineSegments(leftEdges, crackMat);
    leftLines.position.copy(colLeft.position);
    group.add(leftLines);

    // Floor marker removed.

    return group;
  }

  // =====================================================================
  //  createFloatingArchitecture
  // =====================================================================

  /**
   * Floating ceiling fragments above the room — a broken impossible ceiling
   * that makes the space feel enclosed, not a platform in the void.
   */
  static createFloatingArchitecture(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'floating-architecture';

    const palette = theme.palette;
    const wallColor = new THREE.Color(palette.wall);

    // 6-8 fragments above the room, not in the void beyond.
    const positions = [
      { x: -14, y: 6.5, z: -10 },
      { x: 14, y: 7.0, z: -8 },
      { x: -10, y: 5.5, z: 8 },
      { x: 12, y: 6.0, z: 10 },
      { x: 0, y: 7.5, z: 0 },
      { x: -8, y: 6.0, z: -4 },
      { x: 8, y: 5.5, z: 4 },
    ];

    const fragMat = new THREE.MeshStandardMaterial({
      color: wallColor,
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.25,
      roughness: 0.6,
      metalness: 0.1,
    });

    for (let i = 0; i < positions.length; i++) {
      const frag = ArchitectureFactory.createFloatingFragment(wallColor, i);
      (frag as THREE.Mesh).material = fragMat;
      const p = positions[i];
      frag.position.set(p.x, p.y, p.z);
      frag.scale.setScalar(1.4 + Math.random() * 0.4);
      frag.userData.rotSpeed = 0.05 + Math.random() * 0.1;
      frag.userData.lastTime = performance.now() / 1000;
      frag.frustumCulled = false;

      frag.onBeforeRender = () => {
        const now = performance.now() / 1000;
        const dt = now - (frag.userData.lastTime as number);
        frag.userData.lastTime = now;
        frag.rotation.y += (frag.userData.rotSpeed as number) * dt;
      };

      group.add(frag);
    }

    return group;
  }

  private static createFloatingFragment(accent: THREE.Color, seed: number): THREE.Object3D {
    const mat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.4,
      roughness: 0.4,
      metalness: 0.2,
    });

    if (seed % 2 === 0) {
      // Broken column segment.
      const profile = [
        new THREE.Vector2(0.12, 0.0),
        new THREE.Vector2(0.12, 0.3),
        new THREE.Vector2(0.08, 0.4),
        new THREE.Vector2(0.08, 0.7),
        new THREE.Vector2(0.14, 0.8),
        new THREE.Vector2(0.14, 0.9),
      ];
      const geo = new THREE.LatheGeometry(profile, 8);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'float-column';
      return mesh;
    } else {
      // Partial arch piece.
      const geo = new THREE.TorusGeometry(0.5, 0.08, 8, 16, Math.PI * 0.6);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = 'float-arch';
      mesh.rotation.x = Math.PI / 2;
      return mesh;
    }
  }

  // =====================================================================
  //  createImpossibleElements
  // =====================================================================

  /**
   * Spawn 2-3 impossible geometry objects (Escher stairs, recursive
   * doorways, paradox columns, gravity stairs, floating arches) at random
   * positions around the room perimeter, plus one large central impossible
   * feature. Each is self-animating and frustumCulled=false so it never pops out.
   */
  static createImpossibleElements(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'impossible-elements';
    group.frustumCulled = false;

    // --- Central stylized impossible tower only ---
    // Corner towers were removed because they made the room feel compact.
    const central = ArchitectureFactory.createCentralFeature(theme);
    central.position.set(0, 0, 0);
    group.add(central);

    return group;
  }

  // =====================================================================
  //  createCentralFeature
  // =====================================================================

  /**
   * Spawns one large stylized tower at the room center.
   * A simple low-poly impossible tower that reads as the room's focal point.
   */
  static createCentralFeature(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'central-feature';

    const palette = theme.palette;
    const bodyMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.wall), side: THREE.DoubleSide });
    const accentMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(palette.accent), side: THREE.DoubleSide });

    // Sculpted tower profile (lathe) — a tapered tower with curves and steps.
    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.2, 0),
      new THREE.Vector2(1.0, 0.3),
      new THREE.Vector2(0.9, 0.9),
      new THREE.Vector2(0.55, 1.6),
      new THREE.Vector2(0.75, 2.0),
      new THREE.Vector2(0.45, 2.6),
      new THREE.Vector2(0.55, 3.0),
      new THREE.Vector2(0.3, 3.6),
      new THREE.Vector2(0.4, 4.2),
      new THREE.Vector2(0.15, 4.8),
      new THREE.Vector2(0, 4.9),
    ];
    const tower = new THREE.Mesh(new THREE.LatheGeometry(profile, 24), bodyMat);
    tower.name = 'tower';
    group.add(tower);

    // Accent bands on the tower.
    const bandY = [0.5, 1.7, 2.8, 4.1];
    for (const y of bandY) {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.045, 6, 24), accentMat);
      band.position.y = y;
      band.rotation.x = Math.PI / 2;
      band.name = 'tower-band';
      group.add(band);
    }

    // Rotating top ring.
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 8, 24), accentMat);
    ring.position.y = 5.1;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    let lastTime = performance.now() / 1000;
    group.onBeforeRender = () => {
      const now = performance.now() / 1000;
      const dt = now - lastTime;
      lastTime = now;
      ring.rotation.z += 0.5 * dt;
      group.rotation.y += 0.05 * dt;
    };

    group.frustumCulled = false;
    return group;
  }

  // =====================================================================
  //  createDissolveMaterial
  // =====================================================================

  /**
   * A ShaderMaterial with a dissolve effect.
   * - dissolveThreshold 0.0 = fully visible, 1.0 = fully dissolved.
   * - Fragments where noise < threshold are discarded.
   * - Fragments near the threshold get an emissive accent edge glow.
   */
  static createDissolveMaterial(theme: LayerTheme): THREE.ShaderMaterial {
    const palette = theme.palette;
    const accentColor = new THREE.Color(palette.accent);
    const baseColor = new THREE.Color(palette.wall);

    return new THREE.ShaderMaterial({
      uniforms: {
        dissolveThreshold: { value: 0.0 },
        accentColor: { value: accentColor },
        baseColor: { value: baseColor },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float dissolveThreshold;
        uniform vec3 accentColor;
        uniform vec3 baseColor;
        varying vec3 vWorldPos;

        void main() {
          // Cheap 3D noise — no texture lookup needed.
          float noise = sin(vWorldPos.x * 10.0)
                      * sin(vWorldPos.y * 10.0)
                      * sin(vWorldPos.z * 10.0) * 0.5 + 0.5;

          // Discard dissolved fragments.
          if (noise < dissolveThreshold) discard;

          // Edge glow: fragments near the threshold glow with accent color.
          float edge = 1.0 - smoothstep(dissolveThreshold, dissolveThreshold + 0.08, noise);
          vec3 color = mix(baseColor, accentColor, edge);
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true,
    });
  }

  // =====================================================================
  //  Shared helpers
  // =====================================================================

  /** Add a subtle raised ring on the floor to mark a doorway. */
  private static addFloorMarker(
    group: THREE.Group,
    palette: Palette,
    radius: number,
    _opacity: number,
    _intensity: number,
  ): void {
    const geo = new THREE.TorusGeometry(radius, 0.04, 6, 24);
    const mat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.accent),
      emissive: new THREE.Color(palette.accent),
      emissiveIntensity: 0.35,
      roughness: 0.4,
      metalness: 0.3,
    });
    const marker = new THREE.Mesh(geo, mat);
    marker.rotation.x = -Math.PI / 2;
    marker.position.y = 0.05;
    group.add(marker);
  }

  // =====================================================================
  //  Surreal Void & Brutalist Dream Architecture
  // =====================================================================

  /** A surreal brutalist void that frames the dream room without cartoonish diorama props. */
  static createSurrealVoid(theme: LayerTheme): THREE.Group {
    const group = new THREE.Group();
    group.name = 'surreal-void';
    const palette = theme.palette;
    const accentColor = new THREE.Color(palette.accent);

    // 1. Lower Subterranean Energy Rift Plane (Ethereal stylized water/void grid)
    const riftGeo = new THREE.CylinderGeometry(52, 58, 2.0, 48);
    const riftMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.bg).multiplyScalar(0.2),
      emissive: new THREE.Color(palette.accent).multiplyScalar(0.15),
      roughness: 0.2,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const rift = new THREE.Mesh(riftGeo, riftMat);
    rift.position.y = -4.5;
    group.add(rift);

    // 2. Multi-Tiered Terraced Foundation Plinth
    // Tier 1 (Base platform)
    const baseColor = new THREE.Color(palette.bg).multiplyScalar(0.35);
    const baseGeo = new THREE.CylinderGeometry(36, 40, 2.5, 36);
    const baseMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.85,
      metalness: 0.15,
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = -2.25;
    group.add(base);

    // Tier 2 (Inner terrace with glowing edge trim)
    const terraceGeo = new THREE.CylinderGeometry(28, 30, 0.6, 32);
    const terraceMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall).multiplyScalar(0.55),
      roughness: 0.75,
      metalness: 0.2,
    });
    const terrace = new THREE.Mesh(terraceGeo, terraceMat);
    terrace.position.y = -0.7;
    group.add(terrace);

    // Glowing perimeter trim around terrace
    const trimGeo = new THREE.TorusGeometry(28.2, 0.08, 6, 48);
    const trimMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.75,
    });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.rotation.x = -Math.PI / 2;
    trim.position.y = -0.4;
    group.add(trim);

    // 3. Glowing concentric horizon rings floating in the void perimeter
    for (let r = 0; r < 3; r++) {
      const radius = 24 + r * 7;
      const ringGeo = new THREE.TorusGeometry(radius, 0.1, 6, 48);
      const ringMat = new THREE.MeshStandardMaterial({
        color: accentColor,
        emissive: accentColor,
        emissiveIntensity: 0.45 - r * 0.1,
        transparent: true,
        opacity: 0.65 - r * 0.15,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.3 - r * 0.4;
      ring.name = `horizon-ring-${r}`;
      group.add(ring);
    }

    // 4. Floating fragmented brutalist obelisks and beacon monoliths
    const slabMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall).multiplyScalar(0.7),
      roughness: 0.8,
      metalness: 0.25,
    });

    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const dist = 20 + (i % 3) * 6;
      const height = 2.5 + Math.random() * 6.0;
      const slabGeo = new RoundedBoxGeometry(
        1.6 + Math.random() * 1.8,
        height,
        1.6 + Math.random() * 1.8,
        2,
        0.08,
      );
      const slab = new THREE.Mesh(slabGeo, slabMat);
      slab.position.set(
        Math.cos(angle) * dist,
        height / 2 - 2.0 + (Math.random() - 0.5) * 1.2,
        Math.sin(angle) * dist,
      );
      slab.rotation.set(
        (Math.random() - 0.5) * 0.15,
        angle + Math.PI / 4,
        (Math.random() - 0.5) * 0.15,
      );
      slab.name = `floating-slab-${i}`;
      group.add(slab);
    }

    return group;
  }

  /** An imposing monolithic brutalist pillar with glowing vertical light slits and lantern beacon. */
  static createBrutalistMonolith(theme: LayerTheme, scale = 1.0): THREE.Group {
    const group = new THREE.Group();
    group.name = 'brutalist-monolith';
    const palette = theme.palette;
    const accentColor = new THREE.Color(palette.accent);

    const wallColor = new THREE.Color(palette.wall).multiplyScalar(0.75);
    const mat = new THREE.MeshStandardMaterial({
      color: wallColor,
      roughness: 0.8,
      metalness: 0.2,
    });

    const height = 13 * scale;
    const width = 1.4 * scale;
    const geo = new RoundedBoxGeometry(width, height, width, 2, 0.08);
    const pillar = new THREE.Mesh(geo, mat);
    pillar.position.y = height / 2 - 0.5;
    group.add(pillar);

    // Dual glowing vertical inset light slits
    const slitMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.9,
    });
    const slitGeo = new THREE.BoxGeometry(0.14 * scale, height * 0.75, width * 1.02);
    const slit = new THREE.Mesh(slitGeo, slitMat);
    slit.position.y = height / 2;
    group.add(slit);

    // Top beacon luminary cap
    const capGeo = new THREE.BoxGeometry(width * 1.15, 0.4 * scale, width * 1.15);
    const cap = new THREE.Mesh(capGeo, slitMat);
    cap.position.y = height - 0.3;
    group.add(cap);

    return group;
  }

  /** An impossible floating stone archway overlooking the void with glowing portal horizon. */
  static createFloatingArch(theme: LayerTheme, scale = 1.0): THREE.Group {
    const group = new THREE.Group();
    group.name = 'floating-arch';
    const palette = theme.palette;
    const accentColor = new THREE.Color(palette.accent);

    const archMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.wall).multiplyScalar(0.8),
      roughness: 0.75,
      metalness: 0.25,
    });

    const height = 6.5 * scale;
    const span = 4.2 * scale;
    const postGeo = new RoundedBoxGeometry(0.85 * scale, height, 0.85 * scale, 2, 0.06);

    // Left post
    const left = new THREE.Mesh(postGeo, archMat);
    left.position.set(-span / 2, height / 2, 0);
    group.add(left);

    // Right post
    const right = new THREE.Mesh(postGeo, archMat);
    right.position.set(span / 2, height / 2, 0);
    group.add(right);

    // Lintel header
    const lintelGeo = new RoundedBoxGeometry(span + 1.4 * scale, 0.85 * scale, 0.95 * scale, 2, 0.06);
    const lintel = new THREE.Mesh(lintelGeo, archMat);
    lintel.position.set(0, height, 0);
    group.add(lintel);

    // Inner glowing portal plane
    const glowMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.7,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const glowGeo = new THREE.PlaneGeometry(span - 0.3 * scale, height - 0.4 * scale);
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, height / 2, 0);
    group.add(glow);

    return group;
  }

  /**
   * Interactive Gateway Portal Doorway for the 3D Architect's Antechamber.
   * Features monolithic brutalist pillars, target-tinted glowing portal horizon,
   * illuminated lintel rune plate, and a glowing threshold step.
   */
  static createGatewayPortal(
    theme: LayerTheme,
    target: { name: string; portraitColor?: string },
    label: string,
    scale = 1.0,
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `gateway-portal-${label}`;

    const colorHex = target.portraitColor || theme.palette.accent;
    const targetColor = new THREE.Color(colorHex);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(theme.palette.wall).multiplyScalar(0.75),
      roughness: 0.8,
      metalness: 0.2,
    });

    const glowMat = new THREE.MeshStandardMaterial({
      color: targetColor,
      emissive: targetColor,
      emissiveIntensity: 0.85,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    });

    const borderGlowMat = new THREE.MeshStandardMaterial({
      color: targetColor,
      emissive: targetColor,
      emissiveIntensity: 0.95,
    });

    const height = 7.0 * scale;
    const span = 4.8 * scale;
    const postW = 1.0 * scale;
    const postGeo = new RoundedBoxGeometry(postW, height, postW, 2, 0.08);

    // Left pillar
    const left = new THREE.Mesh(postGeo, stoneMat);
    left.position.set(-span / 2, height / 2, 0);
    group.add(left);

    // Left pillar glowing inset slit
    const slitGeo = new THREE.BoxGeometry(0.12 * scale, height * 0.8, postW * 1.04);
    const leftSlit = new THREE.Mesh(slitGeo, borderGlowMat);
    leftSlit.position.set(-span / 2, height / 2, 0);
    group.add(leftSlit);

    // Right pillar
    const right = new THREE.Mesh(postGeo, stoneMat);
    right.position.set(span / 2, height / 2, 0);
    group.add(right);

    // Right pillar glowing inset slit
    const rightSlit = new THREE.Mesh(slitGeo, borderGlowMat);
    rightSlit.position.set(span / 2, height / 2, 0);
    group.add(rightSlit);

    // Overhead lintel beam
    const lintelGeo = new RoundedBoxGeometry(span + postW * 1.5, 1.1 * scale, postW * 1.2, 2, 0.08);
    const lintel = new THREE.Mesh(lintelGeo, stoneMat);
    lintel.position.set(0, height + 0.5 * scale, 0);
    group.add(lintel);

    // Lintel glowing banner plate
    const bannerGeo = new THREE.BoxGeometry(span * 0.85, 0.25 * scale, postW * 1.25);
    const banner = new THREE.Mesh(bannerGeo, borderGlowMat);
    banner.position.set(0, height + 0.5 * scale, 0);
    group.add(banner);

    // Inner glowing portal energy horizon
    const portalPlaneGeo = new THREE.PlaneGeometry(span - postW * 0.8, height);
    const portalPlane = new THREE.Mesh(portalPlaneGeo, glowMat);
    portalPlane.position.set(0, height / 2, 0);
    group.add(portalPlane);

    // Threshold step on the floor
    const stepGeo = new RoundedBoxGeometry(span * 0.9, 0.15 * scale, 2.0 * scale, 2, 0.04);
    const step = new THREE.Mesh(stepGeo, glowMat);
    step.position.set(0, 0.08, 0.8 * scale);
    group.add(step);

    // Floating beacon above the arch
    const beaconGeo = new THREE.OctahedronGeometry(0.5 * scale);
    const beacon = new THREE.Mesh(beaconGeo, borderGlowMat);
    beacon.position.set(0, height + 1.8 * scale, 0);
    beacon.name = 'portal-beacon';
    group.add(beacon);

    return group;
  }

  /** Memory resonance 3D visual object with glowing halo. */
  static createMemoryResonanceVisual(
    kind: string,
    theme: LayerTheme,
    resonated: boolean = false,
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `memory-${kind}`;
    const palette = theme.palette;

    const accentColor = new THREE.Color(palette.accent);
    const propMat = new THREE.MeshStandardMaterial({
      color: resonated ? accentColor : new THREE.Color(palette.fg),
      emissive: resonated ? accentColor : new THREE.Color(0x221100),
      emissiveIntensity: resonated ? 0.7 : 0.2,
      roughness: 0.4,
      metalness: 0.5,
    });

    // Base glowing halo ring on the floor
    const haloGeo = new THREE.TorusGeometry(0.65, 0.03, 6, 24);
    const haloMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: resonated ? 0.9 : 0.4,
      transparent: true,
      opacity: resonated ? 0.8 : 0.4,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.04;
    halo.name = 'resonance-halo';
    group.add(halo);

    // Geometry based on memory kind
    switch (kind) {
      case 'chair': {
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.5), propMat);
        seat.position.y = 0.4;
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.06), propMat);
        back.position.set(0, 0.7, -0.22);
        group.add(back);
        break;
      }
      case 'mirror': {
        const frame = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 24), propMat);
        frame.position.y = 0.6;
        group.add(frame);
        const glass = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), propMat);
        glass.position.y = 0.6;
        group.add(glass);
        break;
      }
      case 'clock': {
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.1, 16), propMat);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.6;
        group.add(body);
        break;
      }
      case 'desk': {
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 0.5), propMat);
        top.position.y = 0.5;
        group.add(top);
        break;
      }
      case 'toy': {
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.4, 12), propMat);
        top.rotation.x = Math.PI;
        top.position.y = 0.5;
        group.add(top);
        break;
      }
      default: {
        const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), propMat);
        orb.position.y = 0.5;
        group.add(orb);
        break;
      }
    }

    return group;
  }
}
