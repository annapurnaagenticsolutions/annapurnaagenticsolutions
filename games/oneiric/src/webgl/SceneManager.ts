import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

// ONEIRIC — 3D scene manager
// Owns the Three.js scene, camera, renderer, and post-processing pipeline.
// The player lantern is the primary light source; the world is dark by design
// but filled with cinematic pools of light, rim highlights, and depth blur.

// Custom color-grade shader — applies a dramatic per-layer tint with lift,
// a red stability pulse, a white-out kick flash, and slow-motion descent blur.
const ColorGradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uTint: { value: new THREE.Color(0xffffff) },
    uLift: { value: new THREE.Color(0x000000) },
    uTime: { value: 0 },
    uStability: { value: 1.0 },
    uWhiteout: { value: 0.0 },
    uDescentBlur: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec3 uTint;
    uniform vec3 uLift;
    uniform float uTime;
    uniform float uStability;
    uniform float uWhiteout;
    uniform float uDescentBlur;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;

      // Slow-motion double-vision during descent (and other high-blur moments).
      vec4 color = texture2D(tDiffuse, uv);
      if (uDescentBlur > 0.001) {
        vec2 ghostUv = uv + vec2(0.012, 0.0) * uDescentBlur;
        vec4 ghost = texture2D(tDiffuse, ghostUv);
        color.rgb = mix(color.rgb, (color.rgb + ghost.rgb) * 0.5, uDescentBlur * 0.45);
      }

      // Per-layer tint (multiply) + lift into the layer's tonal range.
      // Lift is kept small so shadows read as colored, not muddy.
      color.rgb = color.rgb * uTint + uLift * 0.03;

      // Strong red/pulsing color grade when dream stability is below 20%.
      if (uStability < 0.2) {
        float pulse = 0.5 + 0.5 * sin(uTime * 8.0);
        float redMix = (0.2 - uStability) * pulse * 0.6;
        color.rgb = mix(color.rgb, vec3(1.0, 0.05, 0.02), redMix);
      }

      // White-out on successful kick / big impact events.
      if (uWhiteout > 0.001) {
        color.rgb = mix(color.rgb, vec3(1.0), uWhiteout);
      }

      gl_FragColor = color;
    }
  `,
};

// Volumetric light shaft shader — fake god rays for every dream layer.
// Vertical gradient with horizontal falloff, per-shaft noise flicker, and
// additive blending so the shafts read as cones of light streaming through the dream.
const LIGHT_SHAFT_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vWorldPos;

  void main() {
    // Vertical: bright at top (vUv.y=1), fades to nothing at bottom (vUv.y=0).
    float vertical = smoothstep(0.0, 0.6, vUv.y);
    // Horizontal falloff: brightest in center, soft edges.
    float horizontal = 1.0 - abs(vUv.x - 0.5) * 2.0;
    horizontal = smoothstep(0.0, 0.5, horizontal);

    // Noise-based flicker: each shaft animates based on its world position.
    float flicker = sin(vWorldPos.x * 0.4 + vWorldPos.y * 0.3 + uTime * 1.5) * 0.05
                  + cos(vWorldPos.z * 0.35 - uTime * 1.1) * 0.04;
    flicker = clamp(1.0 + flicker, 0.7, 1.3);

    float alpha = vertical * horizontal * uOpacity * flicker;
    gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
  }
`;

const LIGHT_SHAFT_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Per-layer accent colors (matches data/layers.ts palette.accent).
const LAYER_ACCENTS: Record<number, THREE.ColorRepresentation> = {
  1: 0xffe0b0, // Surface — warm amber
  2: 0xb0ecff, // Current — cold teal
  3: 0xff9090, // Abyss — crimson
  99: 0x888888, // Limbo — grey
};

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private composer: EffectComposer;
  private renderPass: RenderPass;
  private bloomPass: UnrealBloomPass;
  private colorPass: ShaderPass;
  private bokehPass: BokehPass;
  private outputPass: OutputPass;

  // Camera follow state. Target is in world units (already scaled to tileSize=2).
  private camTargetX = 0;
  private camTargetZ = 0;
  private camCurrentX = 0;
  private camCurrentZ = 0;
  private camLerp = 0.1;

  // Screen shake state — trauma-based (research-backed game feel).
  // trauma is 0..1, shake amplitude = trauma^2 (quadratic so small hits stay
  // subtle and big hits punch). Trauma decays at 0.5/s so 1.0 -> 0 in 2s.
  private trauma = 0;
  private traumaDecay = 0.5; // per second
  private maxTranslation = 2.0; // world units at trauma=1 (≈20px on screen)
  // Directional bias: shake pushes the camera away from the impact source.
  private biasX = 0;
  private biasZ = 0;
  // Smooth-noise phase accumulators (sin-based, not pure random).
  private shakeTime = 0;
  // Multiplier applied to the trauma shake amplitude (cinematic scaling).
  private shakeMultiplier = 1;

  // --- Cinematic camera system ---
  // Camera modes. NORMAL preserves the existing 3/4 follow camera; the others
  // are dramatic angles for key moments (totem checks, descents, deep layers).
  static readonly CAMERA_MODES = {
    NORMAL: 'NORMAL',
    CINEMATIC_ORBIT: 'CINEMATIC_ORBIT',
    DRAMATIC_LOW: 'DRAMATIC_LOW',
    WIDE_PULLBACK: 'WIDE_PULLBACK',
    DUTCH_TILT: 'DUTCH_TILT',
  } as const;

  // currentCameraMode is the mode we are visually blending away from;
  // targetCameraMode is the mode we are blending toward. modeBlend goes
  // 0 -> 1 over ~0.5s; when it reaches 1, currentCameraMode snaps to target.
  private currentCameraMode: string = 'NORMAL';
  private targetCameraMode: string = 'NORMAL';
  private modeBlend = 1; // 1 = settled on targetCameraMode
  private readonly modeBlendDuration = 0.5; // seconds
  private modeBlendSpeed = 1 / 0.5;

  // Dutch tilt (camera roll). baseDutchAngle is set from layer depth; manualRoll
  // is set explicitly via setCameraRoll. Combined roll is applied AFTER lookAt.
  private baseDutchAngle = 0; // radians, set by setLayerDepth
  private manualRoll = 0; // radians, set by setCameraRoll
  private layerDepth = 1;

  // Dream stability (0..100). Low stability adds a pulsing tilt + wobble.
  private stability = 100;

  // Lighting.
  private ambient: THREE.AmbientLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;
  private accentLight: THREE.PointLight;
  private accentLights: THREE.PointLight[] = [];
  private accentLightGroup: THREE.Group;

  // Base bloom strength (set per-layer by setTheme); update() breathes around it.
  private baseBloomStrength = 0.6;

  // Track whether the lantern shadow has been configured (the lantern light is
  // created lazily by WorldRenderer/CharacterFactory, which we cannot modify,
  // so we scan the scene for it and configure shadows once it appears).
  private lanternShadowConfigured = false;

  // Diorama orthographic view size. Larger = more room/environment visible.
  private viewSize = 30;
  private lanternSpot: THREE.SpotLight | null = null;
  private lanternHalo: THREE.Sprite | null = null;

  // Volumetric light shafts — every dream layer gets its own accent shafts.
  private lightShafts: THREE.Mesh[] = [];
  private lightShaftGroup: THREE.Group;
  private currentLayerDepth = 1;

  // Cinematic post overrides.
  private whiteoutTimer = 0;
  private whiteoutAmount = 0;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;

    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // ACESFilmic gives a cinematic, filmic look in dark scenes. Exposure 1.2
    // lifts the midtones so the dream is visible without washing out highlights.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x5a4632, 1.0);

    // --- Shadows ---
    // PCFSoftShadowMap gives soft, dream-like shadow edges.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // --- Camera (diorama/room view, not tight follow) ---
    // Wide enough to frame the whole room plus environment, low enough
    // to read as a stage the player is entering rather than falling into.
    this.viewSize = 44;
    const aspect = width / height;
    this.camera = new THREE.OrthographicCamera(
      -this.viewSize / 2 * aspect,
      this.viewSize / 2 * aspect,
      this.viewSize / 2,
      -this.viewSize / 2,
      0.1,
      1000,
    );
    this.camera.position.set(28, 16, 28);
    this.camera.lookAt(0, 0, 0);

    // --- Scene + fog ---
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x3a2e22);
    this.scene.fog = new THREE.FogExp2(0x3a2e22, 0.004); // lighter fog

    // --- Lighting (cinematic: pools of light, dark corners, rim highlights) ---
    // Hemisphere light: clean neutral fill so the stylized colors read.
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.5);
    this.scene.add(this.hemiLight);

    // Ambient base — high so the diorama is bright and flat.
    this.ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.ambient);

    // Main directional light: soft top-down rim for minimal form, no shadows.
    this.rimLight = new THREE.DirectionalLight(0xffffff, 0.55);
    this.rimLight.position.set(8, 60, 8);
    this.rimLight.target.position.set(0, 0, 0);
    this.rimLight.castShadow = false;
    this.rimLight.shadow.camera.near = 1;
    this.rimLight.shadow.camera.far = 80;
    this.rimLight.shadow.camera.left = -30;
    this.rimLight.shadow.camera.right = 30;
    this.rimLight.shadow.camera.top = 30;
    this.rimLight.shadow.camera.bottom = -30;
    this.rimLight.shadow.bias = -0.0005;
    this.scene.add(this.rimLight);
    this.scene.add(this.rimLight.target);

    // Per-layer accent light: tints the room center with the layer's accent.
    this.accentLight = new THREE.PointLight(0xffe0b0, 0.8, 50, 2);
    this.accentLight.position.set(0, 3.5, 0);
    this.scene.add(this.accentLight);

    // Corner/ceiling accent lights: four point lights that follow the player and
    // paint the architecture from dramatic angles. Colors are set per-layer.
    this.accentLightGroup = new THREE.Group();
    this.accentLightGroup.name = 'accent-lights';
    this.scene.add(this.accentLightGroup);
    const accentOffsets: Array<[number, number, number, number]> = [
      [-12, 6, 10, 0.4],
      [14, 7, -8, 0.5],
      [-10, 5, -12, 0.4],
      [12, 8, 6, 0.5],
    ];
    for (const off of accentOffsets) {
      const pl = new THREE.PointLight(0xffe0b0, off[3], 40, 2);
      pl.position.set(off[0], off[1], off[2]);
      this.accentLights.push(pl);
      this.accentLightGroup.add(pl);
    }

    // --- Light shaft group (volumetric god rays, all layers) ---
    this.lightShaftGroup = new THREE.Group();
    this.lightShaftGroup.name = 'light-shafts';
    this.scene.add(this.lightShaftGroup);

    // --- Post-processing ---
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(width, height);

    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // Selective bloom: threshold 0.85 means only bright/emissive objects
    // (totem, fragments, anchors, projection eyes) bloom. Walls/floor are
    // matte and stay below the threshold — creating visual hierarchy.
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.08, // strength (base)
      0.15, // radius
      0.9, // threshold — only bright/emissive objects bloom
    );
    this.composer.addPass(this.bloomPass);

    this.colorPass = new ShaderPass(ColorGradeShader);
    this.colorPass.uniforms.uTint.value = new THREE.Color(0xffffff);
    this.colorPass.uniforms.uLift.value = new THREE.Color(0x000000);
    this.colorPass.uniforms.uStability.value = 1.0;
    this.colorPass.uniforms.uWhiteout.value = 0.0;
    this.colorPass.uniforms.uDescentBlur.value = 0.0;
    this.composer.addPass(this.colorPass);

    // Depth of field: subtle bokeh blur on distant geometry.
    // focus=15 ≈ player distance; aperture/maxblur kept very low so the
    // effect is a gentle cinematic blur, not a strong defocus.
    // DISABLED: BokehPass causes black screens when the camera moves or rooms
    // rebuild — the depth buffer becomes inconsistent and everything blurs out.
    // Re-enable only after verifying depth buffer stability across room transitions.
    this.bokehPass = new BokehPass(this.scene, this.camera, {
      focus: 15.0,
      aperture: 0.002,
      maxblur: 0.004,
    });
    this.bokehPass.enabled = false;

    // OutputPass handles sRGB conversion + tone mapping application AFTER bloom
    // so the final image is color-correct. This prevents the washed-out / crushed
    // look that happens when tone mapping is applied before post-processing.
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);
    this.outputPass.renderToScreen = true;
  }

  /** Detect the dream layer from the background color string. */
  private detectLayerFromBg(bgColor: string): number {
    const c = new THREE.Color(bgColor);
    // Limbo: pure black (#000000)
    if (c.r < 0.05 && c.g < 0.05 && c.b < 0.05) return 99;
    // Current: blue/teal dominant (#2a5266)
    if (c.b > c.r && c.b > c.g) return 2;
    // Abyss: red dominant (#5a2828)
    if (c.r > c.b && c.r > 0.25 && c.g < c.r * 0.7) return 3;
    // Default: warm brown -> Surface (#5a4632)
    return 1;
  }

  /** Build volumetric light shaft meshes for the current dream layer. */
  private createLightShafts(
    depth: number,
    accentColor: THREE.ColorRepresentation,
  ): void {
    this.clearLightShafts();

    if (depth >= 99) return;

    const baseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0.12 },
        uColor: { value: new THREE.Color(accentColor) },
        uTime: { value: 0 },
      },
      vertexShader: LIGHT_SHAFT_VERTEX,
      fragmentShader: LIGHT_SHAFT_FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });

    const shafts: Array<{
      pos: [number, number, number];
      rot: [number, number, number];
      size: [number, number];
      opacity: number;
    }> = [];

    if (depth === 1) {
      // Surface: warm, soft vertical shafts from above.
      baseMaterial.uniforms.uOpacity.value = 0.13;
      const positions: Array<[number, number, number]> = [
        [-6, 7, -4],
        [-2, 8, 2],
        [3, 7, -3],
        [6, 9, 3],
        [-5, 9, 4],
      ];
      const yRot = [0.15, -0.1, 0.08, -0.12, 0.05];
      for (let i = 0; i < positions.length; i++) {
        shafts.push({
          pos: positions[i],
          rot: [-0.2, yRot[i], 0],
          size: [2.0, 8.0],
          opacity: 0.13,
        });
      }
    } else if (depth === 2) {
      // Current: tall, straight, cold vertical shafts.
      baseMaterial.uniforms.uOpacity.value = 0.1;
      const positions: Array<[number, number, number]> = [
        [-8, 7, -6],
        [-4, 9, 4],
        [0, 8, -3],
        [4, 10, 5],
        [8, 7, -5],
        [2, 8, 7],
      ];
      for (let i = 0; i < positions.length; i++) {
        shafts.push({
          pos: positions[i],
          rot: [0.0, (Math.random() - 0.5) * 0.1, 0],
          size: [1.4, 12.0],
          opacity: 0.1,
        });
      }
    } else if (depth === 3) {
      // Abyss: broken, diagonal crimson shards.
      baseMaterial.uniforms.uOpacity.value = 0.08;
      for (let i = 0; i < 10; i++) {
        const x = (Math.random() - 0.5) * 22;
        const z = (Math.random() - 0.5) * 18;
        const y = 4 + Math.random() * 7;
        shafts.push({
          pos: [x, y, z],
          rot: [
            -0.4 + Math.random() * 0.4,
            Math.random() * Math.PI,
            (Math.random() - 0.5) * 0.4,
          ],
          size: [0.8 + Math.random() * 0.6, 4 + Math.random() * 5],
          opacity: 0.08,
        });
      }
    }

    for (let i = 0; i < shafts.length; i++) {
      const s = shafts[i];
      const mat = baseMaterial.clone();
      mat.uniforms.uOpacity.value = s.opacity;
      mat.uniforms.uColor.value = new THREE.Color(accentColor);
      const geo = new THREE.PlaneGeometry(s.size[0], s.size[1]);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(s.pos[0], s.pos[1], s.pos[2]);
      mesh.rotation.x = s.rot[0];
      mesh.rotation.y = s.rot[1];
      mesh.rotation.z = s.rot[2];
      mesh.renderOrder = 1;
      this.lightShafts.push(mesh);
      this.lightShaftGroup.add(mesh);
    }
  }

  /** Remove and dispose all light shaft meshes. */
  private clearLightShafts(): void {
    for (const mesh of this.lightShafts) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.lightShaftGroup.remove(mesh);
    }
    this.lightShafts = [];
  }

  /**
   * Return a color grade for the layer: a tint (can be >1 to lift midtones) and
   * a lift color. This drives the color grade without relying on the theme's
   * foreground color, giving each layer a stronger identity.
   */
  private getLayerGrade(depth: number): { tint: THREE.Color; lift: THREE.Color } {
    // Diorama: keep the image neutral so the stylized materials read clearly.
    return { tint: new THREE.Color(0.98, 0.98, 0.98), lift: new THREE.Color(0, 0, 0) };
  }

  /** Update scene background, fog, bloom, color grade tint, and per-layer lighting. */
  setTheme(bgColor: string, fogColor: string, fogDensity: number, bloomStrength: number, tint: THREE.Color): void {
    const bg = new THREE.Color(bgColor);
    this.scene.background = bg;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = new THREE.Color(fogColor);
      this.scene.fog.density = fogDensity;
    }

    // Detect the layer from the background color so we can set per-layer
    // lighting without modifying WorldRenderer (which owns the call site).
    const depth = this.detectLayerFromBg(bgColor);
    this.currentLayerDepth = depth;
    // Set the base Dutch tilt for this layer depth (auto-wired here so
    // WorldRenderer does not need to call setLayerDepth separately).
    this.setLayerDepth(depth);
    const accent = LAYER_ACCENTS[depth] ?? 0xffe0b0;
    const accentColor = new THREE.Color(accent);

    // Layer-specific color grade: warm / cool / desaturated red.
    const grade = this.getLayerGrade(depth);
    this.colorPass.uniforms.uTint.value = grade.tint;
    this.colorPass.uniforms.uLift.value = grade.lift;

    // Update rim light color to the layer accent and keep it strong.
    this.rimLight.color.copy(accentColor);
    this.rimLight.intensity = 1.4;

    // Update the central accent light and the corner/ceiling accent lights.
    this.accentLight.color.copy(accentColor);
    this.accentLight.intensity = depth === 3 ? 0.6 : 0.45;
    for (const pl of this.accentLights) {
      pl.color.copy(accentColor);
      pl.intensity = depth === 3 ? 0.55 : 0.45;
    }

    // Ambient and hemisphere stay subtle but layer-tinted.
    if (depth === 2) {
      this.hemiLight.groundColor.set(0x1a3040);
      this.hemiLight.color.set(0x7aa8c8);
    } else if (depth === 3) {
      this.hemiLight.groundColor.set(0x301010);
      this.hemiLight.color.set(0xc07070);
    } else {
      this.hemiLight.groundColor.set(0x4a3828);
      this.hemiLight.color.set(0xb09678);
    }

    // Diorama: no god-ray light shafts — they read as bright clutter from high camera.

    // Diorama: flat unlit materials — no bloom, no halos around bright objects.
    this.baseBloomStrength = 0.0;
    this.bloomPass.strength = 0.0;
    this.bloomPass.threshold = 2.0; // disable bloom
    this.bloomPass.radius = 0.0;
  }

  /** Smoothly move camera to follow player (3/4 perspective). */
  setCameraTarget(x: number, y: number, lerp: number): void {
    this.camTargetX = x;
    this.camTargetZ = y;
    this.camLerp = lerp;
  }

  /**
   * Switch the cinematic camera mode. The transition is blended smoothly over
   * ~0.5s (no snap) by keeping the previous mode as the blend source.
   * Valid modes: NORMAL, CINEMATIC_ORBIT, DRAMATIC_LOW, WIDE_PULLBACK, DUTCH_TILT.
   */
  setCameraMode(mode: string): void {
    const valid = Object.values(SceneManager.CAMERA_MODES);
    const next = valid.includes(mode as any) ? mode : 'NORMAL';
    if (next === this.targetCameraMode) return;
    // Blend from the current visual mode toward the new target.
    this.currentCameraMode = this.targetCameraMode;
    this.targetCameraMode = next;
    this.modeBlend = 0;
    this.modeBlendSpeed = 1 / this.modeBlendDuration;
  }

  /**
   * Roll the camera (Dutch tilt) by a manual angle in radians. This is added
   * on top of the per-layer base Dutch tilt. Applied AFTER lookAt each frame.
   */
  setCameraRoll(angle: number): void {
    this.manualRoll = angle;
  }

  /**
   * Scale the trauma-based screen shake. 1 = default, 0 = no shake, >1 = more.
   * Useful for cinematics where you want to dampen or amplify shake.
   */
  setCameraShakeIntensity(multiplier: number): void {
    this.shakeMultiplier = multiplier;
  }

  /**
   * Set the dream layer depth, which drives the base Dutch tilt:
   *   Layer 1: 0° (normal)
   *   Layer 2: 2° (barely perceptible unease)
   *   Layer 3: 5° (visible tilt — the dream is unstable)
   *   Limbo (99): 0° (the void is still)
   * Also stored as layerDepth for sway-amplitude scaling.
   */
  setLayerDepth(depth: number): void {
    this.layerDepth = depth;
    const deg2rad = Math.PI / 180;
    if (depth === 2) this.baseDutchAngle = 2 * deg2rad;
    else if (depth === 3) this.baseDutchAngle = 5 * deg2rad;
    else this.baseDutchAngle = 0; // layer 1 and limbo
  }

  /**
   * Feed the current dream stability (0..100). Below 30 the camera gains a
   * pulsing extra Dutch tilt (up to 8°) and an idle wobble — the dreamer is
   * losing control of the dream.
   */
  setStability(value: number): void {
    this.stability = Math.max(0, Math.min(100, value));
  }

  /** Get the current cinematic camera mode (the settled/visual mode). */
  getCameraMode(): string {
    return this.currentCameraMode;
  }

  /**
   * Add trauma to the screen-shake system. Trauma is clamped to [0,1].
   * Optional source position gives a directional bias — the camera is pushed
   * away from the impact source so the shake reads as coming from that hit.
   */
  addTrauma(amount: number, sourceX?: number, sourceZ?: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
    if (sourceX !== undefined && sourceZ !== undefined) {
      // Bias direction: from source toward camera target (away from impact).
      const dx = this.camTargetX - sourceX;
      const dz = this.camTargetZ - sourceZ;
      const len = Math.hypot(dx, dz) || 1;
      // Blend in the new bias so a fresh big hit can re-steer the shake.
      this.biasX = (this.biasX + dx / len) * 0.5;
      this.biasZ = (this.biasZ + dz / len) * 0.5;
    }
    // Big impact events (successful kicks) trigger a white-out color grade.
    if (amount >= 0.95) {
      this.whiteoutTimer = 0.5;
      this.whiteoutAmount = 1.0;
    }
  }

  /**
   * Legacy addShake API — kept for compatibility. Converts a raw shake
   * magnitude (the old world-unit scale) into a trauma addition. The old
   * values ranged ~8-25; map that onto trauma so the feel is preserved but
   * now flows through the trauma pipeline.
   */
  addShake(amount: number): void {
    // Old shake was applied directly as world units; ~25 was the biggest.
    // Normalize: 25 -> ~0.9 trauma, 8 -> ~0.3 trauma.
    const trauma = Math.min(1.0, amount / 28);
    this.addTrauma(trauma);
  }

  /** Per-frame update: camera lerp, shake decay, animated uniforms. */
  update(dt: number): void {
    // Configure lantern shadows once the lantern light appears in the scene.
    // The lantern PointLight is created lazily by WorldRenderer; we scan for it
    // here because we cannot modify WorldRenderer or CharacterFactory.
    if (!this.lanternShadowConfigured) {
      this.configureLanternShadows();
    }

    // Lerp camera toward target.
    const t = 1 - Math.pow(1 - this.camLerp, dt * 60);
    this.camCurrentX += (this.camTargetX - this.camCurrentX) * t;
    this.camCurrentZ += (this.camTargetZ - this.camCurrentZ) * t;

    // Trauma-based shake: amplitude = trauma^2, smooth sin-based noise.
    let sx = 0;
    let sy = 0;
    let sz = 0;
    if (this.trauma > 0.001) {
      this.shakeTime += dt;
      const amp = this.trauma * this.trauma * this.maxTranslation;
      // Three independent sin waves at incommensurate frequencies so the
      // result is smooth but never repeats exactly — reads as organic
      // shake, not as a bug/random jitter.
      const tt = this.shakeTime;
      sx = Math.sin(tt * 31.0) * Math.sin(tt * 17.3) * amp;
      sy = Math.sin(tt * 23.7 + 1.3) * Math.sin(tt * 13.1) * amp * 0.5;
      sz = Math.sin(tt * 29.1 + 2.7) * Math.sin(tt * 19.7) * amp;
      // Fold in the directional bias (away from impact source).
      sx += this.biasX * amp * 0.6;
      sz += this.biasZ * amp * 0.6;
      // Decay trauma linearly: 0.5/s means 1.0 -> 0 in 2s.
      this.trauma = Math.max(0, this.trauma - this.traumaDecay * dt);
      // Fade the bias out with the trauma so direction relaxes as shake ends.
      if (this.trauma <= 0) {
        this.biasX = 0;
        this.biasZ = 0;
      }
    } else {
      this.trauma = 0;
      this.biasX = 0;
      this.biasZ = 0;
    }
    // Apply the cinematic shake multiplier (dampen/amplify for cinematics).
    sx *= this.shakeMultiplier;
    sy *= this.shakeMultiplier;
    sz *= this.shakeMultiplier;

    // --- Cinematic camera mode transition ---
    // Blend smoothly from currentCameraMode -> targetCameraMode over ~0.5s
    // so mode switches never snap. When the blend completes, the current mode
    // snaps to the target and the blend rests at 1.
    if (this.modeBlend < 1) {
      this.modeBlend = Math.min(1, this.modeBlend + dt * this.modeBlendSpeed);
      if (this.modeBlend >= 1) {
        this.currentCameraMode = this.targetCameraMode;
      }
    }

    // Shared time for sway + roll (use the pre-increment uTime so it matches
    // the prior frame's animated uniforms, consistent with bloom breathing).
    const time = this.colorPass.uniforms.uTime.value;

    // Compute the camera position for both the source and target modes, then
    // lerp by modeBlend. This makes every mode-to-mode transition smooth.
    const posFrom = this.computeModePosition(this.currentCameraMode, time);
    const posTo = this.computeModePosition(this.targetCameraMode, time);
    const b = this.modeBlend;
    const camX = posFrom.x + (posTo.x - posFrom.x) * b;
    const camY = posFrom.y + (posTo.y - posFrom.y) * b;
    const camZ = posFrom.z + (posTo.z - posFrom.z) * b;

    // Idle sway: a subtle circular drift the camera traces over ~10s, plus a
    // secondary gentle drift. Deeper layers sway a little more; low stability
    // adds a faster wobble (the dreamer is losing control of the dream).
    const sway = this.getIdleSway(time);
    this.camera.position.set(
      camX + sx + sway.x,
      camY + sy + sway.y,
      camZ + sz,
    );
    // Diorama: follow the player, keeping them centered in the frame.
    const lookX = this.camCurrentX + sway.x * 0.2;
    const lookZ = this.camCurrentZ + sway.y * 0.2;
    this.camera.lookAt(lookX, 0, lookZ);

    // Dutch tilt / camera roll — applied AFTER lookAt so it tilts the view.
    // Combines the per-layer base tilt, a manual roll, an extra tilt in
    // DUTCH_TILT mode, and a low-stability pulse (up to 8°). Blended across
    // the mode transition so roll eases in/out smoothly.
    const rollFrom = this.computeRollForMode(this.currentCameraMode, time);
    const rollTo = this.computeRollForMode(this.targetCameraMode, time);
    const roll = rollFrom + (rollTo - rollFrom) * b;
    this.camera.rotation.z = roll;

    // Diorama: bloom is disabled, keep the pass weight at zero.
    this.bloomPass.strength = 0.0;

    // Animate color-grade uniforms.
    this.colorPass.uniforms.uTime.value += dt;
    this.colorPass.uniforms.uStability.value = this.stability / 100;

    // Whiteout decay.
    if (this.whiteoutTimer > 0) {
      this.whiteoutTimer = Math.max(0, this.whiteoutTimer - dt);
      this.whiteoutAmount = this.whiteoutTimer / 0.5;
    } else {
      this.whiteoutAmount = 0;
    }
    this.colorPass.uniforms.uWhiteout.value = this.whiteoutAmount;

    // Keep the dramatic accent lights and rim light close to the player so they
    // always paint the architecture from interesting angles.
    this.updateAccentAndRimLights();

    // Animate light shaft materials.
    for (const shaft of this.lightShafts) {
      const mat = shaft.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value += dt;
    }

    // Keep the lantern spot target in sync with the player group's rotation.
    if (this.lanternSpot) {
      this.lanternSpot.target.updateMatrixWorld();
    }
  }

  /**
   * Compute the camera position (without shake) for a given cinematic mode.
   * The position orbits/follows the current camera target (camCurrentX/Z),
   * which is itself lerped toward the player each frame by setCameraTarget.
   * - NORMAL: the existing 3/4 follow camera (above + behind, looking down).
   * - CINEMATIC_ORBIT: slow circular orbit, slightly higher, dream-like.
   * - DRAMATIC_LOW: low angle looking up at the player (totem checks).
   * - WIDE_PULLBACK: pulled way back, showing the whole room (descent impact).
   * - DUTCH_TILT: same framing as NORMAL; the roll (applied later) does the work.
   */
  private computeModePosition(mode: string, time: number): { x: number; y: number; z: number } {
    const tx = this.camCurrentX;
    const tz = this.camCurrentZ;
    switch (mode) {
      case 'CINEMATIC_ORBIT': {
        // Slow orbit around the player, keeping the diorama framing.
        const ang = time * 0.08;
        const r = 24;
        return {
          x: tx + Math.cos(ang) * r,
          y: 22,
          z: tz + Math.sin(ang) * r,
        };
      }
      case 'DRAMATIC_LOW': {
        // Low angle close-up on the player for totem checks.
        return { x: tx + 14, y: 6, z: tz + 14 };
      }
      case 'WIDE_PULLBACK': {
        // Pulled way back from the player, showing the room around them.
        return { x: tx + 34, y: 24, z: tz + 34 };
      }
      case 'DUTCH_TILT': {
        // Same framing as NORMAL; the roll creates unease.
        return { x: tx + 28, y: 14, z: tz + 28 };
      }
      case 'NORMAL':
      default: {
        // Diorama camera: outside the room, low enough for a side-view stage.
        return { x: tx + 28, y: 14, z: tz + 28 };
      }
    }
  }

  /**
   * Enhanced idle sway: the camera traces a tiny circle over ~10 seconds (not
   * just a linear sway), with a secondary gentle drift. Deeper layers increase
   * the amplitude slightly; low stability adds a faster wobble. Returns the
   * x/y offset to add to the camera position.
   */
  private getIdleSway(time: number): { x: number; y: number } {
    // Primary circular drift — period ~10s.
    const period = 10;
    const ang = time * ((Math.PI * 2) / period);
    let amp = 0.4;
    // Deeper layers sway a little more; Limbo stays still (the void is calm).
    if (this.layerDepth === 2) amp *= 1.3;
    else if (this.layerDepth === 3) amp *= 1.6;
    let sx = Math.cos(ang) * amp;
    let sy = Math.sin(ang) * amp * 0.5;
    // Secondary subtle drift so the circle is never perfectly closed.
    sx += Math.sin(time * 0.37) * 0.05;
    sy += Math.sin(time * 0.29 + 1.7) * 0.04;
    // Low stability wobble — the dreamer is losing control of the dream.
    if (this.stability < 30) {
      const wobble = 1 - this.stability / 30; // 0..1 as stability drops 30->0
      const wAmp = wobble * 0.6;
      sx += Math.sin(time * 3.1) * wAmp;
      sy += Math.sin(time * 2.7 + 0.5) * wAmp * 0.6;
    }
    return { x: sx, y: sy };
  }

  /**
   * Compute the camera roll (Dutch tilt, radians) for a given mode. Combines:
   *   - baseDutchAngle (per-layer, set by setLayerDepth)
   *   - manualRoll (set by setCameraRoll)
   *   - +7° extra in DUTCH_TILT mode
   *   - a low-stability pulse adding up to 8° when stability < 30
   */
  private computeRollForMode(mode: string, time: number): number {
    const deg2rad = Math.PI / 180;
    let roll = this.baseDutchAngle + this.manualRoll;
    if (mode === 'DUTCH_TILT') {
      roll += 7 * deg2rad;
    }
    if (this.stability < 30) {
      const wobble = 1 - this.stability / 30; // 0..1
      const pulse = Math.sin(time * 2.0) * 0.5 + 0.5; // 0..1, ~0.32s period
      roll += wobble * pulse * (8 * deg2rad);
    }
    return roll;
  }

  /** Move the dramatic accent point lights and rim light with the player target. */
  private updateAccentAndRimLights(): void {
    const tx = this.camCurrentX;
    const tz = this.camCurrentZ;

    // Main accent light floats just above the player.
    this.accentLight.position.set(tx, 3.5, tz);

    // Four corner/ceiling accent lights follow at dramatic offsets.
    const offsets: Array<[number, number, number]> = [
      [-12, 6, 10],
      [14, 7, -8],
      [-10, 5, -12],
      [12, 8, 6],
    ];
    for (let i = 0; i < this.accentLights.length; i++) {
      const off = offsets[i] || [0, 5, 0];
      this.accentLights[i].position.set(tx + off[0], off[1], tz + off[2]);
    }

    // Keep the rim light behind and above the player, shining forward.
    this.rimLight.position.set(tx + 6, 32, tz - 24);
    this.rimLight.target.position.set(tx, 0, tz);
    this.rimLight.target.updateMatrixWorld();
  }

  /**
   * Scan the scene for the player's lantern PointLight and enable shadows on it.
   * Also adds a focused SpotLight (lantern beam) and a soft glow halo sprite.
   * Called from update() until the lantern is found. Once configured, the flag
   * is set so we don't re-scan every frame.
   */
  private configureLanternShadows(): void {
    let lantern: THREE.PointLight | null = null;
    this.scene.traverse((obj: THREE.Object3D) => {
      if (obj.name === 'lanternLight' && (obj as any).isPointLight) {
        lantern = obj as THREE.PointLight;
      }
    });
    if (!lantern) return;

    const light = lantern as THREE.PointLight;
    light.castShadow = true;
    // High-resolution shadow map for the lantern so shadows read as crisp.
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 30;
    light.shadow.bias = -0.0005;

    const parent = light.parent || this.scene;

    // Add a focused lantern beam (SpotLight) that follows the player and casts
    // a narrow shadow cone in the direction the player is facing.
    if (!this.lanternSpot) {
      const spot = new THREE.SpotLight(0xffe0b0, 4.0, 50, Math.PI / 5, 0.25, 1.0);
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.camera.near = 0.5;
      spot.shadow.camera.far = 40;
      spot.shadow.bias = -0.0001;
      spot.position.copy(light.position);

      const target = new THREE.Object3D();
      target.position.set(light.position.x, light.position.y, light.position.z - 4);
      parent.add(target);
      spot.target = target;
      parent.add(spot);
      this.lanternSpot = spot;
    }

    // Add a soft halo billboard around the lantern so it reads as a light source.
    if (!this.lanternHalo) {
      const size = 64;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
        grad.addColorStop(0.45, 'rgba(255, 220, 170, 0.25)');
        grad.addColorStop(1, 'rgba(255, 220, 170, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
      }
      const tex = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color(0xffddaa),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Sprite(mat);
      halo.position.copy(light.position);
      halo.scale.set(1.4, 1.4, 1.4);
      halo.renderOrder = 3;
      parent.add(halo);
      this.lanternHalo = halo;
    }

    this.lanternShadowConfigured = true;
  }

  /** Render the composed frame. */
  render(): void {
    // Detect descent by the unusually high camera altitude (the descent phase
    // pulls the camera up to 40 world units). Add a slow-motion blur there.
    const y = this.camera.position.y;
    if (y > 24 && this.currentCameraMode !== 'CINEMATIC_ORBIT') {
      const blur = Math.min(1, (y - 24) / 16);
      this.colorPass.uniforms.uDescentBlur.value = blur;
    } else {
      this.colorPass.uniforms.uDescentBlur.value = 0.0;
    }

    if (this.lanternSpot) {
      this.lanternSpot.target.updateMatrixWorld();
    }

    this.composer.render();
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.Camera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getComposer(): EffectComposer {
    return this.composer;
  }

  /**
   * Add a post-processing pass into the composer chain. The pass is inserted
   * BEFORE the BokehPass (and thus before the OutputPass) so that screen-space
   * distortion runs after color grading but before depth-of-field blur.
   * This keeps the pass chain order:
   *   render -> bloom -> color -> [inserted pass] -> bokeh -> output
   */
  addPass(pass: { renderToScreen?: boolean }): void {
    // Find the index of the bokeh pass so we insert before it.
    const passes = (this.composer as any).passes as any[];
    let insertIndex = passes.length - 1; // default: before output (last)
    const bokehIdx = passes.indexOf(this.bokehPass);
    if (bokehIdx >= 0) {
      insertIndex = bokehIdx;
    }
    // The pass being inserted should not render to screen — output pass owns that.
    (pass as any).renderToScreen = false;
    this.composer.insertPass(pass as any, insertIndex);
  }

  /** Resize the renderer + composer + camera frustum. */
  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    const aspect = width / height;
    if (this.camera instanceof THREE.OrthographicCamera) {
      this.camera.left = -this.viewSize / 2 * aspect;
      this.camera.right = this.viewSize / 2 * aspect;
      this.camera.top = this.viewSize / 2;
      this.camera.bottom = -this.viewSize / 2;
      this.camera.updateProjectionMatrix();
    }
    this.bloomPass.setSize(width, height);
  }

  /** Clean up renderer, composer, geometries, materials. */
  dispose(): void {
    // Clear light shafts.
    this.clearLightShafts();

    // Clean up accent lights.
    for (const pl of this.accentLights) {
      this.accentLightGroup.remove(pl);
      pl.dispose();
    }
    this.accentLights = [];
    this.scene.remove(this.accentLightGroup);

    // Clean up lantern beam and halo.
    if (this.lanternSpot) {
      this.scene.remove(this.lanternSpot);
      this.lanternSpot.dispose();
      this.lanternSpot = null;
    }
    if (this.lanternHalo) {
      this.lanternHalo.material.dispose();
      if (this.lanternHalo.parent) this.lanternHalo.parent.remove(this.lanternHalo);
      this.lanternHalo = null;
    }

    // Traverse scene and dispose geometries/materials.
    this.scene.traverse((obj: THREE.Object3D) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) {
        mat.forEach((m) => m.dispose());
      } else if (mat) {
        mat.dispose();
      }
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}
