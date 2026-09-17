// ONEIRIC — Balance constants
// Centralized tuning. Changing these changes the game feel without touching algorithms.

export const BALANCE = {
  // Player
  playerSpeed: 180,            // pixels per second
  playerMaxHp: 3,
  playerLightRadius: 160,      // base light radius (pixels)
  playerInvulnTime: 1.0,       // seconds of i-frames after hit

  // Lucid Surge (Phase Dash - Space)
  lucidSurgeSpeedMultiplier: 2.6,
  lucidSurgeDuration: 0.32,    // seconds of phase surge
  lucidSurgeBaseCooldown: 3.2, // seconds between surges

  // Echo Lure (Sonic Distraction - F)
  echoLureBaseCapacity: 2,     // base charges per run
  echoLureDuration: 4.5,       // seconds lure stays active
  echoLureRadius: 180,         // pixel attraction radius

  // Memory Resonance (Interactive Storytelling - E)
  memoryResonanceRadius: 40,   // pixel activation radius
  memoryResonanceStabilityBonus: 15, // stability restored on first resonance

  // Stability
  startingStability: 100,
  stabilityDrainBase: 0.8,     // per second, layer 1 — calm, gives time to explore
  stabilityDrainPerDepth: 0.7, // additional drain per depth — ramps up urgency
  stabilityDrainPerProjection: 0.15, // additional drain per alive projection
  stabilityHitPenalty: 12,     // per projection hit
  stabilityKickMissPenalty: 5, // per missed kick

  // Wake timer
  wakeTimerSeconds: 180,       // 3 minutes real time per run

  // Time dilation
  timeScaleBase: 1.0,          // layer 1
  timeScalePerDepth: 0.5,      // each deeper layer multiplies by this factor

  // Procedural generation
  roomGridW: 24,
  roomGridH: 16,
  tileSize: 32,
  roomsPerLayer: [4, 5, 6],    // per depth 1, 2, 3
  fragmentCountPerRoom: [2, 3, 4], // per depth
  disturbanceObjectChance: 0.4,

  // Projections
  projectionBaseSpawnInterval: 5.0,  // seconds between spawns at disturbance 0
  projectionSpeed: 90,
  projectionDamage: 1,
  projectionAlertRange: 192,   // pixels (6 tiles)
  projectionAlertTime: 1.2,    // seconds before chase
  projectionChaseSpeed: 140,
  projectionLosLostTime: 3.0,  // seconds before returning to patrol
  maxProjectionsPerLayer: 12,

  // Disturbance
  disturbancePerRoomEnter: 0.5,
  disturbancePerObjectDestroyed: 1.0,
  disturbancePerSecondInRoom: 0.1,
  disturbanceMaxPerRoom: 5.0,
  disturbanceSpawnMultiplier: 0.15,

  // Totem
  totemCheckDuration: 1.5,     // seconds the close-up shows
  hubDreamChance: 0.15,        // 15% chance the hub is a dream

  // Kick sequence
  kickBaseZoneWidth: 0.25,
  kickZoneShrinkPerKick: 0.10,
  kickBaseMarkerSpeed: 0.7,
  kickSpeedPerLayer: 0.2,

  // Limbo
  limboTimeSeconds: 30,
  limboFragmentKeepRatio: 0.1, // keep 10% of fragments if you escape limbo
  limboFragmentCount: 1,       // fragments to find in limbo

  // Meta progression
  fragmentPerDepth: 10,
  fragmentPerSeedPlanted: 25,
  fragmentPerKickSuccess: 5,
  upgradeCosts: {
    totemSpinSpeed: [20, 40, 80, 160],
    startingStability: [15, 30, 60, 120],
    kickZoneBonus: [25, 50, 100, 200],
    lucidSurgeCooldown: [30, 60, 120, 240],
    echoCapacity: [25, 50, 100, 200],
    memoryCatalyst: [20, 45, 90, 180],
  },
  upgradeEffects: {
    totemSpinSpeedPerLevel: 0.2,   // seconds faster spin reveal
    startingStabilityPerLevel: 10,  // +10 stability per level
    kickZoneBonusPerLevel: 0.02,    // +2% kick zone per level
    lucidSurgeCooldownReductionPerLevel: 0.4, // -0.4s cooldown per level
    echoCapacityPerLevel: 1,       // +1 max echo per level
    memoryCatalystBonusPerLevel: 5,// +5 extra stability per memory resonance
  },

  // Fragments
  fragmentPickupRadius: 24,

  // Seed planting
  seedPlantTime: 1.5,          // seconds holding to plant

  // Descent
  descentTime: 3.0,            // transition animation seconds — the signature moment

  // Camera
  cameraLerp: 0.12,
  cameraShakeOnHit: 8,
  cameraShakeOnKick: 4,
  cameraShakeDecay: 0.85,

  // Rendering
  fogParticleCount: 40,
  reducedMotionThreshold: 0.5, // if prefers-reduced-motion, halve particles
} as const;

export type BalanceKey = keyof typeof BALANCE;
