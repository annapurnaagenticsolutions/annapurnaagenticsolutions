// ONEIRIC — Atmosphere & dream-layer effects (Three.js r165)
// Each dream layer gets a distinct, surreal atmosphere: fog, particles,
// light, and a subtle full-screen dream-distortion post pass.
//
// This module owns the *atmosphere* of a layer. It does not own the world
// geometry, the bloom pass, or the render composer — it only exposes the
// distortion ShaderPass via getDistortionPass() and bloom tuning via
// getBloomConfig() so the renderer pipeline can wire them in.

import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import type { LayerTheme } from '../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ParticleKind = 'drift' | 'rain' | 'ash' | 'debris' | 'void';

interface ParticleSystem {
  points: THREE.Points;
  positions: Float32Array;
  velocities: Float32Array; // x,y,z velocity in world units / second
  sizes: Float32Array;
  rotations: Float32Array;
  seeds: Float32Array; // per-particle phase for sway / drift
  count: number;
  area: number;
  kind: ParticleKind;
  material: THREE.ShaderMaterial;
  geometry: THREE.BufferGeometry;
}

export interface BloomConfig {
  strength: number;
  radius: number;
  threshold: number;
  tint: THREE.Color;
}

// ---------------------------------------------------------------------------
// Shader source: dream distortion (post-processing pass)
// ---------------------------------------------------------------------------

const DISTORTION_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const DISTORTION_FRAGMENT = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float distortionStrength;
  uniform float aberrationStrength;
  uniform float vignetteStrength;
  // Volumetric dream-fog uniforms (screen-space height approximation).
  uniform float uFogDensity;
  uniform float uFogHeight;
  uniform vec3  uFogColor;
  uniform float uFogEnabled;
  // Dream film-effect uniforms.
  uniform float uDoubleVision;  // 0..1 — ghost copy offset (deeper layers)
  uniform float uHalation;      // 0..1 — color bleed from bright areas
  uniform float uLightLeak;     // 0..1 — warm film light leaks at edges
  uniform float uLightning;     // Abyss screen flicker
  uniform vec2  uVignetteCenter; // follows the player, not the screen center
  varying vec2 vUv;

  // cheap deterministic noise for film grain
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
  }

  void main() {
    vec2 uv = vUv;
    vec2 center = vec2(0.5);
    vec2 toCenter = uv - center;
    float distFromCenter = length(toCenter);
    float t = time;

    // ---- Multi-octave distortion (3 octaves, organic dream warp) ----
    vec2 warp = vec2(0.0);
    // Octave 1: low frequency, full amplitude — the broad dream swell.
    warp.x += sin(uv.y * 3.0 + t * 0.8) * distortionStrength * 1.0;
    warp.y += cos(uv.x * 2.5 + t * 0.6) * distortionStrength * 0.6;
    // Octave 2: mid frequency, mid amplitude — gentle ripples.
    warp.x += sin(uv.y * 7.0 + t * 1.3 + 1.7) * distortionStrength * 0.4;
    warp.y += cos(uv.x * 6.0 + t * 1.1 + 0.5) * distortionStrength * 0.3;
    // Octave 3: high frequency, low amplitude — fine shimmer.
    warp.x += sin(uv.y * 15.0 + t * 2.1 + 3.2) * distortionStrength * 0.15;
    warp.y += cos(uv.x * 13.0 + t * 1.9 + 2.1) * distortionStrength * 0.10;

    // ---- Radial breathing — the dream pulses from center outward ----
    float breathe = sin(t * 1.5) * 0.5 + 0.5;
    vec2 radialDir = normalize(toCenter + vec2(0.0001));
    warp += radialDir * breathe * distortionStrength * 0.35 * distFromCenter * 2.0;

    // ---- Edge warp — stronger distortion near edges, subtler in center ----
    float edgeFalloff = smoothstep(0.15, 0.75, distFromCenter);
    warp *= (0.25 + edgeFalloff * 0.75);

    uv += warp;

    // ---- Chromatic aberration (dream color fringing) ----
    vec4 color;
    if (aberrationStrength > 0.001) {
      float off = aberrationStrength * 0.004;
      color.r = texture2D(tDiffuse, uv + vec2(off, 0.0)).r;
      color.g = texture2D(tDiffuse, uv).g;
      color.b = texture2D(tDiffuse, uv - vec2(off, 0.0)).b;
      color.a = 1.0;
    } else {
      color = texture2D(tDiffuse, uv);
    }

    // ---- Subtle double-vision (deeper layers: perception is unstable) ----
    if (uDoubleVision > 0.001) {
      vec2 ghostUv = vUv + vec2(0.006, 0.0) * uDoubleVision;
      vec4 ghost = texture2D(tDiffuse, ghostUv);
      color.rgb = mix(color.rgb, (color.rgb + ghost.rgb) * 0.5, uDoubleVision * 0.35);
    }

    // ---- Dream halation — color bleed from bright objects (not brightness bloom) ----
    if (uHalation > 0.001) {
      vec3 bright = clamp((color.rgb - 0.55) / 0.45, 0.0, 1.0);
      float bLum = max(bright.r, max(bright.g, bright.b));
      if (bLum > 0.01) {
        vec2 hoff = vec2(0.005, 0.0);
        vec3 bleed = texture2D(tDiffuse, uv + hoff).rgb * 0.5
                   + texture2D(tDiffuse, uv - hoff).rgb * 0.5;
        bleed = clamp((bleed - 0.5) / 0.5, 0.0, 1.0);
        color.rgb += bleed * bright * uHalation * 0.6;
      }
    }

    // ---- Volumetric height-based dream fog (screen-space approximation) ----
    // Fog is thicker near the bottom of the screen (near ground) and thinner
    // up high — a "dream mist" that flows with subtle internal motion.
    if (uFogEnabled > 0.5) {
      float heightFactor = pow(1.0 - vUv.y, uFogHeight);
      // Flowing internal motion — the mist drifts, never static.
      float flow = sin(vUv.x * 4.0 + t * 0.3) * 0.15
                 + cos(vUv.x * 2.5 - t * 0.2 + 1.3) * 0.10;
      float density = uFogDensity * heightFactor * (1.0 + flow);
      // Clamp to 0.35 so fog is visible near the floor without washing out architecture.
      density = clamp(density, 0.0, 0.35);
      color.rgb = mix(color.rgb, uFogColor, density);
    }

    // ---- Lightning flicker (Abyss) ----
    if (uLightning > 0.001) {
      color.rgb += vec3(uLightning) * 0.25;
    }

    // ---- Vignette — darken the edges of the dream, centered on the player ----
    vec2 vc = clamp(uVignetteCenter, vec2(0.0), vec2(1.0));
    vec2 vd = vUv - vc;
    float vig = 1.0 - dot(vd, vd) * vignetteStrength;
    color.rgb *= clamp(vig, 0.0, 1.0);

    // ---- Light leaks — warm film streaks at screen edges, occasional ----
    if (uLightLeak > 0.001) {
      float edge = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)) * 2.0;
      float leakMask = smoothstep(0.72, 1.0, edge);
      float leakPulse = (sin(t * 0.7 + vUv.y * 8.0) * 0.5 + 0.5)
                      * (sin(t * 0.23 + vUv.x * 5.0) * 0.5 + 0.5);
      vec3 leakColor = vec3(1.0, 0.55, 0.25);
      color.rgb += leakColor * leakMask * leakPulse * uLightLeak * 0.35;
    }

    // ---- Film grain — minimal, doesn't fight the clean Inception read ----
    float grain = (hash(vUv * 1.5 + t) - 0.5) * 0.012;
    color.rgb += grain;

    gl_FragColor = color;
  }
`;

// ---------------------------------------------------------------------------
// Shader source: gradient sky dome
// ---------------------------------------------------------------------------

const SKY_VERTEX = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 topColor;
  uniform vec3 bottomColor;
  uniform float offset;
  uniform float exponent;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y + offset, 0.0, 1.0);
    float f = pow(h, exponent);
    gl_FragColor = vec4(mix(bottomColor, topColor, f), 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Shader source: soft glowing particles (NOT hard squares)
// ---------------------------------------------------------------------------

const PARTICLE_VERTEX = /* glsl */ `
  attribute float size;
  attribute float rotation;
  attribute float seed;
  varying float vRotation;
  varying float vSeed;
  varying float vDepth;     // view-space depth for fade
  varying vec3  vColorVar;  // per-particle color variation
  uniform float uPixelRatio;
  void main() {
    vRotation = rotation;
    vSeed = seed;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float depth = max(-mv.z, 0.1);
    vDepth = depth;
    // Size attenuation: bigger near camera, smaller far away — clamped.
    gl_PointSize = size * uPixelRatio * (260.0 / depth);
    gl_PointSize = clamp(gl_PointSize, 0.5, 64.0);
    gl_Position = projectionMatrix * mv;
    // Per-particle color variation derived from seed (no extra attribute cost).
    float cv1 = sin(seed * 12.9898) * 0.18;
    float cv2 = cos(seed *  7.1234) * 0.12;
    float cv3 = sin(seed *  3.5217 + 1.3) * 0.10;
    vColorVar = vec3(cv1, cv2, -cv1 * 0.4 + cv3);
  }
`;

// Round soft glow — used for drift & ash.
const PARTICLE_FRAGMENT_SOFT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vRotation;
  varying float vSeed;
  varying float vDepth;
  varying vec3  vColorVar;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    // Soft circular glow with a bright core and gentle falloff.
    float alpha = 1.0 - smoothstep(0.0, 0.5, d);
    alpha = pow(alpha, 1.4);
    // Depth-based transparency: farther particles fade out.
    float depthFade = clamp(1.0 - (vDepth - 8.0) / 70.0, 0.15, 1.0);
    // Per-particle color variation — each particle is slightly unique.
    vec3 col = uColor + vColorVar;
    gl_FragColor = vec4(col, alpha * uIntensity * depthFade);
  }
`;

// Elongated vertical streak — used for rain.
const PARTICLE_FRAGMENT_STREAK = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  varying float vRotation;
  varying float vSeed;
  varying float vDepth;
  varying vec3  vColorVar;
  void main() {
    vec2 uv = gl_PointCoord;
    // thin horizontal core
    float core = 1.0 - abs(uv.x - 0.5) * 2.0;
    core = smoothstep(0.0, 0.25, core);
    // fade toward the trailing top edge (rain falls down, head at bottom)
    float fade = smoothstep(0.0, 0.35, uv.y);
    float alpha = core * fade;
    if (alpha < 0.01) discard;
    // Depth-based transparency for rain streaks.
    float depthFade = clamp(1.0 - (vDepth - 8.0) / 70.0, 0.2, 1.0);
    vec3 col = uColor + vColorVar;
    gl_FragColor = vec4(col, alpha * uIntensity * depthFade);
  }
`;

// ---------------------------------------------------------------------------
// Atmosphere
// ---------------------------------------------------------------------------

export class Atmosphere {
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  // Distortion post pass + its material (the ShaderPass wraps the material).
  private distortionMaterial: THREE.ShaderMaterial;
  private distortionPass: ShaderPass;

  // Sky dome.
  private skyMaterial: THREE.ShaderMaterial;
  private skyMesh: THREE.Mesh;

  // Fog (exponential, density driven).
  private fog: THREE.FogExp2;

  // Ambient light — flickered in Abyss.
  private ambient: THREE.AmbientLight;

  // Mirror-floor metallic material for the Current layer.
  private floorMaterial: THREE.MeshStandardMaterial;

  // Active particle systems (one per layer; replaced on setLayer).
  private particleSystems: ParticleSystem[] = [];

  // Current layer state.
  private depth: number = 1;
  private theme: LayerTheme | null = null;
  private isLimbo: boolean = false;
  private isAbyss: boolean = false;
  private isCurrent: boolean = false;

  // Base distortion value (before Layer 3 breathing pulse). The actual
  // distortionStrength uniform is updated each frame for Abyss.
  private baseDistortion: number = 0.0;

  // Floor ripple strength for the current layer (0.0 = none, 0.3 = Layer 2,
  // 0.8 = Layer 3). Exposed via getFloorRippleStrength() for the orchestrator.
  private floorRippleStrength: number = 0.0;

  // Reference to the floor material's onBeforeCompile uniforms so we can
  // update uTime each frame for the ripple animation.
  private floorShaderUniforms: { [key: string]: { value: any } } | null = null;

  // Bloom tuning exposed to the renderer pipeline.
  private bloomConfig: BloomConfig = {
    strength: 0.2,
    radius: 0.4,
    threshold: 0.85,
    tint: new THREE.Color(1, 1, 1),
  };

  // Rain angle animation (Current layer).
  private rainAngle: number = 0.18; // radians from vertical

  // Abyss lightning flicker state.
  private lightningTimer = 0;
  private lightningAmount = 0.0;

  // Material enhancement throttle.
  private materialEnhanceTimer = 0.0;

  // Reusable temp color.
  private tmpColor: THREE.Color = new THREE.Color();

  // Disposal registry for materials we toggled wireframe on (Limbo).
  private wireframeRestore: Array<{ mat: THREE.Material; wireframe: boolean }> = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;

    // --- Dream distortion overlay material + ShaderPass ---
    this.distortionMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null as THREE.Texture | null },
        time: { value: 0 },
        distortionStrength: { value: 0.0 },
        aberrationStrength: { value: 0.0 },
        vignetteStrength: { value: 0.35 },
        // Volumetric dream-fog uniforms.
        uFogDensity: { value: 0.0 },
        uFogHeight: { value: 2.0 },
        uFogColor: { value: new THREE.Color(0x2a2018) },
        uFogEnabled: { value: 0.0 },
        // Dream film-effect uniforms.
        uDoubleVision: { value: 0.0 },
        uHalation: { value: 0.0 },
        uLightLeak: { value: 0.0 },
        uLightning: { value: 0.0 },
        uVignetteCenter: { value: new THREE.Vector2(0.5, 0.5) },
      },
      vertexShader: DISTORTION_VERTEX,
      fragmentShader: DISTORTION_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.distortionPass = new ShaderPass(this.distortionMaterial);

    // --- Gradient sky/fog material ---
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x2a2018) },
        bottomColor: { value: new THREE.Color(0x100a08) },
        offset: { value: 0.0 },
        exponent: { value: 0.6 },
      },
      vertexShader: SKY_VERTEX,
      fragmentShader: SKY_FRAGMENT,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    const skyGeo = new THREE.SphereGeometry(500, 32, 16);
    this.skyMesh = new THREE.Mesh(skyGeo, this.skyMaterial);
    this.skyMesh.frustumCulled = false;
    this.skyMesh.renderOrder = -1000;
    scene.add(this.skyMesh);

    // --- Fog ---
    this.fog = new THREE.FogExp2(0x2a2018, 0.006);
    scene.fog = this.fog;
    scene.background = new THREE.Color(0x2a2018);

    // --- Ambient light ---
    this.ambient = new THREE.AmbientLight(0xffffff, 0.08);
    scene.add(this.ambient);

    // --- Mirror floor material (Current layer) ---
    this.floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f2230,
      metalness: 0.9,
      roughness: 0.15,
      envMapIntensity: 1.0,
    });
  }

  // -------------------------------------------------------------------------
  // Layer configuration
  // -------------------------------------------------------------------------

  /**
   * Configure the full atmosphere for a dream layer.
   * `theme` is the LayerTheme from data/layers.ts; `depth` is 1..3 or >=99.
   */
  setLayer(theme: LayerTheme, depth: number): void {
    this.theme = theme;
    this.depth = depth;
    this.isLimbo = depth >= 99;
    this.isAbyss = depth === 3;
    this.isCurrent = depth === 2;

    // Tear down previous particle systems + restore wireframe state.
    this.clearParticles();
    this.restoreWireframe();

    if (this.isLimbo) {
      this.configureLimbo(theme);
    } else if (depth === 1) {
      this.configureSurface(theme);
    } else if (depth === 2) {
      this.configureCurrent(theme);
    } else if (depth === 3) {
      this.configureAbyss(theme);
    } else {
      // Unknown depth — fall back to a neutral surface-like atmosphere.
      this.configureSurface(theme);
    }

    // Sync sky dome colors with the chosen background — keep it dark, no wash-out.
    this.tmpColor.set(theme.palette.bg);
    this.skyMaterial.uniforms.bottomColor.value.copy(this.tmpColor);
    this.skyMaterial.uniforms.bottomColor.value.lerp(new THREE.Color(0xffffff), 0.05);
    this.skyMaterial.uniforms.topColor.value.copy(this.tmpColor);
    this.skyMaterial.uniforms.topColor.value.lerp(new THREE.Color(0x000000), 0.25);
    this.skyMaterial.needsUpdate = true;
  }

  private configureSurface(theme: LayerTheme): void {
    // Warm amber fog, gentle bloom, slow drifting particles, soft ambient.
    const fogColor = new THREE.Color(theme.palette.fog).multiplyScalar(3.0);
    this.fog.color.copy(fogColor);
    this.fog.density = 0.004; // light fog — the dream is dark but visible
    this.scene.fog = this.fog;
    (this.scene.background as THREE.Color).copy(new THREE.Color(theme.palette.bg));

    this.ambient.color.set(0xffe6c2);
    this.ambient.intensity = 0.12; // warm ambient — the surface is inviting

    this.bloomConfig = {
      strength: 0.4,
      radius: 0.5,
      threshold: 0.85,
      tint: new THREE.Color(0xe8c89a),
    };

    // Layer 1 (classical): clean, no distortion or post-processing artifacts.
    this.baseDistortion = 0.0;
    this.setDistortionStrength(0.0);
    this.distortionMaterial.uniforms.aberrationStrength.value = 0.0;
    this.distortionMaterial.uniforms.vignetteStrength.value = 0.0;
    // Diorama: clean atmosphere, no fog, no film effects, no particles.
    this.setDreamFog(0.0, 1.0, fogColor);
    this.setDreamFilmEffects(0.0, 0.0, 0.0);
    this.floorRippleStrength = 0.0;
    this.resetFloorRipple();
  }

  private configureCurrent(theme: LayerTheme): void {
    // Cold teal fog, stronger bloom, rain, mirror floor, blue ambient.
    const fogColor = new THREE.Color(theme.palette.fog).multiplyScalar(3.0);
    this.fog.color.copy(fogColor);
    this.fog.density = 0.005; // moderate fog — the current flows
    this.scene.fog = this.fog;
    (this.scene.background as THREE.Color).copy(new THREE.Color(theme.palette.bg));

    this.ambient.color.set(0x6ab8d8);
    this.ambient.intensity = 0.10; // cold blue ambient — visible but alien

    this.floorMaterial.color.set(theme.palette.floor);
    this.floorMaterial.metalness = 0.9;
    this.floorMaterial.roughness = 0.12;
    this.floorMaterial.needsUpdate = true;

    this.bloomConfig = {
      strength: 0.5,
      radius: 0.55,
      threshold: 0.85,
      tint: new THREE.Color(0x7dd3e8),
    };

    // Layer 2 (glass): clean, no distortion or post-processing artifacts.
    this.baseDistortion = 0.0;
    this.setDistortionStrength(0.0);
    this.distortionMaterial.uniforms.aberrationStrength.value = 0.0;
    this.distortionMaterial.uniforms.vignetteStrength.value = 0.0;
    // Diorama: clean atmosphere, no fog, no film effects, no particles.
    this.setDreamFog(0.0, 1.0, fogColor);
    this.setDreamFilmEffects(0.0, 0.0, 0.0);
    this.floorRippleStrength = 0.0;
    this.resetFloorRipple();
  }

  private configureAbyss(theme: LayerTheme): void {
    // Deep crimson fog, heavy red bloom, ash, flickering light, chromatic aberration.
    const fogColor = new THREE.Color(theme.palette.fog).multiplyScalar(3.0);
    this.fog.color.copy(fogColor);
    this.fog.density = 0.006; // thicker fog — the abyss is oppressive but visible
    this.scene.fog = this.fog;
    (this.scene.background as THREE.Color).copy(new THREE.Color(theme.palette.bg));

    this.ambient.color.set(0xff8080);
    this.ambient.intensity = 0.10; // red ambient — will be flickered in update()

    this.bloomConfig = {
      strength: 0.6,
      radius: 0.7,
      threshold: 0.85,
      tint: new THREE.Color(0xff6b6b),
    };

    // Layer 3 (fractured): clean, no distortion or post-processing artifacts.
    this.baseDistortion = 0.0;
    this.setDistortionStrength(0.0);
    this.distortionMaterial.uniforms.aberrationStrength.value = 0.0;
    this.distortionMaterial.uniforms.vignetteStrength.value = 0.0;
    // Diorama: clean atmosphere, no fog, no film effects.
    this.setDreamFog(0.0, 1.0, fogColor);
    this.setDreamFilmEffects(0.0, 0.0, 0.0);
    this.floorRippleStrength = 0.0;
    this.resetFloorRipple();

    // Diorama: clean atmosphere, no fog, no film effects, no particles.
  }

  private configureLimbo(theme: LayerTheme): void {
    // Pure black, no fog, wireframe materials, white ambient, no particles.
    this.fog.density = 0.0;
    this.scene.fog = null;
    (this.scene.background as THREE.Color).set(0x000000);

    this.ambient.color.set(0xffffff);
    this.ambient.intensity = 0.2;

    this.bloomConfig = {
      strength: 0.0,
      radius: 0.0,
      threshold: 1.0,
      tint: new THREE.Color(0xffffff),
    };

    // Limbo: empty void — no distortion, no aberration, heavy vignette.
    this.baseDistortion = 0.0;
    this.setDistortionStrength(0.0);
    this.distortionMaterial.uniforms.aberrationStrength.value = 0.0;
    this.distortionMaterial.uniforms.vignetteStrength.value = 0.5;
    // Limbo: still — no fog, no film effects. The void is silent.
    this.setDreamFog(0.0, 1.0, new THREE.Color(0x000000));
    this.setDreamFilmEffects(0.0, 0.0, 0.0);
    this.floorRippleStrength = 0.0;
    this.resetFloorRipple();

    // Force wireframe on every mesh material currently in the scene.
    this.applyWireframe();
  }

  // -------------------------------------------------------------------------
  // Dream distortion pass
  // -------------------------------------------------------------------------

  /** Build (and return) the dream-distortion post-processing pass. */
  createDreamDistortion(): ShaderPass {
    return this.distortionPass;
  }

  /** Return the distortion pass for the composer pipeline. */
  getDistortionPass(): ShaderPass {
    return this.distortionPass;
  }

  /** Set how strong the wave distortion is (0 for Surface, higher for deeper). */
  setDistortionStrength(strength: number): void {
    this.distortionMaterial.uniforms.distortionStrength.value = strength;
  }

  /**
   * Configure the volumetric dream-fog uniforms for the distortion pass.
   * `density` 0..0.45 (clamped in-shader to keep the world visible),
   * `height` controls how quickly fog falls off with screen height (higher
   * = sharper ground-hugging mist), `color` is the fog tint.
   * Pass density 0 to disable fog entirely (Limbo).
   */
  private setDreamFog(density: number, height: number, color: THREE.Color): void {
    const u = this.distortionMaterial.uniforms;
    u.uFogDensity.value = density;
    u.uFogHeight.value = height;
    (u.uFogColor.value as THREE.Color).copy(color);
    u.uFogEnabled.value = density > 0.001 ? 1.0 : 0.0;
  }

  /**
   * Configure the dream film-effect uniforms for the distortion pass.
   * `doubleVision` 0..1 — ghost copy offset (deeper layers only),
   * `halation` 0..1 — color bleed from bright objects,
   * `lightLeak` 0..1 — warm film streaks at screen edges.
   */
  private setDreamFilmEffects(
    doubleVision: number,
    halation: number,
    lightLeak: number,
  ): void {
    const u = this.distortionMaterial.uniforms;
    u.uDoubleVision.value = doubleVision;
    u.uHalation.value = halation;
    u.uLightLeak.value = lightLeak;
  }

  // -------------------------------------------------------------------------
  // Floor ripple (vertex displacement for deeper layers)
  // -------------------------------------------------------------------------

  /**
   * Apply a vertex-displacement ripple to the floor material via onBeforeCompile.
   * The floor gently waves: `transformed.y += sin(transformed.x * 3.0 + time) * 0.03 * strength`.
   * Called for Layer 2 (strength 0.3) and Layer 3 (strength 0.8).
   */
  private applyFloorRipple(strength: number): void {
    this.floorShaderUniforms = null;
    this.floorMaterial.onBeforeCompile = (shader: any) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uRippleStrength = { value: strength };
      this.floorShaderUniforms = shader.uniforms;
      // Declare uniforms at the top of the vertex shader.
      shader.vertexShader =
        'uniform float uTime;\nuniform float uRippleStrength;\n' +
        shader.vertexShader;
      // Inject ripple displacement after `transformed` is defined.
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         transformed.y += sin(transformed.x * 3.0 + uTime) * 0.03 * uRippleStrength;`,
      );
    };
    this.floorMaterial.needsUpdate = true;
  }

  /** Remove the floor ripple by clearing the onBeforeCompile hook. */
  private resetFloorRipple(): void {
    this.floorShaderUniforms = null;
    // onBeforeCompile doesn't accept null; use a no-op to effectively disable.
    this.floorMaterial.onBeforeCompile = () => {};
    this.floorMaterial.needsUpdate = true;
  }

  /**
   * Return the current layer's floor ripple strength so the orchestrator
   * (WorldRenderer) can apply it to the actual floor tile materials.
   * 0.0 for Layer 1, 0.3 for Layer 2, 0.8 for Layer 3, 0.0 for Limbo.
   */
  getFloorRippleStrength(): number {
    return this.floorRippleStrength;
  }

  // -------------------------------------------------------------------------
  // Particles
  // -------------------------------------------------------------------------

  /**
   * Create a particle system for the given effect.
   * Returns a THREE.Points (added to the scene by the caller or via setLayer),
   * or null for 'void' (Limbo has no particles).
   */
  createParticleEffect(
    type: string,
    color: string,
    count: number,
    area: number,
  ): THREE.Points | null {
    const kind = type as ParticleKind;
    if (kind === 'void') return null;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count);
    const seeds = new Float32Array(count);

    const c = new THREE.Color(color);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      this.spawnParticle(kind, positions, velocities, sizes, rotations, seeds, i, area);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

    const isStreak = kind === 'rain';
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: c.clone() },
        uIntensity: { value: kind === 'rain' ? 0.85 : kind === 'ash' ? 0.6 : kind === 'debris' ? 0.5 : 0.7 },
        uPixelRatio: {
          value: typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1,
        },
      },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: isStreak ? PARTICLE_FRAGMENT_STREAK : PARTICLE_FRAGMENT_SOFT,
      transparent: true,
      depthWrite: false,
      blending: kind === 'debris' ? THREE.NormalBlending : THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  /** Initial spawn for a single particle into the given typed arrays. */
  private spawnParticle(
    kind: ParticleKind,
    positions: Float32Array,
    velocities: Float32Array,
    sizes: Float32Array,
    rotations: Float32Array,
    seeds: Float32Array,
    i: number,
    area: number,
  ): void {
    const i3 = i * 3;
    const half = area * 0.5;
    seeds[i] = Math.random() * Math.PI * 2;

    switch (kind) {
      case 'drift': {
        // Slow upward drift with gentle sway. Warm, small.
        positions[i3 + 0] = (Math.random() - 0.5) * area;
        positions[i3 + 1] = Math.random() * area;
        positions[i3 + 2] = (Math.random() - 0.5) * area;
        velocities[i3 + 0] = (Math.random() - 0.5) * 0.15;
        velocities[i3 + 1] = 0.2 + Math.random() * 0.25; // upward
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.15;
        sizes[i] = 0.05 + Math.random() * 0.05; // 0.05 - 0.1
        rotations[i] = 0;
        break;
      }
      case 'rain': {
        // Fast falling at an angle, cold blue. Streak shader handles shape.
        positions[i3 + 0] = (Math.random() - 0.5) * area;
        positions[i3 + 1] = Math.random() * area;
        positions[i3 + 2] = (Math.random() - 0.5) * area;
        const angle = this.rainAngle;
        velocities[i3 + 0] = Math.sin(angle) * (18 + Math.random() * 6);
        velocities[i3 + 1] = -Math.cos(angle) * (18 + Math.random() * 6);
        velocities[i3 + 2] = 0;
        sizes[i] = 0.18 + Math.random() * 0.08;
        rotations[i] = 0;
        break;
      }
      case 'ash': {
        // Slow falling dark crimson, horizontal drift, larger in the deep layers.
        positions[i3 + 0] = (Math.random() - 0.5) * area;
        positions[i3 + 1] = Math.random() * area;
        positions[i3 + 2] = (Math.random() - 0.5) * area;
        velocities[i3 + 0] = (Math.random() - 0.5) * 0.6;
        velocities[i3 + 1] = -(0.3 + Math.random() * 0.4);
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.4;
        sizes[i] = 0.08 + Math.random() * 0.18;
        rotations[i] = Math.random() * Math.PI * 2;
        break;
      }
      case 'debris': {
        // Heavy, slow-falling debris fragments for the Abyss.
        positions[i3 + 0] = (Math.random() - 0.5) * area;
        positions[i3 + 1] = Math.random() * area;
        positions[i3 + 2] = (Math.random() - 0.5) * area;
        velocities[i3 + 0] = (Math.random() - 0.5) * 0.4;
        velocities[i3 + 1] = -(0.15 + Math.random() * 0.25);
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
        sizes[i] = 0.18 + Math.random() * 0.28;
        rotations[i] = Math.random() * Math.PI * 2;
        break;
      }
      default:
        break;
    }
  }

  /** Register a created particle system so update() animates & recycles it. */
  private addParticleSystem(
    points: THREE.Points,
    kind: ParticleKind,
    color: string,
    count: number,
    area: number,
  ): void {
    const geometry = points.geometry as THREE.BufferGeometry;
    const material = points.material as THREE.ShaderMaterial;
    const positions = geometry.getAttribute('position').array as Float32Array;
    const sizes = geometry.getAttribute('size').array as Float32Array;
    const rotations = geometry.getAttribute('rotation').array as Float32Array;
    const seeds = geometry.getAttribute('seed').array as Float32Array;

    // Reconstruct velocities (we don't store them as a geometry attribute).
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      switch (kind) {
        case 'drift':
          velocities[i3 + 0] = (Math.random() - 0.5) * 0.15;
          velocities[i3 + 1] = 0.2 + Math.random() * 0.25;
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.15;
          break;
        case 'rain': {
          const angle = this.rainAngle;
          velocities[i3 + 0] = Math.sin(angle) * (18 + Math.random() * 6);
          velocities[i3 + 1] = -Math.cos(angle) * (18 + Math.random() * 6);
          velocities[i3 + 2] = 0;
          break;
        }
        case 'ash':
          velocities[i3 + 0] = (Math.random() - 0.5) * 0.6;
          velocities[i3 + 1] = -(0.3 + Math.random() * 0.4);
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.4;
          break;
        case 'debris':
          velocities[i3 + 0] = (Math.random() - 0.5) * 0.4;
          velocities[i3 + 1] = -(0.15 + Math.random() * 0.25);
          velocities[i3 + 2] = (Math.random() - 0.5) * 0.3;
          break;
        default:
          break;
      }
    }

    this.scene.add(points);
    this.particleSystems.push({
      points,
      positions,
      velocities,
      sizes,
      rotations,
      seeds,
      count,
      area,
      kind,
      material,
      geometry,
    });
  }

  // -------------------------------------------------------------------------
  // Per-frame update
  // -------------------------------------------------------------------------

  update(dt: number, time: number): void {
    // Distortion shader time + subtle flicker.
    this.distortionMaterial.uniforms.time.value = time;

    // Layer 3 (Abyss): no distortion pulse in the diorama style.

    // Update floor ripple time uniform (if the floor shader was compiled).
    if (this.floorShaderUniforms) {
      this.floorShaderUniforms.uTime.value = time;
    }

    // Particle motion + recycling.
    for (const sys of this.particleSystems) {
      this.updateParticleSystem(sys, dt, time);
    }

    // Vignette follows the player, not the screen center.
    this.updateVignetteCenter();

    // Abyss: subtle flicker only — no need to flood the scene with light.
    if (this.isAbyss) {
      const noise = Math.sin(time * 13.0) * 0.5 + Math.sin(time * 7.3 + 1.2) * 0.5;
      const flicker = 0.12 + noise * 0.04;
      this.ambient.intensity = THREE.MathUtils.clamp(flicker, 0.08, 0.16);
      // Minimal aberration pulse.
      const pulse = 0.08 + Math.sin(time * 5.0) * 0.04;
      this.distortionMaterial.uniforms.aberrationStrength.value = pulse;

      // Occasional lightning-like screen flicker.
      if (this.lightningTimer <= 0) {
        if (Math.random() < 0.015) {
          this.lightningAmount = 0.2 + Math.random() * 0.15;
          this.lightningTimer = 0.04 + Math.random() * 0.08;
        }
      } else {
        this.lightningTimer -= dt;
        this.lightningAmount *= Math.exp(-dt * 12);
      }
      this.distortionMaterial.uniforms.uLightning.value = this.lightningAmount;
    } else {
      this.distortionMaterial.uniforms.uLightning.value = 0.0;
      this.lightningAmount = 0.0;
      this.lightningTimer = 0.0;
    }

    // Current: animate rain angle slightly.
    if (this.isCurrent) {
      this.rainAngle = 0.18 + Math.sin(time * 0.3) * 0.06;
    }

    // Enhance materials after scene changes (throttled, new meshes are picked up).
    this.materialEnhanceTimer += dt;
    if (this.materialEnhanceTimer >= 0.5) {
      this.materialEnhanceTimer = 0;
      this.enhanceSceneMaterials();
    }
  }

  private updateParticleSystem(sys: ParticleSystem, dt: number, time: number): void {
    const { positions, velocities, sizes, rotations, seeds, count, area, kind } = sys;
    const half = area * 0.5;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      if (kind === 'drift') {
        // Gentle sway on x/z, steady upward.
        positions[i3 + 0] += velocities[i3 + 0] * dt + Math.sin(time + seeds[i]) * 0.02 * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt + Math.cos(time * 0.8 + seeds[i]) * 0.02 * dt;
        // Recycle when above the ceiling.
        if (positions[i3 + 1] > area) {
          positions[i3 + 0] = (Math.random() - 0.5) * area;
          positions[i3 + 1] = 0;
          positions[i3 + 2] = (Math.random() - 0.5) * area;
        }
      } else if (kind === 'rain') {
        // Update angle-driven velocity each frame so animated angle applies.
        const speed = 18 + (i % 6);
        velocities[i3 + 0] = Math.sin(this.rainAngle) * speed;
        velocities[i3 + 1] = -Math.cos(this.rainAngle) * speed;
        positions[i3 + 0] += velocities[i3 + 0] * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        // Recycle when below ground.
        if (positions[i3 + 1] < 0) {
          positions[i3 + 0] = (Math.random() - 0.5) * area + half;
          positions[i3 + 1] = area;
          positions[i3 + 2] = (Math.random() - 0.5) * area;
        }
        // Wrap horizontally.
        if (positions[i3 + 0] > half) positions[i3 + 0] -= area;
        if (positions[i3 + 0] < -half) positions[i3 + 0] += area;
      } else if (kind === 'ash') {
        // Slow fall + horizontal drift + slow rotation.
        positions[i3 + 0] += velocities[i3 + 0] * dt + Math.sin(time * 0.5 + seeds[i]) * 0.05 * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt;
        rotations[i] += dt * 0.3 * (seeds[i] > Math.PI ? 1 : -1);
        // Recycle when below ground.
        if (positions[i3 + 1] < 0) {
          positions[i3 + 0] = (Math.random() - 0.5) * area;
          positions[i3 + 1] = area;
          positions[i3 + 2] = (Math.random() - 0.5) * area;
        }
        // Wrap horizontally.
        if (positions[i3 + 0] > half) positions[i3 + 0] -= area;
        if (positions[i3 + 0] < -half) positions[i3 + 0] += area;
      } else if (kind === 'debris') {
        // Heavy, slow-falling debris tumble.
        positions[i3 + 0] += velocities[i3 + 0] * dt + Math.sin(time * 0.3 + seeds[i]) * 0.03 * dt;
        positions[i3 + 1] += velocities[i3 + 1] * dt;
        positions[i3 + 2] += velocities[i3 + 2] * dt;
        rotations[i] += dt * 0.2 * (seeds[i] > Math.PI ? 1 : -1);
        // Recycle when below ground.
        if (positions[i3 + 1] < 0) {
          positions[i3 + 0] = (Math.random() - 0.5) * area;
          positions[i3 + 1] = area;
          positions[i3 + 2] = (Math.random() - 0.5) * area;
        }
        // Wrap horizontally.
        if (positions[i3 + 0] > half) positions[i3 + 0] -= area;
        if (positions[i3 + 0] < -half) positions[i3 + 0] += area;
      }
    }

    sys.geometry.getAttribute('position').needsUpdate = true;
    if (kind === 'ash' || kind === 'debris') {
      sys.geometry.getAttribute('rotation').needsUpdate = true;
    }
  }

  /** Update the distortion pass vignette so it follows the player. */
  private updateVignetteCenter(): void {
    const center = new THREE.Vector2(0.5, 0.5);
    const player = this.scene.getObjectByName('player') as THREE.Group | null;
    if (player) {
      const p = player.position.clone();
      p.project(this.camera);
      center.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5);
      center.clampScalar(0.0, 1.0);
    }
    (this.distortionMaterial.uniforms.uVignetteCenter.value as THREE.Vector2).copy(center);
  }

  /**
   * Enhance scene materials without touching CharacterFactory/ArchitectureFactory.
   * Balances roughness/metalness, boosts emissive, and improves glass reflections.
   */
  private enhanceSceneMaterials(): void {
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        const matAny = m as any;
        if (matAny.userData && matAny.userData.oneiricEnhanced) continue;

        if (m.type === 'MeshStandardMaterial' || m.type === 'MeshPhysicalMaterial') {
          const std = m as THREE.MeshStandardMaterial;
          // Cap roughness and give a tiny metalness floor so dark materials aren't matte.
          if (std.roughness > 0.75) std.roughness = 0.75;
          if (std.metalness < 0.05 && m.type !== 'MeshPhysicalMaterial') std.metalness = 0.05;

          // Emissive surfaces should glow enough to bloom.
          const emissiveLum = std.emissive ? Math.max(std.emissive.r, std.emissive.g, std.emissive.b) : 0;
          if (emissiveLum > 0.001) {
            std.emissiveIntensity = Math.max(std.emissiveIntensity, 0.6);
          }
        }

        if (m.type === 'MeshPhysicalMaterial') {
          const phys = m as THREE.MeshPhysicalMaterial;
          // Glass-like materials reflect the environment.
          phys.roughness = Math.min(phys.roughness, 0.12);
          phys.metalness = Math.max(phys.metalness, 0.2);
          phys.envMapIntensity = Math.max(phys.envMapIntensity, 1.5);
          if (phys.clearcoat !== undefined) {
            phys.clearcoat = Math.max(phys.clearcoat, 0.3);
            phys.clearcoatRoughness = 0.15;
          }
        }

        if (!matAny.userData) matAny.userData = {};
        matAny.userData.oneiricEnhanced = true;
        m.needsUpdate = true;
      }
    });
  }

  // -------------------------------------------------------------------------
  // Wireframe handling for Limbo
  // -------------------------------------------------------------------------

  private applyWireframe(): void {
    this.wireframeRestore.length = 0;
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      const mats = Array.isArray(mat) ? mat : [mat];
      for (const m of mats) {
        if ('wireframe' in m) {
          this.wireframeRestore.push({ mat: m, wireframe: (m as any).wireframe });
          (m as any).wireframe = true;
        }
      }
    });
  }

  private restoreWireframe(): void {
    for (const entry of this.wireframeRestore) {
      (entry.mat as any).wireframe = entry.wireframe;
    }
    this.wireframeRestore.length = 0;
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  private clearParticles(): void {
    for (const sys of this.particleSystems) {
      this.scene.remove(sys.points);
      sys.geometry.dispose();
      sys.material.dispose();
    }
    this.particleSystems.length = 0;
  }

  /** Expose bloom tuning so the renderer pipeline can apply it. */
  getBloomConfig(): BloomConfig {
    return this.bloomConfig;
  }

  /** Expose the mirror-floor material (Current layer) for the floor mesh. */
  getFloorMaterial(): THREE.MeshStandardMaterial {
    return this.floorMaterial;
  }

  dispose(): void {
    this.clearParticles();
    this.restoreWireframe();

    this.distortionMaterial.dispose();
    this.distortionPass.dispose();

    this.skyMaterial.dispose();
    (this.skyMesh.geometry as THREE.BufferGeometry).dispose();
    this.scene.remove(this.skyMesh);

    this.floorMaterial.dispose();

    this.scene.remove(this.ambient);
    this.scene.fog = null;
  }
}
