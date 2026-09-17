import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import type { LayerTheme, MemoryObjectKind } from '../types';

// ONEIRIC — Character & prop factory
// All geometry is procedural and composed into expressive silhouettes.
// The player's lantern is the primary light source — the world is dark by design.

export interface TileTheme {
  wall: string;
  floor: string;
  accent: string;
}

// --- Shared helpers ---

function standardMaterial(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.85,
    metalness: 0.05,
    ...opts,
  });
}

function emissiveMaterial(color: string, emissiveIntensity = 1.0, opts: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    emissive: new THREE.Color(color),
    emissiveIntensity,
    roughness: 0.4,
    metalness: 0.1,
    ...opts,
  });
}

// --- Flat unlit prop materials for clear diorama readability ---
function propMaterial(color: string, accent?: string, glow = 0.0): THREE.MeshBasicMaterial {
  const col = new THREE.Color(color);
  if (accent && glow > 0) col.lerp(new THREE.Color(accent), glow);
  return new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
}

function propGlowMaterial(color: string, accent: string, glow = 0.35): THREE.MeshBasicMaterial {
  const col = new THREE.Color(color).lerp(new THREE.Color(accent), glow);
  return new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide });
}

/** Make a canvas texture from a 2D draw callback. */
function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

export class CharacterFactory {
  // --- Player: hooded dreamer with a warm lantern and a 3D totem ---

  // Returns a Group (compatible with WorldRenderer). The lantern PointLight is
  // named 'lanternLight' and the 3D totem is named 'totemMesh' so callers can
  // find them via getObjectByName. They are also attached as properties
  // (group.userData.lanternLight / group.userData.totemMesh) for convenience.
  static createPlayer(
    color: string,
    totemType: 'top' | 'coin' | 'ring' = 'top',
    palette?: LayerTheme['palette'],
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'player';

    const coatColor = new THREE.Color(palette?.wall ?? color).multiplyScalar(0.9);
    const skinColor = new THREE.Color(color).lerp(coatColor, 0.42);
    const bootColor = new THREE.Color(palette?.floor ?? '#4a3a2a');
    const hatColor = new THREE.Color(palette?.accent ?? color);
    const darkColor = new THREE.Color(0x151515);

    const skinMat = new THREE.MeshBasicMaterial({ color: skinColor, side: THREE.DoubleSide });
    const coatMat = new THREE.MeshBasicMaterial({ color: coatColor, side: THREE.DoubleSide });
    const bootMat = new THREE.MeshBasicMaterial({ color: bootColor, side: THREE.DoubleSide });
    const hatMat = new THREE.MeshBasicMaterial({ color: hatColor, side: THREE.DoubleSide });
    const darkMat = new THREE.MeshBasicMaterial({ color: darkColor, side: THREE.DoubleSide });

    // --- Sculpted coat (lathe profile) ---
    const coatProfile = [
      new THREE.Vector2(0.42, 0),
      new THREE.Vector2(0.44, 0.08),
      new THREE.Vector2(0.38, 0.35),
      new THREE.Vector2(0.30, 0.55),
      new THREE.Vector2(0.26, 0.75),
      new THREE.Vector2(0.30, 0.95),
      new THREE.Vector2(0.20, 1.08),
      new THREE.Vector2(0, 1.10),
    ];
    const coat = new THREE.Mesh(new THREE.LatheGeometry(coatProfile, 24), coatMat);
    coat.name = 'coat';
    group.add(coat);

    // Coat buttons.
    const buttonGeo = new THREE.SphereGeometry(0.025, 8, 8);
    for (let i = 0; i < 3; i++) {
      const button = new THREE.Mesh(buttonGeo, hatMat);
      button.position.set(0, 0.85 - i * 0.15, 0.26);
      button.name = `button${i}`;
      group.add(button);
    }

    // --- Head group ---
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.08;
    headGroup.name = 'headGroup';

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), skinMat);
    head.name = 'head';
    headGroup.add(head);

    // No painted face/ears/hair — clean head + hat silhouette avoids panda/skull look.

    // Sculpted hat (brim + pointed crown via lathe).
    const hatProfile = [
      new THREE.Vector2(0, 1.10),
      new THREE.Vector2(0.10, 1.08),
      new THREE.Vector2(0.36, 1.06),
      new THREE.Vector2(0.14, 1.22),
      new THREE.Vector2(0, 1.55),
    ];
    const hat = new THREE.Mesh(new THREE.LatheGeometry(hatProfile, 24), hatMat);
    hat.name = 'hat';
    headGroup.add(hat);

    // Scarf / collar.
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 6, 20, Math.PI * 2), hatMat);
    scarf.position.y = -0.12;
    scarf.rotation.x = Math.PI / 2;
    scarf.name = 'scarf';
    headGroup.add(scarf);

    group.add(headGroup);

    // --- Arms & hands ---
    function addLimb(start: THREE.Vector3, end: THREE.Vector3, radius: number, mat: THREE.Material) {
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();
      const geo = new THREE.CapsuleGeometry(radius, len, 4, 8);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(start).add(dir.clone().multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      return mesh;
    }

    const leftHandPos = new THREE.Vector3(-0.32, 0.55, 0.10);
    const rightHandPos = new THREE.Vector3(0.32, 0.55, 0.10);
    const leftShoulder = new THREE.Vector3(-0.20, 0.95, 0);
    const rightShoulder = new THREE.Vector3(0.20, 0.95, 0);

    const leftArm = addLimb(leftShoulder, leftHandPos, 0.05, skinMat);
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = addLimb(rightShoulder, rightHandPos, 0.05, skinMat);
    rightArm.name = 'rightArm';
    group.add(rightArm);

    const gloveGeo = new THREE.SphereGeometry(0.055, 12, 10);
    const leftGlove = new THREE.Mesh(gloveGeo, skinMat);
    leftGlove.position.copy(leftHandPos);
    leftGlove.name = 'leftGlove';
    group.add(leftGlove);
    const rightGlove = new THREE.Mesh(gloveGeo, skinMat);
    rightGlove.position.copy(rightHandPos);
    rightGlove.name = 'rightGlove';
    group.add(rightGlove);

    // --- Basket in the left hand ---
    const basketGroup = new THREE.Group();
    basketGroup.position.copy(leftHandPos);
    basketGroup.position.y -= 0.08;
    basketGroup.name = 'basket';

    const basketMat = new THREE.MeshBasicMaterial({ color: bootColor, side: THREE.DoubleSide });
    const basketBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 0.15, 14, 1, true), basketMat);
    basketBody.position.y = 0.07;
    basketGroup.add(basketBody);

    const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 4, 18, Math.PI * 2), basketMat);
    basketRim.position.y = 0.14;
    basketRim.rotation.x = Math.PI / 2;
    basketGroup.add(basketRim);

    group.add(basketGroup);

    // --- Totem held in the right hand where it spins and is visible ---
    const totemColor = '#' + skinColor.clone().lerp(new THREE.Color(0xffffff), 0.5).getHexString();
    const totemMesh = CharacterFactory.createTotem3D(totemType, totemColor);
    totemMesh.position.copy(rightHandPos);
    totemMesh.position.y += 0.22;
    totemMesh.userData.baseY = rightHandPos.y + 0.22;
    totemMesh.scale.setScalar(1.3);
    totemMesh.name = 'totemMesh';
    group.add(totemMesh);

    // Empty lantern group kept for WorldRenderer bobbing compatibility.
    const lanternGroup = new THREE.Group();
    lanternGroup.name = 'lantern';
    lanternGroup.position.copy(rightHandPos);
    group.add(lanternGroup);

    // --- Legs & boots ---
    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.30, 4, 8), bootMat);
    leftLeg.position.set(-0.10, 0.18, 0);
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);
    const rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.30, 4, 8), bootMat);
    rightLeg.position.set(0.10, 0.18, 0);
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    const bootGeo = new THREE.BoxGeometry(0.11, 0.10, 0.18);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(-0.10, 0.05, 0.02);
    leftBoot.name = 'leftBoot';
    group.add(leftBoot);
    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0.10, 0.05, 0.02);
    rightBoot.name = 'rightBoot';
    group.add(rightBoot);

    // --- Soft drop shadow to ground the figure ---
    const shadowGeo = new THREE.CircleGeometry(0.45, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.2 });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    shadow.name = 'playerShadow';
    group.add(shadow);

    group.userData.totemMesh = totemMesh;

    return group;
  }

  // --- 3D Totem: small handheld object based on totem type ---

  static createTotem3D(type: 'top' | 'coin' | 'ring', color: string = '#ffffff'): THREE.Group {
    const g = new THREE.Group();
    g.name = 'totem3D';
    const totemColor = new THREE.Color(color);
    const mat = new THREE.MeshBasicMaterial({ color: totemColor, side: THREE.DoubleSide });

    if (type === 'top') {
      // Simple bright spinning top.
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 14), mat);
      cone.position.y = 0.1;
      g.add(cone);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 10), mat);
      stem.position.y = -0.11;
      g.add(stem);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), mat);
      tip.position.y = -0.17;
      g.add(tip);
    } else if (type === 'coin') {
      const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.035, 24), mat);
      coin.rotation.x = Math.PI / 2;
      g.add(coin);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.01, 6, 28), mat);
      rim.position.y = 0;
      g.add(rim);
    } else {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 12, 30), mat);
      g.add(ring);
    }

    g.scale.setScalar(1.5);
    return g;
  }

  // --- Projection: a shadowy, distorted humanoid ---

  static createProjection(color: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'projection';

    const accent = new THREE.Color(color);

    // --- Body: hunched, elongated capsule with a rippling lower-half mist shader ---
    const bodyHeight = 1.5;
    const bodyRadius = 0.18;
    const bodyGeo = new THREE.CapsuleGeometry(bodyRadius, bodyHeight, 4, 14);
    // Shift so the capsule grows upward from the pivot, making it easy to hunch.
    bodyGeo.translate(0, bodyHeight / 2 + bodyRadius, 0);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      emissive: accent.clone(),
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });

    // Distortion shader: ripple the surface and fade the lower body into mist.
    bodyMat.onBeforeCompile = (shader: any) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vLocalY;')
        .replace('#include <begin_vertex>', `
          #include <begin_vertex>
          vLocalY = position.y;
          float wave = sin(position.y * 8.0 + uTime * 2.5) * 0.02;
          wave += sin(position.x * 12.0 + uTime * 1.8) * 0.015;
          transformed.z += wave;
        `);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;\nvarying float vLocalY;')
        .replace('#include <output_fragment>', `
          float fade = smoothstep(0.0, 0.6, vLocalY);
          float pulse = 0.75 + 0.25 * sin(vLocalY * 12.0 - uTime * 2.0);
          diffuseColor.a *= fade * pulse;
          #include <output_fragment>
        `);
    };

    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.1;
    body.rotation.x = 0.12;
    body.name = 'projectionBody';
    body.castShadow = true;
    group.add(body);

    // --- Head: featureless black ovoid with a glowing horizontal eye slit ---
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.82, 0.10);

    const headMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      emissive: accent.clone(),
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 14), headMat);
    head.scale.set(0.9, 1.35, 0.85);
    head.name = 'projectionHead';
    headGroup.add(head);

    const eyeGeo = new THREE.BoxGeometry(0.18, 0.018, 0.04);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      emissive: accent.clone(),
      emissiveIntensity: 4.0,
      roughness: 0.2,
    });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 0.05, 0.16);
    eye.name = 'projectionEye';
    headGroup.add(eye);

    group.add(headGroup);

    // --- Limbs: jointed shadowy capsules ---
    const limbMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      emissive: accent.clone(),
      emissiveIntensity: 0.35,
      roughness: 0.2,
      metalness: 0.1,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });

    function makeLeg(side: 1 | -1) {
      const hipY = 0.55;
      const thighLen = 0.30;
      const shinLen = 0.25;

      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.12, hipY, 0);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, thighLen, 4, 8), limbMat);
      thigh.position.y = -thighLen / 2;
      legGroup.add(thigh);

      const kneeGroup = new THREE.Group();
      kneeGroup.position.y = -thighLen;
      legGroup.add(kneeGroup);

      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, shinLen, 4, 8), limbMat);
      shin.position.y = -shinLen / 2;
      kneeGroup.add(shin);

      return { leg: legGroup, knee: kneeGroup };
    }

    const leftLegObj = makeLeg(-1);
    const rightLegObj = makeLeg(1);
    leftLegObj.leg.name = 'leftLeg';
    leftLegObj.knee.name = 'leftKnee';
    rightLegObj.leg.name = 'rightLeg';
    rightLegObj.knee.name = 'rightKnee';
    // Walking stance, so it doesn't look frozen before animation kicks in.
    leftLegObj.leg.rotation.x = 0.18;
    rightLegObj.leg.rotation.x = -0.18;
    group.add(leftLegObj.leg);
    group.add(rightLegObj.leg);

    function makeArm(side: 1 | -1) {
      const shoulderY = 1.42;
      const shoulderX = side * 0.22;
      const upperLen = 0.35;
      const forearmLen = 0.35;

      const armGroup = new THREE.Group();
      armGroup.position.set(shoulderX, shoulderY, 0);
      armGroup.name = side === 1 ? 'rightArm' : 'leftArm';

      const upperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, upperLen, 4, 8), limbMat);
      upperArm.position.y = -upperLen / 2;
      armGroup.add(upperArm);

      const elbowGroup = new THREE.Group();
      elbowGroup.position.y = -upperLen;
      elbowGroup.name = side === 1 ? 'rightElbow' : 'leftElbow';
      armGroup.add(elbowGroup);

      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, forearmLen, 4, 8), limbMat);
      forearm.position.y = -forearmLen / 2;
      elbowGroup.add(forearm);

      return { arm: armGroup, elbow: elbowGroup };
    }

    const leftArmObj = makeArm(-1);
    const rightArmObj = makeArm(1);
    leftArmObj.arm.rotation.z = 0.15;
    rightArmObj.arm.rotation.z = -0.15;
    leftArmObj.arm.rotation.x = 0.12;
    rightArmObj.arm.rotation.x = 0.12;
    group.add(leftArmObj.arm);
    group.add(rightArmObj.arm);

    // --- Faint unsettling glow ---
    const glow = new THREE.PointLight(accent.clone(), 0.8, 6, 1.5);
    glow.position.set(0, 1.4, 0);
    glow.name = 'projectionGlow';
    group.add(glow);

    // --- Expose named references for WorldRenderer and self-animation ---
    Object.assign(group.userData, {
      body,
      head,
      eye,
      leftArm: leftArmObj.arm,
      rightArm: rightArmObj.arm,
      leftLeg: leftLegObj.leg,
      rightLeg: rightLegObj.leg,
      leftKnee: leftLegObj.knee,
      rightKnee: rightLegObj.knee,
      glow,
      _velocity: 0,
      _walkPhase: 0,
    });

    // --- Per-frame: update distortion shader + limb/head animation ---
    (body as any).onBeforeRender = function (
      _renderer: THREE.WebGLRenderer,
      _scene: THREE.Scene,
      _camera: THREE.Camera,
      _geometry: THREE.BufferGeometry,
      _material: THREE.Material,
      _group: THREE.Group,
    ) {
      const projection = body.parent as THREE.Group | null;
      if (!projection) return;

      const now = performance.now() / 1000;
      const shader = body.userData.shader as any;
      if (shader && shader.uniforms && shader.uniforms.uTime) {
        shader.uniforms.uTime.value = now;
      }

      const lastPos = projection.userData._lastPos as THREE.Vector3 | undefined;
      const lastTime = (projection.userData._lastTime as number) ?? now;
      let dt = now - lastTime;
      if (dt > 0.1) dt = 0.1;
      if (dt <= 0) dt = 0.001;

      let velocity = (projection.userData._velocity as number) ?? 0;
      if (lastPos) {
        const dx = projection.position.x - lastPos.x;
        const dz = projection.position.z - lastPos.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        velocity = velocity * 0.85 + (dist / dt) * 0.15;
      }
      projection.userData._lastPos = projection.position.clone();
      projection.userData._lastTime = now;
      projection.userData._velocity = velocity;

      const walkPhase = ((projection.userData._walkPhase as number) ?? 0) + (0.5 + velocity * 5.0) * dt;
      projection.userData._walkPhase = walkPhase;

      const amp = Math.min(0.55, velocity * 1.5) * 0.42;

      const leftLeg = projection.userData.leftLeg as THREE.Group | undefined;
      const rightLeg = projection.userData.rightLeg as THREE.Group | undefined;
      if (leftLeg) leftLeg.rotation.x = 0.18 + Math.sin(walkPhase) * amp;
      if (rightLeg) rightLeg.rotation.x = -0.18 + Math.sin(walkPhase + Math.PI) * amp;

      const leftKnee = projection.userData.leftKnee as THREE.Group | undefined;
      const rightKnee = projection.userData.rightKnee as THREE.Group | undefined;
      if (leftKnee) leftKnee.rotation.x = Math.max(0, Math.sin(walkPhase)) * amp * 0.8;
      if (rightKnee) rightKnee.rotation.x = Math.max(0, Math.sin(walkPhase + Math.PI)) * amp * 0.8;

      const leftArm = projection.userData.leftArm as THREE.Group | undefined;
      const rightArm = projection.userData.rightArm as THREE.Group | undefined;
      if (leftArm) leftArm.rotation.x = 0.12 + Math.sin(walkPhase + Math.PI) * (amp * 0.5);
      if (rightArm) rightArm.rotation.x = 0.12 + Math.sin(walkPhase) * (amp * 0.5);

      const headMesh = projection.userData.head as THREE.Mesh | undefined;
      if (headMesh) {
        headMesh.rotation.y = Math.sin(now * 0.8) * 0.05;
        headMesh.rotation.x = Math.sin(now * 1.2) * 0.03;
      }
    };

    return group;
  }

  // --- Tiles ---

  static createTile(tileType: number, theme: TileTheme): THREE.Mesh | null {
    let mesh: THREE.Mesh | null = null;

    switch (tileType) {
      case 0: {
        // floor: flat box with self-illumination so it's visible in the dark dream.
        const geo = new THREE.BoxGeometry(1, 0.1, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(theme.floor),
          emissive: new THREE.Color(theme.floor),
          emissiveIntensity: 0.9,
          roughness: 0.9,
          metalness: 0.0,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0;
        mesh.name = 'tile-floor';
        break;
      }
      case 1: {
        // wall: tall box with self-illumination.
        const geo = new THREE.BoxGeometry(1, 1.5, 1);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(theme.wall),
          emissive: new THREE.Color(theme.wall),
          emissiveIntensity: 0.8,
          roughness: 0.8,
          metalness: 0.05,
        });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.75;
        mesh.name = 'tile-wall';
        break;
      }
      case 2: {
        // door: flat glowing tile.
        const geo = new THREE.BoxGeometry(1, 0.1, 1);
        const mat = emissiveMaterial(theme.accent, 1.5, { roughness: 0.4 });
        mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = 0.05;
        mesh.name = 'tile-door';
        break;
      }
      case 3: {
        // void: don't render.
        return null;
      }
      default:
        return null;
    }

    return mesh;
  }

  // --- Fragment: irregular crystal with a bright inner core ---

  static createFragment(color: string): THREE.Group {
    const group = new THREE.Group();
    group.name = 'fragment';

    // Irregular outer crystal via convex hull of random points in a sphere.
    const pointCount = 8 + Math.floor(Math.random() * 3); // 8-10
    const pts: THREE.Vector3[] = [];
    const radius = 0.2 + Math.random() * 0.1; // 0.2-0.3
    for (let i = 0; i < pointCount; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
      );
      if (v.lengthSq() < 0.01) v.set(radius, 0, 0);
      v.normalize().multiplyScalar(radius * (0.7 + Math.random() * 0.4));
      pts.push(v);
    }
    // Crystal hull — unlit so it pops against dark floors.
    const crystalGeo = new ConvexGeometry(pts);
    const crystalColor = new THREE.Color(color);
    const crystalMat = new THREE.MeshBasicMaterial({
      color: crystalColor,
      transparent: true,
      opacity: 0.9,
    });
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.name = 'fragmentCrystal';
    group.add(crystal);

    // Bright inner core.
    const coreGeo = new THREE.OctahedronGeometry(0.12);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.scale.setScalar(0.7);
    core.name = 'fragmentCore';
    group.add(core);

    // Small point light matching the fragment color.
    const light = new THREE.PointLight(new THREE.Color(color), 1.0, 4, 1.5);
    light.name = 'fragmentLight';
    group.add(light);

    return group;
  }

  // --- Anchors ---

  static createAnchor(type: string, color: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `anchor-${type}`;

    if (type === 'descent-anchor') {
      // --- Vertical TEAR: a swirling void plane the player walks INTO ---
      const tearGeo = new THREE.PlaneGeometry(1.2, 2.0);
      const accent = new THREE.Color(color);
      const tearMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: accent },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            vec2 uv = vUv - 0.5;
            float d = length(uv);
            // Swirling noise via layered sin/cos waves in UV space.
            float a = atan(uv.y, uv.x);
            float swirl = sin(uTime * 1.5 + a * 6.0 + d * 12.0);
            swirl += 0.5 * cos(uTime * 2.0 - a * 4.0 + d * 8.0);
            swirl = 0.5 + 0.5 * swirl * 0.5;
            // Dark center, bright edges — a void you fall into.
            float center = smoothstep(0.0, 0.35, d);
            float alpha = center * (0.5 + 0.5 * swirl);
            vec3 col = uColor * swirl * center;
            col += uColor * 0.15 * (1.0 - center);
            gl_FragColor = vec4(col, alpha);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const tear = new THREE.Mesh(tearGeo, tearMat);
      tear.name = 'portalTear';
      tear.position.y = 1.0;
      // Stand vertically (default plane already faces +Z; keep rotation.x = 0).
      tear.rotation.x = 0;
      // Self-animate the time uniform (we don't own WorldRenderer's update loop).
      tear.onBeforeRender = () => {
        (tearMat.uniforms.uTime.value as number) = performance.now() / 1000;
      };
      group.add(tear);

      // --- Frame: two broken LatheGeometry columns on either side ---
      const colProfile = [
        new THREE.Vector2(0.08, 0),
        new THREE.Vector2(0.09, 0.3),
        new THREE.Vector2(0.07, 0.6),
        new THREE.Vector2(0.08, 0.8),
      ];
      const colGeo = new THREE.LatheGeometry(colProfile, 8);
      const colMat = standardMaterial(color, { roughness: 0.8, metalness: 0.1, emissive: new THREE.Color(color), emissiveIntensity: 1.0 });
      const colL = new THREE.Mesh(colGeo, colMat);
      colL.position.set(-0.75, 0, 0);
      colL.name = 'portalColumnL';
      group.add(colL);
      const colR = new THREE.Mesh(colGeo, colMat);
      colR.position.set(0.75, 0, 0);
      colR.name = 'portalColumnR';
      group.add(colR);

      const light = new THREE.PointLight(accent.clone(), 1.5, 8, 1.5);
      light.position.y = 1.0;
      light.name = 'portalLight';
      group.add(light);
    } else if (type === 'seed-anchor') {
      // --- Heart-like organic shape: two overlapping scaled spheres ---
      const heart = new THREE.Group();
      heart.name = 'seedMesh';
      const heartMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 1.5,
        roughness: 0.3,
        metalness: 0.2,
      });
      const lobeL = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), heartMat);
      lobeL.scale.set(1.0, 1.2, 0.8);
      lobeL.position.set(-0.15, 0, 0);
      heart.add(lobeL);
      const lobeR = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 12), heartMat);
      lobeR.scale.set(1.0, 1.2, 0.8);
      lobeR.position.set(0.15, 0, 0);
      heart.add(lobeR);
      heart.position.y = 0.8;
      group.add(heart);

      // --- Vein network: random red emissive line segments around the heart ---
      const veinPts: number[] = [];
      for (let i = 0; i < 20; i++) {
        const r = 0.35 + Math.random() * 0.25;
        const t1 = Math.random() * Math.PI * 2;
        const p1 = Math.acos(2 * Math.random() - 1);
        const t2 = Math.random() * Math.PI * 2;
        const p2 = Math.acos(2 * Math.random() - 1);
        veinPts.push(
          r * Math.sin(p1) * Math.cos(t1), r * Math.cos(p1), r * Math.sin(p1) * Math.sin(t1),
          r * Math.sin(p2) * Math.cos(t2), r * Math.cos(p2), r * Math.sin(p2) * Math.sin(t2),
        );
      }
      const veinGeo = new THREE.BufferGeometry();
      veinGeo.setAttribute('position', new THREE.Float32BufferAttribute(veinPts, 3));
      const veinMat = new THREE.LineBasicMaterial({
        color: 0xff2020,
        transparent: true,
        opacity: 0.6,
      });
      const veins = new THREE.LineSegments(veinGeo, veinMat);
      veins.name = 'seedVeins';
      veins.position.y = 0.8;
      group.add(veins);

      const light = new THREE.PointLight(new THREE.Color(color), 2.5, 12, 1.5);
      light.position.y = 0.8;
      light.name = 'seedLight';
      group.add(light);
    }

    return group;
  }

  // --- Memory objects: environmental storytelling props ---

  static createMemoryObject(kind: MemoryObjectKind, theme: LayerTheme): THREE.Object3D {
    const group = new THREE.Group();
    group.name = `memory-${kind}`;
    const accent = theme.palette.accent;
    const fg = theme.palette.fg;
    const wall = theme.palette.wall;

    // Bright self-illuminated prop materials so objects read in the dim rooms.
    const glowMat = (base: THREE.MeshStandardMaterial) => {
      base.emissive = new THREE.Color(base.color).lerp(new THREE.Color(0xffffff), 0.4);
      base.emissiveIntensity = 1.0;
      return base;
    };

    switch (kind) {
      case 'chair': {
        const mat = glowMat(standardMaterial(fg, { roughness: 0.8, metalness: 0.0 }));
        const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.3), mat);
        seat.position.y = 0.4;
        group.add(seat);
        const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.05), mat);
        back.position.set(0, 0.6, -0.125);
        group.add(back);
        const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
        for (const [lx, lz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) {
          const leg = new THREE.Mesh(legGeo, mat);
          leg.position.set(lx, 0.2, lz);
          group.add(leg);
        }
        break;
      }
      case 'clock': {
        const bodyMat = glowMat(standardMaterial(fg, { roughness: 0.6, metalness: 0.3 }));
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 16), bodyMat);
        body.rotation.x = Math.PI / 2;
        body.position.y = 0.5;
        group.add(body);
        // Clock face drawn on canvas.
        const faceTex = canvasTexture(128, (ctx, s) => {
          ctx.fillStyle = '#1a1410';
          ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = accent; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 4, 0, Math.PI * 2); ctx.stroke();
          // 12 tick marks.
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(s / 2 + Math.cos(a) * (s / 2 - 8), s / 2 + Math.sin(a) * (s / 2 - 8));
            ctx.lineTo(s / 2 + Math.cos(a) * (s / 2 - 16), s / 2 + Math.sin(a) * (s / 2 - 16));
            ctx.stroke();
          }
          // Two hands.
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(s / 2, s / 2); ctx.lineTo(s / 2, s / 2 - 30); ctx.stroke();
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(s / 2, s / 2); ctx.lineTo(s / 2 + 24, s / 2 + 10); ctx.stroke();
        });
        const faceMat = new THREE.MeshStandardMaterial({
          map: faceTex,
          emissive: new THREE.Color(accent),
          emissiveIntensity: 0.6,
          emissiveMap: faceTex,
          roughness: 0.5,
        });
        const face = new THREE.Mesh(new THREE.CircleGeometry(0.19, 24), faceMat);
        face.position.set(0, 0.5, 0.041);
        group.add(face);
        break;
      }
      case 'mirror': {
        const mirrorMat = new THREE.MeshStandardMaterial({
          color: 0xffffff, metalness: 0.95, roughness: 0.05,
          emissive: new THREE.Color(accent), emissiveIntensity: 1.0,
        });
        const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), mirrorMat);
        mirror.position.y = 0.4;
        group.add(mirror);
        // Crack overlay.
        const crackTex = canvasTexture(128, (ctx, s) => {
          ctx.clearRect(0, 0, s, s);
          ctx.strokeStyle = 'rgba(255,255,255,0.85)';
          ctx.lineWidth = 1;
          const cx = s / 2, cy = s / 2;
          for (let i = 0; i < 7; i++) {
            const a = Math.random() * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            let x = cx, y = cy;
            for (let j = 0; j < 4; j++) {
              x += Math.cos(a + (Math.random() - 0.5) * 0.8) * 12;
              y += Math.sin(a + (Math.random() - 0.5) * 0.8) * 12;
              ctx.lineTo(x, y);
            }
            ctx.stroke();
          }
        });
        const crackMat = new THREE.MeshBasicMaterial({
          map: crackTex, transparent: true, opacity: 0.8, depthWrite: false,
        });
        const cracks = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), crackMat);
        cracks.position.set(0, 0.4, 0.002);
        group.add(cracks);
        break;
      }
      case 'photo': {
        // Abstract warm image.
        const photoTex = canvasTexture(128, (ctx, s) => {
          const g = ctx.createLinearGradient(0, 0, 0, s);
          g.addColorStop(0, '#3a2a1a');
          g.addColorStop(1, '#1a1208');
          ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
          // soft silhouettes
          ctx.fillStyle = 'rgba(240,200,150,0.5)';
          ctx.beginPath(); ctx.arc(s * 0.35, s * 0.6, 18, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(s * 0.6, s * 0.55, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,224,176,0.3)';
          ctx.fillRect(0, s * 0.7, s, s * 0.3);
        });
        const photoMat = new THREE.MeshStandardMaterial({
          map: photoTex, emissive: new THREE.Color(accent), emissiveIntensity: 1.0,
          roughness: 0.8,
        });
        const photo = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.4), photoMat);
        photo.position.y = 0.4;
        group.add(photo);
        // Burning edges behind.
        const burnTex = canvasTexture(128, (ctx, s) => {
          ctx.clearRect(0, 0, s, s);
          const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
          g.addColorStop(0, 'rgba(0,0,0,0)');
          g.addColorStop(0.7, 'rgba(255,120,30,0.3)');
          g.addColorStop(1, 'rgba(255,80,10,0.9)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
        });
        const burnMat = new THREE.MeshBasicMaterial({
          map: burnTex, transparent: true, opacity: 0.9, depthWrite: false,
        });
        const burn = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.46), burnMat);
        burn.position.set(0, 0.4, -0.005);
        group.add(burn);
        break;
      }
      case 'toy': {
        // Spinning top — mirrors the player's totem.
        const brassColor = new THREE.Color(0xc8a060);
        const brass = new THREE.MeshStandardMaterial({
          color: brassColor, metalness: 0.8, roughness: 0.3,
          emissive: brassColor.clone().lerp(new THREE.Color(0xffffff), 0.25), emissiveIntensity: 1.0,
        });
        const top = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 10), brass);
        top.position.y = 0.25;
        group.add(top);
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8), brass);
        stem.position.y = 0.06;
        group.add(stem);
        break;
      }
      case 'desk': {
        const mat = glowMat(standardMaterial(wall, { roughness: 0.8, metalness: 0.05 }));
        const topMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.4), mat);
        topMesh.position.y = 0.5;
        group.add(topMesh);
        const legGeo = new THREE.BoxGeometry(0.05, 0.5, 0.05);
        for (const [lx, lz] of [[-0.25, -0.17], [0.25, -0.17], [-0.25, 0.17], [0.25, 0.17]]) {
          const leg = new THREE.Mesh(legGeo, mat);
          leg.position.set(lx, 0.25, lz);
          group.add(leg);
        }
        break;
      }
      case 'door': {
        const mat = glowMat(standardMaterial(wall, { roughness: 0.8, metalness: 0.05 }));
        // Frame: two sides + top.
        const sideGeo = new THREE.BoxGeometry(0.08, 1.5, 0.08);
        const sideL = new THREE.Mesh(sideGeo, mat);
        sideL.position.set(-0.31, 0.75, 0);
        group.add(sideL);
        const sideR = new THREE.Mesh(sideGeo, mat);
        sideR.position.set(0.31, 0.75, 0);
        group.add(sideR);
        const topFrame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.08, 0.08), mat);
        topFrame.position.set(0, 1.46, 0);
        group.add(topFrame);
        // Door panel, slightly ajar.
        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.54, 1.42, 0.04), mat);
        panel.position.set(-0.27, 0.74, 0.02);
        panel.rotation.y = 0.26; // ~15°
        group.add(panel);
        break;
      }
      case 'window': {
        // Semi-transparent pane.
        const paneMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(accent),
          emissive: new THREE.Color(accent),
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.3,
          roughness: 0.3,
          metalness: 0.0,
        });
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.6), paneMat);
        pane.position.y = 0.5;
        group.add(pane);
        // Cross frame: 3 thin bars.
        const barMat = glowMat(standardMaterial(wall, { roughness: 0.8, metalness: 0.1 }));
        const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.6, 0.03), barMat);
        vBar.position.set(0, 0.5, 0.01);
        group.add(vBar);
        const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.03), barMat);
        hBar.position.set(0, 0.5, 0.01);
        group.add(hBar);
        // Outer frame.
        const fGeoH = new THREE.BoxGeometry(0.54, 0.03, 0.03);
        const fTop = new THREE.Mesh(fGeoH, barMat); fTop.position.set(0, 0.8, 0.01); group.add(fTop);
        const fBot = new THREE.Mesh(fGeoH, barMat); fBot.position.set(0, 0.2, 0.01); group.add(fBot);
        const fGeoV = new THREE.BoxGeometry(0.03, 0.6, 0.03);
        const fL = new THREE.Mesh(fGeoV, barMat); fL.position.set(-0.26, 0.5, 0.01); group.add(fL);
        const fR = new THREE.Mesh(fGeoV, barMat); fR.position.set(0.26, 0.5, 0.01); group.add(fR);
        // Sky/garden scene behind.
        const warm = theme.depth <= 1;
        const skyTex = canvasTexture(128, (ctx, s) => {
          const g = ctx.createLinearGradient(0, 0, 0, s);
          if (warm) {
            g.addColorStop(0, '#f0c890'); g.addColorStop(1, '#c89060');
          } else {
            g.addColorStop(0, '#8ad0e8'); g.addColorStop(1, '#3a6a80');
          }
          ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
          ctx.fillStyle = warm ? 'rgba(255,224,176,0.5)' : 'rgba(176,236,255,0.4)';
          ctx.beginPath(); ctx.arc(s * 0.7, s * 0.3, 14, 0, Math.PI * 2); ctx.fill();
        });
        const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, opacity: 0.8 });
        const sky = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.58), skyMat);
        sky.position.set(0, 0.5, -0.02);
        group.add(sky);
        break;
      }
      case 'bars': {
        const barMat = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a, metalness: 0.8, roughness: 0.4,
          emissive: new THREE.Color(accent), emissiveIntensity: 1.0,
        });
        const barGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8);
        for (let i = 0; i < 5; i++) {
          const bar = new THREE.Mesh(barGeo, barMat);
          bar.position.set(-0.2 + i * 0.1, 0.6, 0);
          group.add(bar);
        }
        // Top + bottom rails.
        const railGeo = new THREE.BoxGeometry(0.44, 0.03, 0.03);
        const railTop = new THREE.Mesh(railGeo, barMat); railTop.position.set(0, 1.2, 0); group.add(railTop);
        const railBot = new THREE.Mesh(railGeo, barMat); railBot.position.set(0, 0.0, 0); group.add(railBot);
        break;
      }
    }

    return group;
  }

  // --- Particle fields ---

  static createParticleField(count: number, color: string, type: string, area: number): THREE.Points {
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const offsets = new Float32Array(count);

    const half = area / 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * area;
      positions[i3 + 1] = Math.random() * area;
      positions[i3 + 2] = (Math.random() - 0.5) * area;

      if (type === 'drift') {
        // slow upward drift.
        velocities[i3] = (Math.random() - 0.5) * 0.3;
        velocities[i3 + 1] = 0.2 + Math.random() * 0.4;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
        sizes[i] = 0.08 + Math.random() * 0.12;
      } else if (type === 'rain') {
        // falling streaks.
        velocities[i3] = 0;
        velocities[i3 + 1] = -(2 + Math.random() * 3);
        velocities[i3 + 2] = 0;
        sizes[i] = 0.06 + Math.random() * 0.08;
      } else if (type === 'ash') {
        // slow-falling dark points with horizontal drift.
        velocities[i3] = (Math.random() - 0.5) * 0.5;
        velocities[i3 + 1] = -(0.3 + Math.random() * 0.4);
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.5;
        sizes[i] = 0.05 + Math.random() * 0.1;
      } else {
        // void: near-static faint points.
        velocities[i3] = (Math.random() - 0.5) * 0.05;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.05;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.05;
        sizes[i] = 0.04 + Math.random() * 0.06;
      }

      offsets[i] = Math.random() * Math.PI * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aVelocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1));

    const particleType = type;

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(color) },
        uTime: { value: 0 },
        uArea: { value: area },
        uHalf: { value: half },
        uType: { value: particleType === 'rain' ? 1.0 : particleType === 'ash' ? 2.0 : particleType === 'void' ? 3.0 : 0.0 },
      },
      vertexShader: /* glsl */ `
        attribute vec3 aVelocity;
        attribute float aSize;
        attribute float aOffset;
        uniform float uTime;
        uniform float uArea;
        uniform float uHalf;
        uniform float uType;
        varying float vAlpha;

        void main() {
          vec3 pos = position;
          // Integrate velocity over time, wrap around the area volume.
          pos += aVelocity * uTime;
          // Wrap each axis into [-half, half].
          pos.x = mod(pos.x + uHalf, uArea) - uHalf;
          pos.y = mod(pos.y + uHalf, uArea) - uHalf;
          pos.z = mod(pos.z + uHalf, uArea) - uHalf;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * 300.0 / -mvPosition.z;

          // Fade based on type — rain/ash dimmer, drift/void faint glow.
          float baseAlpha = uType == 1.0 ? 0.5 : uType == 2.0 ? 0.35 : 0.6;
          vAlpha = baseAlpha * (0.6 + 0.4 * sin(uTime * 0.5 + aOffset));
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        varying float vAlpha;
        void main() {
          // Soft circular point.
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d) * vAlpha;
          gl_FragColor = vec4(uColor, a);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.name = `particles-${type}`;
    points.frustumCulled = false;
    return points;
  }
}
