// ONEIRIC — main.ts
// The integration layer. Wires all modules into the game loop, manages state
// transitions, and orchestrates rendering. This is the only file that imports
// from every folder.
//
// DUAL-CANVAS ARCHITECTURE:
// - WebGL canvas: 3D world (Three.js scene, characters, lighting, post-processing)
// - HUD canvas: 2D overlay (HUD, menus, kick sequence, totem widget)

import type { GameState, DreamLayer, Room, Projection, Particle, MetaState, KickState, HubDoor, DreamTarget } from './types';
import { BALANCE } from './data/balance';
import { getThemeForDepth, LAYER_THEMES, LIMBO_THEME } from './data/layers';
import { DEFAULT_TOTEM, getTotemById, TOTEMS } from './data/totems';
import { getRandomTarget, getContractSelection } from './data/targets';

import { GameLoop } from './engine/GameLoop';
import { Input } from './engine/Input';

import { ProceduralGen } from './dream/ProceduralGen';
import { DreamStack } from './dream/DreamStack';
import { RoomHelper } from './dream/Room';
import { TimeDilation } from './dream/TimeDilation';

import { PlayerEntity } from './entities/Player';
import { ProjectionEntity } from './entities/Projection';
import { TotemEntity } from './entities/Totem';

import { AudioEngine } from './audio/AudioEngine';

import { HUD } from './ui/HUD';
import { MenuScreen } from './ui/MenuScreen';
import { Atelier } from './ui/Atelier';
import { KickSequence } from './ui/KickSequence';

import { MetaProgression } from './meta/MetaProgression';

// 3D rendering
import * as THREE from 'three';
import { SceneManager } from './webgl/SceneManager';
import { WorldRenderer } from './webgl/WorldRenderer';
import { Atmosphere } from './webgl/Atmosphere';

// === Viewport Dimensions (Dynamic Fullscreen) ===
let canvasW = typeof window !== 'undefined' ? window.innerWidth : 960;
let canvasH = typeof window !== 'undefined' ? window.innerHeight : 600;
const MAX_DEPTH = 3;
const PIXEL_TO_WORLD = 2 / 32; // game pixels -> Three.js world units (matches WorldRenderer)

// === Game shell state (UI-level, outside GameState) ===
type ShellPhase = 'title' | 'intro' | 'howto' | 'atelier' | 'playing' | 'paused';
let shellPhase: ShellPhase = 'title';
let atelierSelectedUpgrade = 0;
let atelierTotemIndex = 0;

// === Module instances ===
let webglCanvas: HTMLCanvasElement;
let hudCanvas: HTMLCanvasElement;
let hudCtx: CanvasRenderingContext2D;
let input: Input;
let gameLoop: GameLoop;
let audio: AudioEngine;
let sceneManager: SceneManager;
let worldRenderer: WorldRenderer;
let atmosphere: Atmosphere;

// === Game state ===
let state: GameState;
let meta: MetaState;
let totemState: ReturnType<typeof TotemEntity.create>;
let kickState: KickState | null = null;
let particles: Particle[] = [];
// Core flash: a single white circle that scales up + fades in ~100ms to sell
// the impact moment before sparks appear. Lives in world pixel coords.
interface CoreFlash { x: number; y: number; life: number; maxLife: number; size: number; }
let coreFlashes: CoreFlash[] = [];
let proceduralGen: ProceduralGen;
let runSeed: number;
let descendTimer = 0;
let descendTargetDepth = 0;
let seedPlantTimer = 0;
let projectionSpawnTimer = 0;
let totemCheckTimer = 0;
let showingTotemCheck = false;
let reducedMotion = false;
let flashAmount = 0; // white flash on impact moments
let descentImpactTriggered = false;
let hitStopTimer = 0; // freezes game for a few ms on hits — makes impacts feel real
let damageFlashAmount = 0; // red flash on damage
let kickCollapseTimer = 0; // active during world-collapse after a successful kick

// === Resize handler ===
function handleResize(): void {
  canvasW = window.innerWidth;
  canvasH = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  webglCanvas.width = canvasW * dpr;
  webglCanvas.height = canvasH * dpr;
  webglCanvas.style.width = `${canvasW}px`;
  webglCanvas.style.height = `${canvasH}px`;

  hudCanvas.width = canvasW * dpr;
  hudCanvas.height = canvasH * dpr;
  hudCanvas.style.width = `${canvasW}px`;
  hudCanvas.style.height = `${canvasH}px`;

  sceneManager.resize(canvasW, canvasH);
}

// === Init ===
function init(): void {
  webglCanvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
  hudCanvas = document.getElementById('hud-canvas') as HTMLCanvasElement;
  hudCtx = hudCanvas.getContext('2d')!;
  input = new Input(hudCanvas);
  audio = new AudioEngine();

  canvasW = window.innerWidth;
  canvasH = window.innerHeight;

  // 3D scene
  sceneManager = new SceneManager(webglCanvas, canvasW, canvasH);
  atmosphere = new Atmosphere(sceneManager.getScene(), sceneManager.getCamera());
  worldRenderer = new WorldRenderer(sceneManager);

  // Resize listener
  handleResize();
  window.addEventListener('resize', handleResize);

  // Wire the dream distortion pass into the composer pipeline
  // (atmosphere creates it, sceneManager owns the composer)
  sceneManager.addPass(atmosphere.getDistortionPass());

  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  meta = MetaProgression.load();
  meta = MetaProgression.refreshDailySeed(meta);
  MetaProgression.save(meta);

  const activeTotem = MetaProgression.getActiveTotemConfig(meta);
  totemState = TotemEntity.create(activeTotem);

  proceduralGen = new ProceduralGen(Date.now());
  runSeed = Date.now();

  state = createInitialState();
  Object.defineProperty(window, 'oneiricState', { get: () => state, configurable: true });

  // URL parameter check (e.g. ?phase=atelier)
  const urlParams = new URLSearchParams(window.location.search);
  const phaseParam = urlParams.get('phase');
  if (phaseParam === 'atelier') {
    shellPhase = 'atelier';
  } else if (phaseParam === 'howto') {
    shellPhase = 'howto';
  }

  gameLoop = new GameLoop(update, render);
  gameLoop.start();

  // Hide loading screen
  const loading = document.getElementById('loading');
  if (loading) loading.style.display = 'none';
}

function createInitialState(): GameState {
  const activeTotem = MetaProgression.getActiveTotemConfig(meta);
  const upgrades = MetaProgression.applyUpgradesToState(
    BALANCE.startingStability,
    activeTotem.kickZoneWidth,
    meta
  );
  return {
    phase: 'hub',
    currentLayer: 0,
    layerStack: [],
    stability: upgrades.stability,
    fragments: 0,
    totalFragments: meta.totalFragments,
    seedPlanted: false,
    kickProgress: 0,
    totem: activeTotem,
    wakeTimer: BALANCE.wakeTimerSeconds,
    disturbance: 0,
    runStartTime: 0,
    isHubDream: false,
    player: PlayerEntity.create(canvasW / 2, canvasH / 2, upgrades.echoBonus),
    echoLures: [],
    activeResonance: null,
    limboTimer: BALANCE.limboTimeSeconds,
    limboFragmentFound: false,
    target: null,
  };
}

// === Run lifecycle ===
function enterArchitectHub(): void {
  runSeed = (Date.now() + Math.random() * 1000000) | 0;
  proceduralGen = new ProceduralGen(runSeed);
  state = createInitialState();
  state.phase = 'hub';
  state.currentLayer = 0;
  state.runStartTime = performance.now();

  // Select 3 distinct targets for the antechamber doors
  const chosenTargets = getContractSelection(mulberry32(runSeed), 3);
  const doorAngles = [-Math.PI / 3, 0, Math.PI / 3];
  const doorLabels = ['ALPHA', 'BETA', 'GAMMA'];
  const radiusPx = 160; // world pixel radius from center

  state.hubDoors = chosenTargets.map((tgt, i) => ({
    id: `door-${i}`,
    x: Math.sin(doorAngles[i]) * radiusPx,
    y: -Math.cos(doorAngles[i]) * radiusPx,
    target: tgt,
    angle: doorAngles[i],
    label: doorLabels[i],
  }));

  // Place player slightly back from center facing forward
  state.player.x = 0;
  state.player.y = 40;

  // Set hub 3D atmosphere
  const theme = getThemeForDepth(1);
  atmosphere.setLayer(theme, 1);
  worldRenderer.buildGatewayAntechamber(theme, state.hubDoors);

  audio.init();
  audio.startDrone(55);
  shellPhase = 'playing';
}

function descendIntoTarget(target: DreamTarget): void {
  state.target = target;
  state.isHubDream = Math.random() < BALANCE.hubDreamChance;

  // Generate all layers upfront with this target's memory objects
  state.layerStack = DreamStack.createInitialStack(MAX_DEPTH, runSeed, target.memoryObjects);
  state.currentLayer = 1;
  state.phase = 'descending';
  descendTimer = BALANCE.descentTime;
  descendTargetDepth = 1;
  descentImpactTriggered = false;

  // Place player at center of first room of layer 1
  const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  if (layer && layer.rooms.length > 0) {
    const room = layer.rooms[0];
    const bounds = RoomHelper.getBounds(room);
    state.player.x = bounds.x + bounds.w / 2;
    state.player.y = bounds.y + bounds.h / 2;
  }

  // Set 3D atmosphere for layer 1
  const theme = layer ? layer.theme : getThemeForDepth(1);
  atmosphere.setLayer(theme, 1);
  worldRenderer.setLayerTheme(theme);

  audio.playBraaam();
  audio.playDescend();
  shellPhase = 'playing';
}

function startRun(): void {
  // Legacy alias that opens the gateway hub
  enterArchitectHub();
}

function enterLimbo(): void {
  state.phase = 'limbo';
  state.limboTimer = BALANCE.limboTimeSeconds;
  state.limboFragmentFound = false;

  // Generate a LARGE limbo room (3x normal grid) — existential dread space.
  // The fragment is placed at the opposite corner from the player.
  const limboRoom = proceduralGen.generateLargeLimbo();
  // Replace current layer's rooms with limbo room for rendering
  if (state.layerStack.length > 0) {
    const topLayer = state.layerStack[state.layerStack.length - 1];
    topLayer.rooms = [limboRoom];
    topLayer.projections = [];
  }

  // Player spawns at center of the large room
  state.player.x = limboRoom.bounds.x + limboRoom.bounds.w / 2;
  state.player.y = limboRoom.bounds.y + limboRoom.bounds.h / 2;
  state.player.lightRadius = 80; // dim light in limbo

  // Set atmosphere to limbo
  atmosphere.setLayer(LIMBO_THEME, 99);
  worldRenderer.setLayerTheme(LIMBO_THEME);

  audio.startLimbo();
}

function endRun(won: boolean): void {
  // On a win, depth reached = total kicks (which equals the number of layers escaped).
  // On a loss, depth reached = current layer at time of failure.
  const depthReached = won && kickState ? kickState.totalKicks : state.currentLayer;
  const kicksChained = kickState ? kickState.successes : 0;
  const fragmentsEarned = MetaProgression.calculateRunFragments(
    depthReached,
    won && state.seedPlanted,
    kicksChained
  );

  // If lost in limbo, keep only 10%
  const finalFragments = won ? fragmentsEarned : Math.floor(fragmentsEarned * BALANCE.limboFragmentKeepRatio);
  state.fragments = finalFragments;

  meta = MetaProgression.applyRunResult(meta, finalFragments, depthReached);
  MetaProgression.save(meta);

  state.phase = won ? 'won' : 'lost';
  audio.stopLimbo();
  audio.stopDrone();
  audio.stopTotemSpin();
  if (won) audio.playWake();
  kickState = null;
}

function returnToAtelier(): void {
  shellPhase = 'atelier';
  state.phase = 'hub';
  kickState = null;
  particles = [];
  coreFlashes = [];
  audio.stopDrone();
  audio.stopTotemSpin();
  audio.stopLimbo();
}

// === Update ===
function update(realDt: number): void {
  try {
    // Handle shell-level input
    handleShellInput();

    if (shellPhase === 'paused') return;

    // Hit-stop: freeze the game for a few ms after a hit to make impacts feel real.
    // The game still renders during hit-stop, but updates are skipped.
    if (hitStopTimer > 0) {
      hitStopTimer -= realDt;
      // Still update flash decay and render during hit-stop
      if (flashAmount > 0) { flashAmount -= realDt * 3; if (flashAmount < 0) flashAmount = 0; }
      if (damageFlashAmount > 0) { damageFlashAmount -= realDt * 4; if (damageFlashAmount < 0) damageFlashAmount = 0; }
      return;
    }

    if (shellPhase !== 'playing') {
      // Update totem spin on title/atelier for decorative effect
      TotemEntity.update(totemState, shellPhase === 'atelier' && state.isHubDream, realDt, meta.upgrades.totemSpinSpeed);
      updateAmbientParticles(realDt);
      return;
    }

    // Game-specific update
    switch (state.phase) {
      case 'hub':
        updateHub(realDt);
        break;
      case 'descending':
        updateDescending(realDt);
        break;
      case 'in-dream':
        updateInDream(realDt);
        break;
      case 'kicking':
        updateKicking(realDt);
        break;
      case 'limbo':
        updateLimbo(realDt);
        break;
      case 'won':
      case 'lost':
        // Wait for SPACE to return
        if (input.wasPressed(' ')) returnToAtelier();
        updateAmbientParticles(realDt);
        break;
    }
  } finally {
    // Clear just-pressed state at the END of the frame so all wasPressed() calls see it.
    input.update();
  }
}

function handleShellInput(): void {
  if (shellPhase === 'title') {
    if (input.wasPressed(' ')) {
      shellPhase = 'intro';
    } else if (input.wasPressed('h')) {
      shellPhase = 'howto';
    }
  } else if (shellPhase === 'intro') {
    if (input.wasPressed(' ')) {
      enterArchitectHub();
    } else if (input.wasPressed('escape')) {
      shellPhase = 'title';
    }
  } else if (shellPhase === 'howto') {
    if (input.wasPressed(' ')) {
      enterArchitectHub();
    } else if (input.wasPressed('escape')) {
      shellPhase = 'title';
    }
  } else if (shellPhase === 'atelier') {
    if (input.wasPressed(' ')) {
      enterArchitectHub();
    }
    if (input.wasPressed('1')) tryPurchaseUpgrade('totemSpinSpeed');
    if (input.wasPressed('2')) tryPurchaseUpgrade('startingStability');
    if (input.wasPressed('3')) tryPurchaseUpgrade('kickZoneBonus');
    if (input.wasPressed('4')) tryPurchaseUpgrade('lucidSurgeCooldown');
    if (input.wasPressed('5')) tryPurchaseUpgrade('echoCapacity');
    if (input.wasPressed('6')) tryPurchaseUpgrade('memoryCatalyst');
    if (input.wasPressed('q')) cycleTotem(-1);
    if (input.wasPressed('e')) cycleTotem(1);
  } else if (shellPhase === 'playing') {
    if (input.wasPressed('escape')) {
      shellPhase = 'paused';
      audio.suspend();
    }
  } else if (shellPhase === 'paused') {
    if (input.wasPressed('escape')) {
      shellPhase = 'playing';
      audio.resume();
    }
  }
}

function tryPurchaseUpgrade(type: any): void {
  const result = MetaProgression.purchaseUpgrade(meta, type);
  if (result.success) {
    meta = result.newMeta;
    MetaProgression.save(meta);
    audio.playFragmentPickup();
  }
}

function cycleTotem(dir: number): void {
  const unlocked = TOTEMS.filter(t => meta.unlockedTotems.includes(t.id));
  if (unlocked.length === 0) return;
  atelierTotemIndex = (atelierTotemIndex + dir + unlocked.length) % unlocked.length;
  meta = MetaProgression.setActiveTotem(meta, unlocked[atelierTotemIndex].id);
  MetaProgression.save(meta);
  totemState = TotemEntity.create(unlocked[atelierTotemIndex]);
}

// === Phase updates ===
function updateHub(dt: number): void {
  // Totem entity update
  TotemEntity.update(totemState, true, dt, meta.upgrades.totemSpinSpeed);

  // Totem check
  if (input.wasPressed('t')) {
    showingTotemCheck = true;
    totemCheckTimer = BALANCE.totemCheckDuration;
    audio.playTotemSpin();
    sceneManager.setCameraMode('DRAMATIC_LOW');
  }
  if (showingTotemCheck) {
    totemCheckTimer -= dt;
    if (totemCheckTimer <= 0) {
      showingTotemCheck = false;
      audio.stopTotemSpin();
      sceneManager.setCameraMode('NORMAL');
    }
  }

  // Player movement
  const inputState = input.getState();
  const moveX = (inputState.keys.has('d') || inputState.keys.has('arrowright') ? 1 : 0) -
                (inputState.keys.has('a') || inputState.keys.has('arrowleft') ? 1 : 0);
  const moveY = (inputState.keys.has('s') || inputState.keys.has('arrowdown') ? 1 : 0) -
                (inputState.keys.has('w') || inputState.keys.has('arrowup') ? 1 : 0);

  const speed = state.player.speed * (state.player.isSurging ? 2.2 : 1.0);
  if (moveX !== 0 || moveY !== 0) {
    const len = Math.hypot(moveX, moveY);
    state.player.vx = (moveX / len) * speed;
    state.player.vy = (moveY / len) * speed;
    state.player.facing = Math.atan2(moveY, moveX);
  } else {
    state.player.vx *= 0.82;
    state.player.vy *= 0.82;
  }

  // Surge update
  if (input.wasPressed(' ') && state.player.surgeCooldown <= 0 && !state.player.isSurging) {
    state.player.isSurging = true;
    state.player.surgeTimer = BALANCE.lucidSurgeDuration;
    state.player.surgeCooldown = BALANCE.lucidSurgeBaseCooldown;
    audio.playLucidSurge();
    sceneManager.addTrauma(0.2, state.player.x, state.player.y);
  }

  if (state.player.isSurging) {
    state.player.surgeTimer -= dt;
    if (state.player.surgeTimer <= 0) state.player.isSurging = false;
  }
  if (state.player.surgeCooldown > 0) {
    state.player.surgeCooldown -= dt;
  }

  state.player.x += state.player.vx * dt;
  state.player.y += state.player.vy * dt;

  // Constrain within circular plaza bounds (radius 220px around origin)
  const pdist = Math.hypot(state.player.x, state.player.y);
  if (pdist > 220) {
    state.player.x = (state.player.x / pdist) * 220;
    state.player.y = (state.player.y / pdist) * 220;
  }

  // Detect door proximity
  let activeDoor: HubDoor | null = null;
  if (state.hubDoors) {
    for (const door of state.hubDoors) {
      const ddist = Math.hypot(door.x - state.player.x, door.y - state.player.y);
      if (ddist < 85) {
        activeDoor = door;
        break;
      }
    }
  }
  state.activeHubDoor = activeDoor;

  // Press E to enter target consciousness
  if (activeDoor && input.wasPressed('e')) {
    descendIntoTarget(activeDoor.target);
    return;
  }

  sceneManager.update(dt);
  const theme = getThemeForDepth(1);
  worldRenderer.updateHub(state, theme, dt, gameLoop.time);
  updateAmbientParticles(dt);
}
function updateDescending(dt: number): void {
  descendTimer -= dt;
  const progress = 1 - (descendTimer / BALANCE.descentTime);

  // Trigger impact at 75% progress (the "slam" moment)
  if (progress >= 0.75 && !descentImpactTriggered) {
    descentImpactTriggered = true;
    flashAmount = 0.8;
    // Special tier: descent impact — 150ms hit-stop, explosion-level trauma.
    sceneManager.addTrauma(0.9, state.player.x, state.player.y);
    hitStopTimer = 0.15;
    audio.playDescendImpact();
    // Cinematic camera: wide pullback on impact, then return to normal
    // when descent ends.
    sceneManager.setCameraMode('WIDE_PULLBACK');
  }

  // Update flash decay
  if (flashAmount > 0) {
    flashAmount -= dt * 3;
    if (flashAmount < 0) flashAmount = 0;
  }

  if (descendTimer <= 0) {
    state.phase = 'in-dream';
    // Always return the camera to the player-follow framing when the dream
    // becomes playable — the wide pullback is only for the descent impact.
    sceneManager.setCameraMode('NORMAL');
    const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
    if (layer) {
      audio.startDrone(layer.theme.ambientHz);
    }
  }
  updateAmbientParticles(dt);
}

function updateInDream(realDt: number): void {
  const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  if (!layer) return;

  const room = layer.rooms[layer.currentRoomIndex];
  if (!room) return;

  // Time dilation
  const effectiveDt = TimeDilation.computeEffectiveDt(realDt, layer);

  // Wake timer (real time)
  state.wakeTimer -= TimeDilation.computeWakeTick(realDt);
  if (state.wakeTimer <= 0) {
    // Forced wake — counts as a loss (didn't kick out)
    endRun(false);
    return;
  }

  // Stability drain (real time, not effective)
  const drain = TimeDilation.computeStabilityDrain(layer, layer.projections.length, realDt);
  state.stability -= drain;
  if (state.stability <= 0) {
    state.stability = 0;
    enterLimbo();
    return;
  }

  // --- Active Resonances & Lures Countdown ---
  if (state.activeResonance) {
    state.activeResonance.timer -= realDt;
    if (state.activeResonance.timer <= 0) {
      state.activeResonance = null;
    }
  }

  for (let i = state.echoLures.length - 1; i >= 0; i--) {
    state.echoLures[i].timer -= realDt;
    if (state.echoLures[i].timer <= 0) {
      state.echoLures.splice(i, 1);
    }
  }

  // --- Tactical Input: Lucid Surge (SPACE) ---
  if (input.wasPressed(' ')) {
    const surgeReduction = (meta.upgrades.lucidSurgeCooldown ?? 0) * BALANCE.upgradeEffects.lucidSurgeCooldownReductionPerLevel;
    if (PlayerEntity.triggerSurge(state.player, surgeReduction)) {
      audio.playLucidSurge();
      spawnCoreFlash(state.player.x, state.player.y, 30);
      spawnSparkParticles(state.player.x, state.player.y, '#ffffff', 16, {
        speedMin: 120,
        speedMax: 260,
        lifeMin: 0.2,
        lifeMax: 0.4,
      });
      sceneManager.addTrauma(0.25, state.player.x, state.player.y);
    }
  }

  // --- Tactical Input: Sonic Echo Lure (F) ---
  if (input.wasPressed('f') && state.player.echoesLeft > 0) {
    state.player.echoesLeft--;
    state.echoLures.push({
      id: (Date.now() + Math.random() * 1000) | 0,
      x: state.player.x,
      y: state.player.y,
      timer: BALANCE.echoLureDuration,
      maxTimer: BALANCE.echoLureDuration,
      radius: BALANCE.echoLureRadius,
    });
    audio.playEchoLure();
    spawnCoreFlash(state.player.x, state.player.y, 36);
    spawnSparkParticles(state.player.x, state.player.y, '#6ab8d8', 20, {
      speedMin: 80,
      speedMax: 180,
      lifeMin: 0.4,
      lifeMax: 0.8,
    });
  }

  // Totem update
  const isDreaming = state.currentLayer > 0 || state.isHubDream;
  TotemEntity.update(totemState, isDreaming, effectiveDt, meta.upgrades.totemSpinSpeed);

  // Totem check — T does nothing in limbo (no totem anchor)
  if (input.wasPressed('t') && state.phase !== 'limbo') {
    showingTotemCheck = true;
    totemCheckTimer = BALANCE.totemCheckDuration;
    audio.playTotemSpin();
    // Cinematic camera: dramatic low angle for the totem check
    sceneManager.setCameraMode('DRAMATIC_LOW');
  }
  if (showingTotemCheck) {
    totemCheckTimer -= realDt;
    if (totemCheckTimer <= 0) {
      showingTotemCheck = false;
      audio.stopTotemSpin();
      // If reality check shows it stopped, play acoustic clatter
      if (!isDreaming) {
        audio.playTotemClatter();
      }
      sceneManager.setCameraMode('NORMAL');
    }
  }

  // Player update — ASYMMETRIC TIME DILATION:
  PlayerEntity.update(state.player, input.getState(), room, realDt, state.stability, reducedMotion);

  // Camera
  const roomBounds = RoomHelper.getBounds(room);
  sceneManager.setStability(state.stability);
  sceneManager.update(realDt);

  // Projection spawning
  projectionSpawnTimer -= realDt;
  const spawnInterval = BALANCE.projectionBaseSpawnInterval / (1 + state.disturbance * BALANCE.disturbanceSpawnMultiplier);
  if (projectionSpawnTimer <= 0 && layer.projections.length < BALANCE.maxProjectionsPerLayer) {
    projectionSpawnTimer = spawnInterval;
    const spawnPos = ProjectionEntity.getSpawnPosition(room, Math.random);
    const proj = ProjectionEntity.create(layer.projections.length, spawnPos.x, spawnPos.y, layer.depth);
    layer.projections.push(proj);
    audio.playProjectionAlert();
  }

  // Update projections
  for (const proj of layer.projections) {
    ProjectionEntity.update(proj, state.player, room, effectiveDt, state.echoLures, layer.depth);
    // Damage check (ignored during Lucid Surge phase i-frames)
    if (!state.player.isSurging && ProjectionEntity.damagePlayer(proj, state.player)) {
      if (PlayerEntity.takeDamage(state.player, proj.damage)) {
        state.stability -= BALANCE.stabilityHitPenalty;
        sceneManager.addTrauma(0.6, proj.x, proj.y);
        audio.playHit();
        hitStopTimer = 0.06;
        damageFlashAmount = 0.5;
        const hitAngle = Math.atan2(proj.vy, proj.vx);
        spawnCoreFlash(state.player.x, state.player.y, 34);
        spawnSparkParticles(state.player.x, state.player.y, '#ff2a2a', 24, {
          dirAngle: hitAngle,
          spread: Math.PI * 0.6,
          speedMin: 120,
          speedMax: 240,
          lifeMin: 0.25,
          lifeMax: 0.55,
          sizeMin: 2,
          sizeMax: 5,
        });
        if (state.stability <= 0) {
          state.stability = 0;
          enterLimbo();
          return;
        }
      }
    }
  }

  // Object interactions
  for (const obj of room.objects) {
    if (obj.collected) continue;

    if (obj.type === 'fragment') {
      if (PlayerEntity.pickupFragment(state.player, obj.x, obj.y)) {
        obj.collected = true;
        state.fragments += 1;
        state.totalFragments += 1;
        audio.playFragmentPickup();
        spawnCoreFlash(obj.x, obj.y, 22);
        spawnSparkParticles(obj.x, obj.y, layer.theme.palette.accent, 14, {
          dirAngle: -Math.PI / 2,
          spread: Math.PI,
          speedMin: 70,
          speedMax: 150,
          lifeMin: 0.3,
          lifeMax: 0.55,
          sizeMin: 2,
          sizeMax: 4,
        });
      }
    } else if (obj.type === 'memory') {
      // Memory object resonance (interact with E)
      const dx = state.player.x - obj.x;
      const dy = state.player.y - obj.y;
      if (dx * dx + dy * dy < BALANCE.memoryResonanceRadius * BALANCE.memoryResonanceRadius) {
        if (input.wasPressed('e') && !obj.resonated) {
          obj.resonated = true;
          const catalystBonus = (meta.upgrades.memoryCatalyst ?? 0) * BALANCE.upgradeEffects.memoryCatalystBonusPerLevel;
          const stabRestored = BALANCE.memoryResonanceStabilityBonus + catalystBonus;
          state.stability = Math.min(100, state.stability + stabRestored);
          audio.playMemoryResonance();
          const vignetteText = (obj.memoryKind && state.target?.memoryVignettes?.[obj.memoryKind])
            ?? `A vivid memory from the depths of ${state.target?.name ?? 'the mind'}.`;
          state.activeResonance = {
            text: vignetteText,
            timer: 4.5,
            name: obj.memoryKind ?? 'memory',
          };
          spawnCoreFlash(obj.x, obj.y, 38);
          spawnSparkParticles(obj.x, obj.y, layer.theme.palette.accent, 22, {
            speedMin: 80,
            speedMax: 160,
            lifeMin: 0.4,
            lifeMax: 0.8,
            sizeMin: 2,
            sizeMax: 5,
          });
          sceneManager.addTrauma(0.3, obj.x, obj.y);
        }
      }
    } else if (obj.type === 'disturbance') {
      // Disturbance objects are destroyed on contact, increasing disturbance
      const dx = state.player.x - obj.x;
      const dy = state.player.y - obj.y;
      if (dx * dx + dy * dy < (obj.radius + 20) * (obj.radius + 20)) {
        obj.collected = true;
        state.disturbance += BALANCE.disturbancePerObjectDestroyed;
        spawnCoreFlash(obj.x, obj.y, 26);
        spawnSparkParticles(obj.x, obj.y, '#ff4444', 18, {
          speedMin: 80,
          speedMax: 180,
          lifeMin: 0.3,
          lifeMax: 0.6,
          sizeMin: 2,
          sizeMax: 5,
        });
      }
    } else if (obj.type === 'descent-anchor' || obj.type === 'seed-anchor') {
      // Interact with E
      if (input.wasPressed('e')) {
        const dx = state.player.x - obj.x;
        const dy = state.player.y - obj.y;
        if (dx * dx + dy * dy < 60 * 60) {
          if (obj.type === 'descent-anchor' && state.currentLayer < MAX_DEPTH) {
            descendDeeper();
          } else if (obj.type === 'seed-anchor' && state.currentLayer === MAX_DEPTH) {
            seedPlantTimer = 0.001; // begin planting
          }
        }
      }
      if (obj.type === 'seed-anchor' && seedPlantTimer > 0 && !state.seedPlanted) {
        const dx = state.player.x - obj.x;
        const dy = state.player.y - obj.y;
        if (dx * dx + dy * dy < 60 * 60 && input.isDown('e')) {
          seedPlantTimer += realDt;
          if (seedPlantTimer >= BALANCE.seedPlantTime) {
            state.seedPlanted = true;
            layer.seedPlantedHere = true;
            audio.playSeedPlant();
            audio.playBraaam();
            sceneManager.addTrauma(0.8, obj.x, obj.y);
            flashAmount = 0.8;
            hitStopTimer = 0.12;
            spawnCoreFlash(obj.x, obj.y, 60);
            spawnSparkParticles(obj.x, obj.y, layer.theme.palette.accent, 40, {
              speedMin: 100,
              speedMax: 220,
              lifeMin: 0.8,
              lifeMax: 1.2,
              sizeMin: 2,
              sizeMax: 5,
            });
            beginKickSequence();
          }
        } else {
          seedPlantTimer = 0;
        }
      }
    }
  }

  // Room transitions (doors)
  checkDoorTransition(room, layer);

  // Disturbance accumulation per second in room
  state.disturbance += BALANCE.disturbancePerSecondInRoom * realDt;
  state.disturbance = Math.min(state.disturbance, BALANCE.disturbanceMaxPerRoom * (state.currentLayer + 1));

  // Off-screen regeneration for Abyss layer
  if (layer.theme.visualRule === 'regenerate') {
    const playerTile = RoomHelper.pixelToTile(state.player.x, state.player.y);
    for (let i = 0; i < layer.rooms.length; i++) {
      if (i === layer.currentRoomIndex) continue;
      const r = layer.rooms[i];
      r.hasBeenOffscreen = true;
    }
    // Regenerate rooms that have been offscreen (when player re-enters)
    const currentRoom = layer.rooms[layer.currentRoomIndex];
    if (currentRoom.hasBeenOffscreen) {
      layer.rooms[layer.currentRoomIndex] = RoomHelper.regenerateIfNeeded(currentRoom, layer.theme, runSeed + layer.depth * 1000 + layer.currentRoomIndex);
    }
  }

  // Particles — use effectiveDt so ambient particles slow in deeper layers
  // (the dream world slows, matching the projection speed).
  updateDreamParticles(layer, effectiveDt);

  // 3D world update
  worldRenderer.update(state, layer, room, realDt, gameLoop.time);
  atmosphere.update(realDt, gameLoop.time);

  // Flash decay
  if (flashAmount > 0) { flashAmount -= realDt * 3; if (flashAmount < 0) flashAmount = 0; }
  if (damageFlashAmount > 0) { damageFlashAmount -= realDt * 4; if (damageFlashAmount < 0) damageFlashAmount = 0; }
}

function checkDoorTransition(room: Room, layer: DreamLayer): void {
  for (const door of room.doors) {
    const doorPx = RoomHelper.tileToPixel(door.x, door.y);
    const dx = state.player.x - (doorPx.x + BALANCE.tileSize / 2);
    const dy = state.player.y - (doorPx.y + BALANCE.tileSize / 2);
    if (dx * dx + dy * dy < (BALANCE.tileSize * 0.6) * (BALANCE.tileSize * 0.6)) {
      // Transition to connected room
      if (door.connectsToRoom >= 0 && door.connectsToRoom < layer.rooms.length) {
        layer.currentRoomIndex = door.connectsToRoom;
        state.disturbance += BALANCE.disturbancePerRoomEnter;
        const newRoom = layer.rooms[layer.currentRoomIndex];
        const newBounds = RoomHelper.getBounds(newRoom);
        // Place player at opposite side
        state.player.x = newBounds.x + newBounds.w / 2;
        state.player.y = newBounds.y + newBounds.h / 2;
        // Camera target is handled by WorldRenderer.update
      }
      break;
    }
  }
}

function descendDeeper(): void {
  state.currentLayer++;
  state.phase = 'descending';
  descendTimer = BALANCE.descentTime;
  descendTargetDepth = state.currentLayer;
  descentImpactTriggered = false;
  audio.playDescend();

  // Place player at center of first room of new layer
  const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  if (layer && layer.rooms.length > 0) {
    const room = layer.rooms[0];
    const bounds = RoomHelper.getBounds(room);
    state.player.x = bounds.x + bounds.w / 2;
    state.player.y = bounds.y + bounds.h / 2;
  }

  // Update 3D atmosphere for the new layer
  if (layer) {
    atmosphere.setLayer(layer.theme, layer.depth);
    worldRenderer.setLayerTheme(layer.theme);
  }
}

function beginKickSequence(): void {
  state.phase = 'kicking';
  const kickZone = TotemEntity.getKickZoneWidth(state.totem, meta.upgrades.kickZoneBonus);
  kickState = KickSequence.create(state.currentLayer, kickZone);
  audio.playKick();
}

function updateKicking(realDt: number): void {
  if (!kickState) return;

  const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  const depth = layer ? layer.depth : 1;

  KickSequence.update(kickState, realDt, depth);

  // Update scene manager — camera, lighting, post-processing must keep running
  // during the kick phase. Without this, the camera freezes and the screen
  // may render incorrectly (the kick pops layers but the scene must still update).
  sceneManager.update(realDt);

  // Update the 3D world — player position, projections, anchors must keep
  // animating during the kick. The world is still alive until the kick completes.
  const kickLayer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  if (kickLayer) {
    const kickRoom = kickLayer.rooms[kickLayer.currentRoomIndex] ?? kickLayer.rooms[0];
    if (kickRoom) {
      worldRenderer.update(state, kickLayer, kickRoom, realDt, gameLoop.time);
    }
  }
  atmosphere.update(realDt, gameLoop.time);

  if (input.wasPressed('k')) {
    const result = KickSequence.attemptKick(kickState);
    if (result.success) {
      audio.playKickHit();
      // KICK AS WORLD-COLLAPSE: heavy trauma, white flash, debris particles.
      // The dream layer is being destroyed — the world dissolves around you.
      const kickColor = layer ? layer.theme.palette.accent : '#e8c89a';
      sceneManager.addTrauma(1.0, state.player.x, state.player.y);
      worldRenderer.triggerKick(kickColor);
      flashAmount = 0.8;
      hitStopTimer = 0.08; // 80ms freeze — the world shatters
      kickCollapseTimer = 1.0; // world-collapse duration
      // Debris particles fly upward — the world is coming apart.
      spawnCoreFlash(state.player.x, state.player.y, 50);
      spawnSparkParticles(state.player.x, state.player.y, kickColor, 28, {
        dirAngle: state.player.facing,
        spread: Math.PI / 3,
        speedMin: 140,
        speedMax: 260,
        lifeMin: 0.3,
        lifeMax: 0.6,
        sizeMin: 2,
        sizeMax: 5,
      });
      // Upward debris burst — 25-30 particles flying up (world collapsing).
      spawnSparkParticles(state.player.x, state.player.y, '#ffffff', 28, {
        dirAngle: -Math.PI / 2, // straight up
        spread: Math.PI * 0.8,  // wide upward cone
        speedMin: 100,
        speedMax: 280,
        lifeMin: 0.6,
        lifeMax: 1.2,
        sizeMin: 3,
        sizeMax: 7,
      });
      // NOTE: The architecture specialist's dissolve material should be
      // triggered here. When kickCollapseTimer > 0, set the dissolve uniform
      // on the world materials to begin the collapse visual. For now, the
      // trauma + flash + debris provide the immediate feedback.
      // Pop the layer BEFORE checking completion so the stack is always consistent.
      const popped = DreamStack.popLayer(state.layerStack);
      state.layerStack = popped.stack;
      state.currentLayer = Math.max(0, state.currentLayer - 1);
      if (result.completed) {
        // All kicks successful — wake up!
        endRun(true);
        return;
      }
    } else {
      audio.playKickMiss();
      state.stability -= BALANCE.stabilityKickMissPenalty;
      // Medium tier: missed kick — heavy trauma, no directional source.
      sceneManager.addTrauma(0.6);
      if (state.stability <= 0) {
        state.stability = 0;
        enterLimbo();
        return;
      }
    }
  }

  // Update totem (still spinning in dream)
  TotemEntity.update(totemState, true, realDt, meta.upgrades.totemSpinSpeed);
  updateAmbientParticles(realDt);

  // Decay kick collapse timer and flash
  if (kickCollapseTimer > 0) {
    kickCollapseTimer -= realDt;
    if (kickCollapseTimer < 0) kickCollapseTimer = 0;
    // World-collapse: boost distortion while the world dissolves.
    // The dream is coming apart — the fabric of reality warps.
    const collapseStrength = kickCollapseTimer; // 1.0 -> 0.0
    atmosphere.setDistortionStrength(0.02 * collapseStrength);
  } else {
    // Restore normal distortion after collapse ends
    const kickLayer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
    const kickDepth = kickLayer ? kickLayer.depth : 1;
    if (kickDepth === 3) atmosphere.setDistortionStrength(0.008);
    else if (kickDepth === 2) atmosphere.setDistortionStrength(0.004);
    else atmosphere.setDistortionStrength(0.001);
  }
  if (flashAmount > 0) { flashAmount -= realDt * 3; if (flashAmount < 0) flashAmount = 0; }
}

function updateLimbo(realDt: number): void {
  state.limboTimer -= realDt;
  if (state.limboTimer <= 0) {
    endRun(false);
    return;
  }

  // Player can still move in limbo
  const topLayer = state.layerStack[state.layerStack.length - 1];
  if (topLayer && topLayer.rooms.length > 0) {
    const room = topLayer.rooms[0];
    PlayerEntity.update(state.player, input.getState(), room, realDt, 50, reducedMotion);

    // Check fragment pickup
    for (const obj of room.objects) {
      if (obj.type === 'fragment' && !obj.collected) {
        if (PlayerEntity.pickupFragment(state.player, obj.x, obj.y)) {
          obj.collected = true;
          state.limboFragmentFound = true;
          audio.playFragmentPickup();
          // Escape limbo — return to atelier with reduced fragments
          endRun(false);
          return;
        }
      }
    }

    // Camera
    const roomBounds = RoomHelper.getBounds(room);
    sceneManager.update(realDt);

    // Update the 3D world — build and render the limbo room.
    // Without this, the WorldRenderer never builds the room and the screen is black.
    worldRenderer.update(state, topLayer, room, realDt, gameLoop.time);
    atmosphere.update(realDt, gameLoop.time);

    // PROGRESSIVE VISIBILITY REDUCTION — existential dread.
    // As limboTimer decreases, fog thickens and ambient light dims.
    // At 30s: normal. At 15s: fog density * 2. At 5s: fog density * 4, ambient * 0.3.
    const scene = sceneManager.getScene();
    const t = state.limboTimer; // seconds remaining
    let fogMultiplier = 1;
    let ambientMultiplier = 1;
    if (t <= 5) {
      // Critical: fog * 4, ambient * 0.3
      const k = (5 - t) / 5; // 0 -> 1 as time runs out
      fogMultiplier = 2 + k * 2; // 2 -> 4
      ambientMultiplier = 1 - k * 0.7; // 1 -> 0.3
    } else if (t <= 15) {
      // Tense: fog * 2
      const k = (15 - t) / 10; // 0 -> 1
      fogMultiplier = 1 + k; // 1 -> 2
      ambientMultiplier = 1 - k * 0.2; // 1 -> 0.8
    }
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = 0.006 * fogMultiplier;
    }
    // Ambient light intensity — find the ambient light in the scene
    // (SceneManager adds an AmbientLight; we adjust it via traverse)
    scene.traverse((obj: THREE.Object3D) => {
      const light = obj as THREE.AmbientLight;
      if (light.isAmbientLight) {
        light.intensity = 0.9 * ambientMultiplier;
      }
    });
  }
}

// === Particles ===
function updateAmbientParticles(dt: number): void {
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.type === 'spark') {
      // Gravity-like deceleration: sparks start fast and bleed off speed,
      // with a mild downward pull so directional bursts arc naturally.
      const drag = Math.pow(0.90, dt * 60); // frame-rate independent drag
      p.vx *= drag;
      p.vy *= drag;
      p.vy += 90 * dt; // gentle downward gravity (world y = down)
    }
    p.life -= dt;
  }
  particles = particles.filter(p => p.life > 0);
  updateCoreFlashes(dt);
}

function updateDreamParticles(layer: DreamLayer, dt: number): void {
  // Spawn ambient particles based on theme (2D sparks only; 3D particles handled by Atmosphere)
  const theme = layer.theme;
  const spawnRate = reducedMotion ? BALANCE.fogParticleCount * 0.3 : BALANCE.fogParticleCount;
  if (particles.length < spawnRate && Math.random() < 0.3) {
    particles.push(createParticle(theme.particleType, theme.palette));
  }
  updateAmbientParticles(dt);
}

function createParticle(type: string, palette: any): Particle {
  const x = state.player.x + (Math.random() - 0.5) * canvasW;
  const y = state.player.y + (Math.random() - 0.5) * canvasH;
  switch (type) {
    case 'drift':
      return { x, y, vx: (Math.random() - 0.5) * 10, vy: -5 - Math.random() * 10, life: 3 + Math.random() * 2, maxLife: 5, color: palette.fog, size: 2 + Math.random() * 3, type: 'drift' };
    case 'rain':
      return { x, y, vx: -20, vy: 200 + Math.random() * 100, life: 2, maxLife: 2, color: palette.accent, size: 1, type: 'rain' };
    case 'ash':
      return { x, y, vx: (Math.random() - 0.5) * 20, vy: 30 + Math.random() * 40, life: 4 + Math.random() * 3, maxLife: 7, color: palette.accent, size: 1 + Math.random() * 2, type: 'ash' };
    default:
      return { x, y, vx: 0, vy: 0, life: 1, maxLife: 1, color: palette.fog, size: 1, type: 'drift' };
  }
}

// Directional spark burst options. When `dirAngle` is omitted, sparks emit
// in a full radial circle; when provided, they emit in a cone of `spread`
// radians centered on `dirAngle` (flying AWAY from the impact normal).
interface SparkOptions {
  dirAngle?: number;
  spread?: number;       // cone width in radians (directional mode)
  speedMin?: number;
  speedMax?: number;
  lifeMin?: number;
  lifeMax?: number;
  sizeMin?: number;
  sizeMax?: number;
}

function spawnSparkParticles(
  x: number, y: number, color: string, count: number = 8, opts: SparkOptions = {},
): void {
  if (reducedMotion) count = Math.ceil(count * 0.4);
  const {
    dirAngle,
    spread = Math.PI * 0.5,
    speedMin = 60,
    speedMax = 160,
    lifeMin = 0.3,
    lifeMax = 0.6,
    sizeMin = 2,
    sizeMax = 5,
  } = opts;
  for (let i = 0; i < count; i++) {
    let angle: number;
    if (dirAngle !== undefined) {
      // Directional cone: emit around dirAngle within ±spread/2.
      angle = dirAngle + (Math.random() - 0.5) * spread;
    } else {
      // Radial: evenly distributed full circle.
      angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    }
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const life = lifeMin + Math.random() * (lifeMax - lifeMin);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      maxLife: life,
      color,
      size: sizeMin + Math.random() * (sizeMax - sizeMin),
      type: 'spark',
    });
  }
}

// --- Core flash: a single white circle that scales up + fades in ~100ms ---
function spawnCoreFlash(x: number, y: number, size: number = 30): void {
  if (reducedMotion) return;
  coreFlashes.push({ x, y, life: 0.1, maxLife: 0.1, size });
}

function updateCoreFlashes(dt: number): void {
  for (const f of coreFlashes) f.life -= dt;
  coreFlashes = coreFlashes.filter(f => f.life > 0);
}

// Project a world-pixel coordinate to HUD-canvas screen pixels using the
// active 3D camera. Returns null if the point is behind the camera.
const _projVec = new THREE.Vector3();
function worldToScreen(wx: number, wy: number): { x: number; y: number } | null {
  const cam = sceneManager.getCamera();
  _projVec.set(wx * PIXEL_TO_WORLD, 0, wy * PIXEL_TO_WORLD);
  _projVec.project(cam);
  if (_projVec.z > 1) return null; // behind camera / clipped
  return {
    x: (_projVec.x * 0.5 + 0.5) * canvasW,
    y: (-_projVec.y * 0.5 + 0.5) * canvasH,
  };
}

// Draw all 2D particles + core flashes onto the HUD canvas. Particles live
// in world-pixel space and are projected to screen each frame.
function drawWorldParticles(): void {
  // Core flashes first (under sparks): white circle scales up + fades out.
  for (const f of coreFlashes) {
    const s = worldToScreen(f.x, f.y);
    if (!s) continue;
    const t = 1 - (f.life / f.maxLife); // 0 -> 1 over lifetime
    const radius = 4 + t * f.size;
    const alpha = (1 - t) * 0.85;
    hudCtx.save();
    hudCtx.globalAlpha = alpha;
    const grad = hudCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    hudCtx.fillStyle = grad;
    hudCtx.beginPath();
    hudCtx.arc(s.x, s.y, radius, 0, Math.PI * 2);
    hudCtx.fill();
    hudCtx.restore();
  }

  // Sparks: glowing dots with fading alpha.
  for (const p of particles) {
    if (p.type !== 'spark' && p.type !== 'fragment') continue;
    const s = worldToScreen(p.x, p.y);
    if (!s) continue;
    const alpha = p.maxLife > 0 ? Math.max(0, Math.min(1, p.life / p.maxLife)) : 0;
    if (alpha <= 0) continue;
    hudCtx.save();
    hudCtx.globalAlpha = alpha;
    hudCtx.fillStyle = p.color;
    hudCtx.beginPath();
    hudCtx.arc(s.x, s.y, p.size, 0, Math.PI * 2);
    hudCtx.fill();
    // Additive glow halo for punch.
    hudCtx.globalAlpha = alpha * 0.4;
    hudCtx.beginPath();
    hudCtx.arc(s.x, s.y, p.size * 2.2, 0, Math.PI * 2);
    hudCtx.fill();
    hudCtx.restore();
  }
}

// === Render ===
// DUAL-CANVAS: WebGL renders the 3D world, HUD canvas renders 2D overlay.
function render(): void {
  // Clear HUD canvas
  hudCtx.clearRect(0, 0, canvasW, canvasH);

  // Menu screens: hide WebGL, render 2D only
  if (shellPhase === 'title') {
    webglCanvas.style.display = 'none';
    hudCtx.fillStyle = '#000';
    hudCtx.fillRect(0, 0, canvasW, canvasH);
    MenuScreen.renderTitle(hudCtx, canvasW, canvasH, gameLoop.time, meta);
    return;
  }

  if (shellPhase === 'intro') {
    webglCanvas.style.display = 'none';
    hudCtx.fillStyle = '#000';
    hudCtx.fillRect(0, 0, canvasW, canvasH);
    MenuScreen.renderIntroBriefing(hudCtx, canvasW, canvasH, gameLoop.time);
    return;
  }

  if (shellPhase === 'howto') {
    webglCanvas.style.display = 'none';
    hudCtx.fillStyle = '#000';
    hudCtx.fillRect(0, 0, canvasW, canvasH);
    MenuScreen.renderHowToPlay(hudCtx, canvasW, canvasH);
    return;
  }

  if (shellPhase === 'atelier') {
    webglCanvas.style.display = 'none';
    hudCtx.fillStyle = '#000';
    hudCtx.fillRect(0, 0, canvasW, canvasH);
    Atelier.render(hudCtx, canvasW, canvasH, meta, gameLoop.time, atelierSelectedUpgrade);
    return;
  }

  // Playing: show WebGL canvas, render 3D world + 2D HUD overlay
  webglCanvas.style.display = 'block';
  renderGame();

  if (shellPhase === 'paused') {
    HUD.renderPauseOverlay(hudCtx, canvasW, canvasH);
    return;
  }

  if (state.phase === 'won') {
    MenuScreen.renderWin(hudCtx, canvasW, canvasH, state, gameLoop.time);
  } else if (state.phase === 'lost') {
    MenuScreen.renderLose(hudCtx, canvasW, canvasH, state, gameLoop.time);
  }
}

function renderGame(): void {
  if (state.phase === 'descending') {
    // === THE DESCENT — signature moment ===
    // 4-phase animation over 3 seconds:
    //   A (0-25%):   Pull back — camera rises, world shrinks below
    //   B (25-50%):  Dissolve — fog closes in, world disappears
    //   C (50-75%):  Fall — camera dives, new layer materializes
    //   D (75-100%): Impact — slam into position, flash, shake
    webglCanvas.style.display = 'block';

    const progress = 1 - (descendTimer / BALANCE.descentTime);
    const cam = sceneManager.getCamera();
    const scene = sceneManager.getScene();
    const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
    const theme = layer ? layer.theme : getThemeForDepth(descendTargetDepth);

    // Base camera position (normal gameplay)
    const baseY = 18;
    const baseZ = 14;

    // Phase A: Pull back (0-25%)
    // Camera rises from 18 to 40, pulls back from z=14 to z=28
    const pullProgress = Math.min(progress / 0.25, 1);
    const pullEase = pullProgress * pullProgress; // ease-in

    // Phase B: Dissolve (25-50%)
    // Fog closes in completely
    const dissolveProgress = Math.min(Math.max(progress - 0.25, 0) / 0.25, 1);

    // Phase C: Fall (50-75%)
    // Camera dives from y=40 down to y=8
    const fallProgress = Math.min(Math.max(progress - 0.5, 0) / 0.25, 1);
    const fallEase = fallProgress * fallProgress * (3 - 2 * fallProgress); // smoothstep

    // Phase D: Impact (75-100%)
    // Camera slams from y=8 to y=18
    const impactProgress = Math.min(Math.max(progress - 0.75, 0) / 0.25, 1);
    const impactEase = 1 - Math.pow(1 - impactProgress, 3); // ease-out

    // Compute camera Y
    let camY = baseY;
    if (progress < 0.25) {
      camY = baseY + pullEase * 22; // 18 → 40
    } else if (progress < 0.5) {
      camY = 40; // hold at top during dissolve
    } else if (progress < 0.75) {
      camY = 40 - fallEase * 32; // 40 → 8
    } else {
      camY = 8 + impactEase * 10; // 8 → 18
    }

    // Compute camera Z (pull back then return)
    let camZ = baseZ;
    if (progress < 0.25) {
      camZ = baseZ + pullEase * 14; // 14 → 28
    } else if (progress < 0.5) {
      camZ = 28;
    } else if (progress < 0.75) {
      camZ = 28 - fallEase * 14; // 28 → 14
    } else {
      camZ = 14;
    }

    // Camera X follows player position (scaled to world units)
    const camX = state.player.x * (2 / 32); // PIXEL_TO_WORLD = 2/32

    // Apply camera position (with shake from impact phase)
    let shakeX = 0, shakeY = 0;
    if (progress >= 0.75) {
      const shakeDecay = 1 - impactProgress;
      shakeX = (Math.random() - 0.5) * 2 * shakeDecay;
      shakeY = (Math.random() - 0.5) * 2 * shakeDecay;
    }
    cam.position.set(camX + shakeX, camY + shakeY, camZ);
    cam.lookAt(camX, 0, camZ - baseZ);

    // Fog density: normal → moderate → clearing → normal
    // NEVER opaque. The player must see the descent — it's the signature moment.
    // Prior version ramped to 0.156 (98% fog at 25 units) = invisible screen.
    let fogDensity;
    if (progress < 0.25) {
      fogDensity = 0.006 + pullEase * 0.012; // 0.006 → 0.018
    } else if (progress < 0.5) {
      fogDensity = 0.018 + dissolveProgress * 0.020; // 0.018 → 0.038 (moody, not opaque)
    } else if (progress < 0.75) {
      fogDensity = 0.038 - fallEase * 0.030; // 0.038 → 0.008
    } else {
      fogDensity = 0.008 - impactEase * 0.002; // 0.008 → 0.006
    }

    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density = fogDensity;
      // Tint fog toward the destination layer's color during fall
      if (theme && progress > 0.5) {
        const fogColor = new THREE.Color(theme.palette.bg);
        scene.fog.color.copy(fogColor);
      }
    }

    // Render the 3D scene
    sceneManager.render();

    // Restore fog for next frame's normal rendering
    if (scene.fog instanceof THREE.FogExp2 && theme) {
      scene.fog.density = 0.006;
      scene.fog.color.set(theme.palette.bg);
    }

    // HUD overlay
    hudCtx.clearRect(0, 0, canvasW, canvasH);

    // Phase B: dark overlay during dissolve — subtle, NOT a black screen.
    // Prior version peaked at 0.85 alpha = essentially invisible. Keep it at 0.35
    // so the world is still visible through the fog transition.
    if (progress >= 0.25 && progress < 0.6) {
      const darkAlpha = Math.sin((progress - 0.25) / 0.35 * Math.PI) * 0.35;
      hudCtx.fillStyle = `rgba(0, 0, 0, ${darkAlpha})`;
      hudCtx.fillRect(0, 0, canvasW, canvasH);
    }

    // Phase C: Light streaks during the fall — gives vertigo, the feeling
    // of plummeting through layers of consciousness. Streaks stream upward
    // (relative to the falling camera) using the layer's accent color.
    if (progress > 0.45 && progress < 0.85) {
      const streakAlpha = Math.sin((progress - 0.45) / 0.4 * Math.PI) * 0.4;
      const streakColor = theme ? theme.palette.accent : '#ffe0b0';
      const rgb = hexToRgb(streakColor);
      hudCtx.save();
      hudCtx.globalAlpha = streakAlpha;
      for (let i = 0; i < 12; i++) {
        const x = (i / 12) * canvasW + (Math.sin(gameLoop.time * 8 + i * 1.7) * 30);
        const streakLen = 80 + Math.sin(gameLoop.time * 5 + i) * 40;
        const yOff = (gameLoop.time * 600 + i * 50) % (canvasH + 100);
        const y = canvasH - yOff + 50;
        const grad = hudCtx.createLinearGradient(x, y, x, y + streakLen);
        grad.addColorStop(0, `rgba(${rgb}, 0)`);
        grad.addColorStop(0.5, `rgba(${rgb}, 0.6)`);
        grad.addColorStop(1, `rgba(${rgb}, 0)`);
        hudCtx.fillStyle = grad;
        hudCtx.fillRect(x - 1, y, 2, streakLen);
      }
      hudCtx.restore();
    }

    // Phase D: white flash on impact
    if (flashAmount > 0) {
      hudCtx.fillStyle = `rgba(255, 255, 255, ${flashAmount})`;
      hudCtx.fillRect(0, 0, canvasW, canvasH);
    }

    // Layer name text — appears during fall, dramatic
    if (progress > 0.55 && progress < 0.95) {
      const textAlpha = Math.sin((progress - 0.55) / 0.4 * Math.PI) * 0.85;
      const layerName = theme ? theme.name.toUpperCase() : 'DESCENT';
      const layerDesc = theme ? theme.description : '';

      // Glow behind the text
      hudCtx.save();
      hudCtx.shadowColor = theme ? theme.palette.accent : '#ffe0b0';
      hudCtx.shadowBlur = 20;
      hudCtx.fillStyle = `rgba(255, 255, 255, ${textAlpha})`;
      hudCtx.font = 'bold 42px Georgia';
      hudCtx.textAlign = 'center';
      hudCtx.fillText(layerName, canvasW / 2, canvasH / 2 - 10);
      hudCtx.restore();

      hudCtx.fillStyle = `rgba(220, 220, 220, ${textAlpha * 0.7})`;
      hudCtx.font = 'italic 16px Georgia';
      hudCtx.textAlign = 'center';
      hudCtx.fillText(layerDesc, canvasW / 2, canvasH / 2 + 24);
    }

    // Phase C narrative: target name, idea, bio — appear during the fall and fade out.
    // Shows during 45-85% of the descent (the fall phase).
    if (state.target && progress > 0.45 && progress < 0.85) {
      const narrProgress = (progress - 0.45) / 0.4; // 0 -> 1
      const narrAlpha = Math.sin(narrProgress * Math.PI) * 0.9; // fade in and out
      const cx = canvasW / 2;
      const cy = canvasH / 2;

      hudCtx.save();
      hudCtx.globalAlpha = narrAlpha;

      // Target name — large, dramatic
      hudCtx.font = 'bold 22px Georgia';
      hudCtx.textAlign = 'center';
      hudCtx.textBaseline = 'middle';
      hudCtx.fillStyle = state.target.portraitColor;
      hudCtx.shadowColor = state.target.portraitColor;
      hudCtx.shadowBlur = 12;
      hudCtx.fillText('ENTERING THE MIND OF', cx, cy - 90);
      hudCtx.font = 'bold 34px Georgia';
      hudCtx.fillText(state.target.name, cx, cy - 58);
      hudCtx.shadowBlur = 0;

      // Idea — smaller, evocative
      hudCtx.font = 'italic 20px Georgia';
      hudCtx.fillStyle = '#e8c89a';
      hudCtx.fillText(`Plant the idea: ${state.target.idea}`, cx, cy + 60);

      // Bio — single line, mysterious
      hudCtx.font = '14px Georgia';
      hudCtx.fillStyle = 'rgba(200, 180, 150, 0.8)';
      hudCtx.fillText(state.target.bio, cx, cy + 88);

      hudCtx.globalAlpha = 1;
      hudCtx.restore();
    }
    return;
  }

  webglCanvas.style.display = 'block';

  const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  const theme = layer ? layer.theme : getThemeForDepth(1);

  if (state.phase === 'hub') {
    sceneManager.render();
    HUD.renderHubHUD(hudCtx, state, totemState, canvasW, canvasH, gameLoop.time, state.activeHubDoor);
    renderHubInteractiveWaypoints();

    if (showingTotemCheck) {
      renderTotemCheck(theme);
    }
    return;
  }

  if (state.phase === 'limbo') {
    // Limbo: stark wireframe world — atmosphere handles this
    sceneManager.render();
    HUD.renderLimboHUD(hudCtx, state, canvasW, canvasH, gameLoop.time);
    return;
  }

  if (!layer) return;

  // 3D Totem check: override camera to zoom close to the player.
  // The camera lerps to a close-up position looking at the totem (left hand).
  if (showingTotemCheck && totemCheckTimer > 0) {
    const cam = sceneManager.getCamera();
    const playerWorldX = state.player.x * PIXEL_TO_WORLD;
    const playerWorldZ = state.player.y * PIXEL_TO_WORLD;
    // Totem check duration and elapsed for lerp factor
    const checkDuration = BALANCE.totemCheckDuration;
    const elapsed = checkDuration - totemCheckTimer;
    // Zoom in over first 0.3s, hold, zoom out over last 0.3s
    let zoomFactor: number;
    if (elapsed < 0.3) {
      zoomFactor = elapsed / 0.3; // 0 -> 1
    } else if (totemCheckTimer < 0.3) {
      zoomFactor = totemCheckTimer / 0.3; // 1 -> 0
    } else {
      zoomFactor = 1; // full zoom
    }
    // Lerp from normal camera (y=18, z=14) to close-up (y=6, z=5)
    const normalY = 18;
    const normalZ = 14;
    const closeY = 6;
    const closeZ = 5;
    const camY = normalY + (closeY - normalY) * zoomFactor;
    const camZ = normalZ + (closeZ - normalZ) * zoomFactor;
    cam.position.set(playerWorldX, camY, playerWorldZ + camZ);
    cam.lookAt(playerWorldX, 0, playerWorldZ);
  }

  // Render the 3D world
  sceneManager.render();

  // HUD overlay (2D, screen space)
  if (state.phase === 'in-dream' || state.phase === 'kicking') {
    // 2D impact/pickup particles — projected from world to screen, drawn
    // beneath the HUD UI so text stays on top.
    drawWorldParticles();

    // Floating 3D interactive waypoint pins (Porto Celeste style)
    renderInteractiveWaypoints();

    // Glassmorphic HUD overlay & tactical radar
    HUD.render(hudCtx, state, totemState, canvasW, canvasH, gameLoop.time);

    // Totem check overlay
    if (showingTotemCheck) {
      renderTotemCheck(theme);
    }

    // Seed planting progress
    if (seedPlantTimer > 0 && !state.seedPlanted) {
      renderPlantingProgress(theme);
    }

    // Onboarding: directional indicator toward nearest objective
    if (state.phase === 'in-dream') {
      renderDirectionalIndicator(layer, theme);
    }
  }

  // Damage flash — red overlay that fades
  if (damageFlashAmount > 0) {
    hudCtx.fillStyle = `rgba(255, 0, 0, ${damageFlashAmount * 0.4})`;
    hudCtx.fillRect(0, 0, canvasW, canvasH);
  }

  // Low stability warning — pulsing red vignette
  if (state.phase === 'in-dream' && state.stability < 30) {
    const pulse = 0.15 + Math.sin(gameLoop.time * 4) * 0.08;
    const intensity = (30 - state.stability) / 30;
    const gradient = hudCtx.createRadialGradient(
      canvasW / 2, canvasH / 2, canvasH * 0.3,
      canvasW / 2, canvasH / 2, canvasH * 0.7,
    );
    gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(180, 0, 0, ${pulse * intensity})`);
    hudCtx.fillStyle = gradient;
    hudCtx.fillRect(0, 0, canvasW, canvasH);
  }

  // White flash (seed plant, descent impact)
  if (flashAmount > 0) {
    hudCtx.fillStyle = `rgba(255, 255, 255, ${flashAmount})`;
    hudCtx.fillRect(0, 0, canvasW, canvasH);
  }

  // World-collapse overlay during kick — the dream is coming apart.
  // A bright edge glow radiates outward, fading as the world dissolves.
  if (kickCollapseTimer > 0) {
    const collapseAlpha = kickCollapseTimer * 0.3;
    const accent = theme ? theme.palette.accent : '#ffe0b0';
    const rgb = hexToRgb(accent);
    const grad = hudCtx.createRadialGradient(
      canvasW / 2, canvasH / 2, canvasH * 0.2,
      canvasW / 2, canvasH / 2, canvasH * 0.8,
    );
    grad.addColorStop(0, `rgba(${rgb}, 0)`);
    grad.addColorStop(0.6, `rgba(${rgb}, ${collapseAlpha * 0.3})`);
    grad.addColorStop(1, `rgba(${rgb}, ${collapseAlpha})`);
    hudCtx.fillStyle = grad;
    hudCtx.fillRect(0, 0, canvasW, canvasH);
  }

  // Kick sequence UI
  if (state.phase === 'kicking' && kickState) {
    const layerName = theme.name;
    KickSequence.render(hudCtx, kickState, canvasW, canvasH, layerName);
  }
}

/** Floating 3D interactive waypoint badges over Gateway Doors in the Antechamber. */
function renderHubInteractiveWaypoints(): void {
  if (!state.hubDoors) return;
  for (const door of state.hubDoors) {
    const s = worldToScreen(door.x, door.y);
    if (!s) continue;
    const dx = state.player.x - door.x;
    const dy = state.player.y - door.y;
    const inRange = dx * dx + dy * dy < 85 * 85;

    hudCtx.save();
    const pinY = s.y - 48;
    const targetColor = door.target.portraitColor || '#e8c89a';
    const label = inRange
      ? `[E] INITIATE: ${door.target.name}`
      : `\u25C6 DOOR ${door.label}: ${door.target.name}`;

    hudCtx.font = 'bold 11px monospace';
    const textW = hudCtx.measureText(label).width;
    const badgeW = textW + 20;
    const badgeH = 24;

    hudCtx.fillStyle = inRange ? targetColor : 'rgba(20, 16, 12, 0.85)';
    hudCtx.beginPath();
    hudCtx.roundRect(s.x - badgeW / 2, pinY - badgeH / 2, badgeW, badgeH, 12);
    hudCtx.fill();
    hudCtx.strokeStyle = targetColor;
    hudCtx.lineWidth = inRange ? 2 : 1;
    hudCtx.stroke();

    hudCtx.fillStyle = inRange ? '#0e0b08' : targetColor;
    hudCtx.textAlign = 'center';
    hudCtx.textBaseline = 'middle';
    hudCtx.fillText(label, s.x, pinY);
    hudCtx.restore();
  }
}

/** Floating 3D interactive waypoint pins projected in screen space over world objects (Porto Celeste style). */
function renderInteractiveWaypoints(): void {
  const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  if (!layer) return;
  const room = layer.rooms[layer.currentRoomIndex];
  if (!room) return;

  for (const obj of room.objects) {
    if (obj.collected) continue;
    const dx = state.player.x - obj.x;
    const dy = state.player.y - obj.y;
    const distSq = dx * dx + dy * dy;

    if (obj.type === 'memory' && !obj.resonated) {
      const s = worldToScreen(obj.x, obj.y);
      if (!s) continue;
      const inRange = distSq < BALANCE.memoryResonanceRadius * BALANCE.memoryResonanceRadius;

      hudCtx.save();
      const pinY = s.y - 28;
      const label = inRange ? '[E] RESONATE MEMORY' : '\u25C7 MEMORY RELIC';
      hudCtx.font = 'bold 10px monospace';
      const textW = hudCtx.measureText(label).width;
      const badgeW = textW + 16;
      const badgeH = 20;

      hudCtx.fillStyle = inRange ? 'rgba(106, 184, 216, 0.92)' : 'rgba(20, 16, 12, 0.75)';
      hudCtx.beginPath();
      hudCtx.roundRect(s.x - badgeW / 2, pinY - badgeH / 2, badgeW, badgeH, 10);
      hudCtx.fill();
      hudCtx.strokeStyle = inRange ? '#ffe0b0' : '#6ab8d8';
      hudCtx.lineWidth = 1;
      hudCtx.stroke();

      hudCtx.fillStyle = inRange ? '#0e0b08' : '#6ab8d8';
      hudCtx.textAlign = 'center';
      hudCtx.textBaseline = 'middle';
      hudCtx.fillText(label, s.x, pinY);
      hudCtx.restore();
    } else if (obj.type === 'descent-anchor' && state.currentLayer < MAX_DEPTH) {
      const s = worldToScreen(obj.x, obj.y);
      if (!s) continue;
      const inRange = distSq < 64 * 64;

      hudCtx.save();
      const pinY = s.y - 32;
      const label = inRange ? '[E] DESCEND PORTAL' : '\u25C6 DESCENT ANCHOR';
      hudCtx.font = 'bold 10px monospace';
      const textW = hudCtx.measureText(label).width;
      const badgeW = textW + 16;
      const badgeH = 20;

      hudCtx.fillStyle = inRange ? 'rgba(232, 200, 154, 0.95)' : 'rgba(20, 16, 12, 0.75)';
      hudCtx.beginPath();
      hudCtx.roundRect(s.x - badgeW / 2, pinY - badgeH / 2, badgeW, badgeH, 10);
      hudCtx.fill();
      hudCtx.strokeStyle = '#e8c89a';
      hudCtx.lineWidth = 1;
      hudCtx.stroke();

      hudCtx.fillStyle = inRange ? '#0e0b08' : '#e8c89a';
      hudCtx.textAlign = 'center';
      hudCtx.textBaseline = 'middle';
      hudCtx.fillText(label, s.x, pinY);
      hudCtx.restore();
    }
  }
}

function renderTotemCheck(theme: any): void {
  // Dark overlay — dims the world but keeps it visible.
  // The 3D camera has already zoomed close to the player (see renderGame).
  hudCtx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  hudCtx.fillRect(0, 0, canvasW, canvasH);

  // Large totem centered
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const size = 120;

  TotemEntity.render(totemState, hudCtx, cx, cy, size);

  // Status text — Inception-style narrative
  // In limbo, T does nothing (no totem anchor). In layers 1-3: "STILL DREAMING".
  // If this is a hub dream: "THIS IS A DREAM".
  let statusText = '...';
  let statusColor = '#888';
  if (state.phase === 'limbo') {
    statusText = 'NO ANCHOR';
    statusColor = '#666';
  } else {
    const check = TotemEntity.checkReality(totemState);
    if (check.confidence > 0) {
      if (state.isHubDream) {
        statusText = 'THIS IS A DREAM';
        statusColor = '#ff6644';
      } else if (check.isDream) {
        statusText = 'STILL DREAMING';
        statusColor = '#ff8844';
      } else {
        statusText = 'STILL DREAMING';
        statusColor = '#ff8844';
      }
    } else {
      statusText = 'STILL DREAMING';
      statusColor = '#ff8844';
    }
  }
  hudCtx.fillStyle = statusColor;
  hudCtx.font = 'bold 24px Georgia';
  hudCtx.textAlign = 'center';
  hudCtx.fillText(statusText, cx, cy + size / 2 + 40);
  hudCtx.fillStyle = '#888';
  hudCtx.font = '14px Georgia';
  hudCtx.fillText('The totem never stops in a dream.', cx, cy + size / 2 + 70);
}

function renderPlantingProgress(theme: any): void {
  const progress = Math.min(1, seedPlantTimer / BALANCE.seedPlantTime);
  const barW = 200;
  const barH = 8;
  const bx = canvasW / 2 - barW / 2;
  const by = canvasH - 80;

  hudCtx.fillStyle = 'rgba(0,0,0,0.6)';
  hudCtx.fillRect(bx - 10, by - 20, barW + 20, barH + 30);

  hudCtx.fillStyle = theme.palette.accent;
  hudCtx.font = '12px Georgia';
  hudCtx.textAlign = 'center';
  hudCtx.fillText('PLANTING SEED...', canvasW / 2, by - 6);

  hudCtx.fillStyle = '#333';
  hudCtx.fillRect(bx, by, barW, barH);
  hudCtx.fillStyle = theme.palette.accent;
  hudCtx.fillRect(bx, by, barW * progress, barH);
}

function renderDirectionalIndicator(layer: any, theme: any): void {
  if (!layer) return;
  const room = layer.rooms[layer.currentRoomIndex];
  if (!room) return;

  // Find the nearest objective: descent-anchor (layers 1-2) or seed-anchor (layer 3)
  const targetType = state.currentLayer === MAX_DEPTH ? 'seed-anchor' : 'descent-anchor';
  let nearestObj: any = null;
  let nearestDist = Infinity;

  // Search current room first, then other rooms
  for (const r of layer.rooms) {
    for (const obj of r.objects) {
      if (obj.collected) continue;
      if (obj.type === targetType) {
        const dx = obj.x - state.player.x;
        const dy = obj.y - state.player.y;
        const dist = dx * dx + dy * dy;
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestObj = obj;
        }
      }
    }
  }

  if (!nearestObj) return;

  const dx = nearestObj.x - state.player.x;
  const dy = nearestObj.y - state.player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // If close enough in layer 3, show seed plant prompt cleanly above the controls pill
  if (dist < 80 && state.currentLayer === MAX_DEPTH && !state.seedPlanted) {
    const pulse = 0.7 + Math.sin(gameLoop.time * 4) * 0.3;
    hudCtx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    hudCtx.font = 'bold 14px monospace';
    hudCtx.textAlign = 'center';
    hudCtx.textBaseline = 'middle';
    hudCtx.fillText('HOLD [E] TO PLANT SEED', canvasW / 2, canvasH - 74);
    return;
  }
  if (dist < 80) return;

  // Otherwise, draw a directional arrow on the edge of the screen
  const angle = Math.atan2(dy, dx);
  const screenCx = canvasW / 2;
  const screenCy = canvasH / 2;
  const radius = Math.min(canvasW, canvasH) * 0.35;
  const arrowX = screenCx + Math.cos(angle) * radius;
  const arrowY = screenCy + Math.sin(angle) * radius;

  // Pulsing opacity
  const pulse = 0.4 + Math.sin(gameLoop.time * 3) * 0.2;

  hudCtx.save();
  hudCtx.translate(arrowX, arrowY);
  hudCtx.rotate(angle);

  // Arrow shape
  hudCtx.fillStyle = `rgba(${hexToRgb(theme.palette.accent)}, ${pulse})`;
  hudCtx.beginPath();
  hudCtx.moveTo(12, 0);
  hudCtx.lineTo(-8, -8);
  hudCtx.lineTo(-4, 0);
  hudCtx.lineTo(-8, 8);
  hudCtx.closePath();
  hudCtx.fill();

  hudCtx.restore();
}

function hexToRgb(hex: string): string {
  // Convert #rrggbb to "r, g, b" for use in rgba()
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// === Debug API (for playtest inspection) ===
(window as any).__oneiric = {
  get state() { return state; },
  get meta() { return meta; },
  get shellPhase() { return shellPhase; },
  get kickState() { return kickState; },
  get totemState() { return totemState; },
  get particles() { return particles; },
  get sceneManager() { return sceneManager; },
  get worldRenderer() { return worldRenderer; },
  get atmosphere() { return atmosphere; },
  get currentLayer() {
    return DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
  },
  get currentRoom() {
    const layer = DreamStack.getCurrentLayer(state.layerStack, state.currentLayer);
    return layer ? layer.rooms[layer.currentRoomIndex] : null;
  },
  startRun,
  enterArchitectHub,
  descendIntoTarget,
  descendDeeper,
  beginKickSequence,
  endRun,
  returnToAtelier,
  forceWin: () => { state.seedPlanted = true; beginKickSequence(); },
  forceLayer: (depth: number) => { state.currentLayer = depth; state.phase = 'in-dream'; },
};

// === Start ===
init();

// --- Seeded RNG: mulberry32 (for deterministic target selection) ---
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
