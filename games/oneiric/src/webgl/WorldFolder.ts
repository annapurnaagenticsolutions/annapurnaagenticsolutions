import * as THREE from 'three';

// ONEIRIC — World Folding Specialist
// Applies the iconic Inception "world folding" vertex displacement to the
// 3D world. The ground plane and walls curve upward at the edges, centered
// on the player, creating the sensation that the dream world is folding
// around the dreamer — exactly like the Paris folding scene in Inception.
//
// Implementation: onBeforeCompile shader injection on every mesh material in
// the world group. This preserves the existing MeshStandardMaterial /
// MeshPhysicalMaterial lighting while adding a smooth, gradual vertex bend
// driven by distance from the player.

// Layer-specific default fold strengths.
// This is the Paris-folding effect: the entire world curls upward and inward
// until the ground plane becomes a wall on the horizon.
// Layer 1 = 0.0 (almost real), Layer 2 = 0.5 (half-folded, the world is bending),
// Layer 3 = 1.0 (90° cylindrical fold — the world is a cylinder around you).
const LAYER_FOLD_DEFAULTS: Record<number, number> = {
  1: 0.0, // Surface: flat, clean diorama
  2: 0.0, // Current: flat, clean diorama
  3: 0.0, // Abyss: flat, clean diorama
  99: 0.0, // Limbo — unstructured, no fold
};

// Shared uniforms across all injected materials. We keep ONE uniforms object
// per material so each material can be disposed independently, but we mirror
// the same logical values into every one each frame via update().
interface FoldUniforms {
  uFoldStrength: { value: number };
  uPlayerPos: { value: THREE.Vector3 };
  uTime: { value: number };
  uFoldRadius: { value: number };
  uFoldEndScale: { value: number };
  uFoldHeight: { value: number };
}

// Track every material we've injected so we can update/dispose uniformly.
interface InjectedMaterial {
  material: THREE.Material;
  uniforms: FoldUniforms;
  originalOnBeforeCompile: ((shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => void) | null;
  customUserDataKey: string;
}

const FOLD_FLAG = '__oneiricWorldFoldInjected';

/**
 * WorldFolder — applies the Inception world-folding vertex shader to a world
 * group. Stateless-ish: holds references to injected materials so uniforms can
 * be updated each frame and the injection removed on dispose.
 */
export class WorldFolder {
  // The single source-of-truth uniform values. Every injected material's
  // uniforms mirror these each frame in update().
  private foldStrength: number = 0.0;
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private time: number = 0;
  private foldRadius: number = 18.0; // world units where folding begins (keep center flat)
  private foldEndScale: number = 2.0; // fold ends at foldRadius * foldEndScale
  private foldHeight: number = 0.35;  // scale of the upward bend (subtle, playable)

  // Breathing animation amplitude — deeper layers pulse subtly.
  private breathingAmplitude: number = 0.0;

  // All injected materials across the world.
  private injected: InjectedMaterial[] = [];

  /**
   * Inject the fold shader into every mesh material under `world`.
   * `theme` is used to pick the layer-specific default fold strength.
   */
  applyToWorld(world: THREE.Group, theme: any): void {
    const depth: number = theme?.depth ?? 1;
    this.foldStrength = LAYER_FOLD_DEFAULTS[depth] ?? 0.0;

    // Breathing is subtle and only meaningful in deeper layers.
    // Layer 2: faint pulse, Layer 3: stronger living-world pulse.
    if (depth === 2) this.breathingAmplitude = 0.02;
    else if (depth === 3) this.breathingAmplitude = 0.05;
    else this.breathingAmplitude = 0.0;

    world.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;

      // Handle multi-material meshes.
      const mats: THREE.Material[] = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        this.injectMaterial(m);
      }
    });
  }

  /**
   * Inject the fold vertex displacement into a single material via
   * onBeforeCompile. Preserves all existing lighting/properties.
   */
  private injectMaterial(material: THREE.Material): void {
    // Avoid double-injection.
    if ((material as any)[FOLD_FLAG] === true) return;

    const uniforms: FoldUniforms = {
      uFoldStrength: { value: this.foldStrength },
      uPlayerPos: { value: this.playerPos.clone() },
      uTime: { value: this.time },
      uFoldRadius: { value: this.foldRadius },
      uFoldEndScale: { value: this.foldEndScale },
      uFoldHeight: { value: this.foldHeight },
    };

    const originalOnBeforeCompile = material.onBeforeCompile ?? null;

    material.onBeforeCompile = (shader: THREE.WebGLProgramParametersWithUniforms, renderer: THREE.WebGLRenderer) => {
      // Call the original first so any prior injection (e.g. existing custom
      // shader mods) still applies.
      if (originalOnBeforeCompile) {
        originalOnBeforeCompile.call(material, shader, renderer);
      }

      // Merge our uniforms into the material's shader uniforms.
      shader.uniforms.uFoldStrength = uniforms.uFoldStrength;
      shader.uniforms.uPlayerPos = uniforms.uPlayerPos;
      shader.uniforms.uTime = uniforms.uTime;
      shader.uniforms.uFoldRadius = uniforms.uFoldRadius;
      shader.uniforms.uFoldEndScale = uniforms.uFoldEndScale;
      shader.uniforms.uFoldHeight = uniforms.uFoldHeight;

      // --- Vertex shader injection ---
      // We compute the world-space horizontal distance from the player and
      // progressively bend vertices upward beyond uFoldRadius. A slight
      // tangential bend on X/Z gives the "wrapping" sensation.
      shader.vertexShader = /* glsl */ `
        uniform float uFoldStrength;
        uniform vec3  uPlayerPos;
        uniform float uTime;
        uniform float uFoldRadius;
        uniform float uFoldEndScale;
        uniform float uFoldHeight;

        // --- ICONIC INCEPTION WORLD FOLD ---
        // The world is curled around the player like the inside of a cylinder.
        // Vertices are displaced along a circular arc: as distance from the
        // player grows, the ground rotates upward until it becomes a wall.
        // angle = 0° at the player, 90° * foldStrength at the horizon.

        float oneiricFold(vec3 worldPos, out float newY, out vec2 newXZ) {
          vec2 horiz = worldPos.xz - uPlayerPos.xz;
          float dist = length(horiz);
          float foldStart = uFoldRadius;
          float foldEnd   = uFoldRadius * uFoldEndScale;

          // Smooth 0..1 ramp from foldStart to foldEnd.
          float t = smoothstep(foldStart, foldEnd, dist);

          // The fold angle: 0° at foldStart, up to 90° * foldStrength at foldEnd.
          float maxAngle = 1.5708 * uFoldStrength; // π/2
          float angle = t * maxAngle;

          // Breathing: deeper layers pulse subtly.
          angle += sin(uTime * 0.5 + dist * 0.08) * 0.03 * uFoldStrength * t;

          // Circular arc displacement.
          // Vertices move along a quarter-circle arc: y rises, horizontal
          // distance shrinks to zero at 90°. This is the Paris fold.
          float cosA = cos(angle);
          float sinA = sin(angle);

          vec2 dir = dist > 0.001 ? horiz / dist : vec2(0.0);

          // New horizontal distance from the player, compressed inward.
          float newDist = dist * cosA;

          // New height: at 90° the far edge is as high as its distance.
          float rise = dist * sinA * uFoldHeight;

          newY = rise;
          newXZ = uPlayerPos.xz + dir * newDist;

          return angle;
        }
      ` + shader.vertexShader;

      // Inject the displacement right after `#include <begin_vertex>`.
      // We overwrite transformed with the new local position because the fold
      // is a full world-space deformation that changes all three axes.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
          #include <begin_vertex>

          // --- ONEIRIC world fold ---
          // Full world-space cylindrical fold: ground becomes a wall.
          vec4 oneiricWorldPos = modelMatrix * vec4(transformed, 1.0);
          float oneiricFoldY;
          vec2  oneiricFoldXZ;
          oneiricFold(oneiricWorldPos.xyz, oneiricFoldY, oneiricFoldXZ);

          // Convert the new world position back to local space.
          // modelMatrix for the world tiles is translation + uniform scale.
          vec3 oneiricWorldOut = vec3(oneiricFoldXZ.x, oneiricFoldY, oneiricFoldXZ.y);
          float scaleX = length(modelMatrix[0].xyz);
          float scaleY = length(modelMatrix[1].xyz);
          float scaleZ = length(modelMatrix[2].xyz);
          transformed = (oneiricWorldOut - modelMatrix[3].xyz) / vec3(scaleX, scaleY, scaleZ);
        `,
      );
    };

    // Mark as injected and track for update/dispose.
    (material as any)[FOLD_FLAG] = true;
    material.needsUpdate = true;

    this.injected.push({
      material,
      uniforms,
      originalOnBeforeCompile,
      customUserDataKey: FOLD_FLAG,
    });
  }

  /** Set the base fold strength (0.0 = flat, 1.0 = fully folded). */
  setFoldStrength(strength: number): void {
    this.foldStrength = Math.max(0, Math.min(1, strength));
  }

  /** Set the player world position — the fold centers on the player. */
  setPlayerPosition(x: number, z: number): void {
    this.playerPos.set(x, 0, z);
  }

  /** Set where the fold begins (world units from the player). */
  setFoldRadius(radius: number): void {
    this.foldRadius = Math.max(1, radius);
  }

  /**
   * Per-frame update. Mirrors the source-of-truth uniform values into every
   * injected material and applies the breathing animation (the dream world
   * subtly pulses in deeper layers).
   */
  update(time: number): void {
    this.time = time;

    // Breathing: modulate fold strength slightly with sin(time) in deeper
    // layers so the world feels alive. The base strength is preserved; we
    // add a small oscillation that never goes below 0.
    const breath = this.breathingAmplitude > 0
      ? Math.sin(time * 0.6) * this.breathingAmplitude
      : 0;
    const effectiveStrength = Math.max(0, this.foldStrength + breath);

    for (const entry of this.injected) {
      entry.uniforms.uFoldStrength.value = effectiveStrength;
      entry.uniforms.uPlayerPos.value.copy(this.playerPos);
      entry.uniforms.uTime.value = this.time;
      entry.uniforms.uFoldRadius.value = this.foldRadius;
      entry.uniforms.uFoldEndScale.value = this.foldEndScale;
      entry.uniforms.uFoldHeight.value = this.foldHeight;
    }
  }

  /**
   * Remove the fold shader injection from all materials under `world` and
   * restore their original onBeforeCompile. Call on room clear.
   */
  dispose(world: THREE.Group): void {
    // Restore each injected material.
    for (const entry of this.injected) {
      const mat = entry.material as any;
      if (mat[FOLD_FLAG] === true) {
        mat.onBeforeCompile = entry.originalOnBeforeCompile ?? null;
        mat[FOLD_FLAG] = false;
        mat.needsUpdate = true;
      }
    }
    this.injected = [];

    // Also sweep the world for any materials we might have missed (defensive).
    world.traverse((child: THREE.Object3D) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      const mats: THREE.Material[] = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const mm = m as any;
        if (mm[FOLD_FLAG] === true) {
          // If still flagged, we lost track — clear the flag only. We can't
          // reliably restore the original compile hook here, but setting
          // needsUpdate forces a recompile without our injection since the
          // hook was overwritten. This is a safety net.
          mm[FOLD_FLAG] = false;
          mm.needsUpdate = true;
        }
      }
    });
  }
}
