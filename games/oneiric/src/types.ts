// ONEIRIC — Shared type contract
// This file is the interface contract between all modules.
// Subagents code against these types. Do not modify without updating all dependents.

// === Core game phases ===
export type GamePhase =
  | 'hub'           // the atelier/menu between runs
  | 'descending'    // transition animation between layers
  | 'in-dream'      // active gameplay in a dream layer
  | 'kicking'       // the synchronized kick mini-game
  | 'limbo'         // failure recovery state
  | 'won'           // run succeeded
  | 'lost';         // run failed (limbo timeout)

// === Game state (the single source of truth) ===
export interface GameState {
  phase: GamePhase;
  currentLayer: number;          // 0 = hub, 1-3 = dream layers
  layerStack: DreamLayer[];      // active layers in the stack
  stability: number;             // 0-100
  fragments: number;             // meta currency earned this run
  totalFragments: number;        // meta currency total (persisted)
  seedPlanted: boolean;          // has the seed been planted at deepest layer?
  kickProgress: number;          // 0 to layerStack.length
  totem: TotemConfig;
  wakeTimer: number;             // real-time seconds before forced wake
  disturbance: number;           // affects projection spawn rate
  runStartTime: number;          // timestamp
  isHubDream: boolean;           // 15% chance — totem reveals this
  player: Player;
  echoLures: EchoLure[];
  activeResonance: { text: string; timer: number; name: string } | null;
  limboTimer: number;            // seconds remaining in limbo
  limboFragmentFound: boolean;
  target: DreamTarget | null;    // whose mind you're entering this run
  hubDoors?: HubDoor[];          // interactive target doors in the 3D antechamber
  activeHubDoor?: HubDoor | null;
}

// === Hub Gateway Door ===
export interface HubDoor {
  id: string;
  x: number;                     // world pixel coords
  y: number;
  target: DreamTarget;
  angle: number;                 // door rotation
  label: string;
}

// === Echo Lure ===
export interface EchoLure {
  id: number;
  x: number;
  y: number;
  timer: number;
  maxTimer: number;
  radius: number;
}

// === Dream layer ===
export interface DreamLayer {
  depth: number;                 // 1, 2, 3
  theme: LayerTheme;
  timeScale: number;             // 1/depth
  rooms: Room[];
  currentRoomIndex: number;
  instabilityRate: number;       // stability drain per second (base)
  projectionSpawnRate: number;   // base spawns per second
  projections: Projection[];
  seedPlantedHere: boolean;
  descentAnchor: { x: number; y: number } | null;  // where to descend deeper
  seedAnchor: { x: number; y: number } | null;     // where to plant seed (deepest only)
}

export interface LayerTheme {
  name: string;                  // "Surface", "Current", "Abyss"
  depth: number;
  palette: {
    bg: string;
    fg: string;
    accent: string;
    fog: string;
    wall: string;
    floor: string;
  };
  particleType: 'drift' | 'rain' | 'ash' | 'void';
  ambientHz: number;             // audio drone frequency
  visualRule: 'normal' | 'mirror' | 'regenerate';
  description: string;
  architectureStyle: 'classical' | 'glass' | 'fractured';  // geometry vocabulary
}

// === Narrative: dream target ===
export interface DreamTarget {
  name: string;                  // e.g. "EVELYN HART"
  idea: string;                  // what you're planting, e.g. "Let go"
  ideaIcon: 'rose' | 'key' | 'letter' | 'feather' | 'flame';  // visual on seed plant + win
  mindTheme: number;             // which palette set (1-3)
  memoryObjects: MemoryObjectKind[];  // which objects spawn in their mind
  portraitColor: string;         // accent color for descent/win screen
  bio: string;                   // one-line description shown on descent
  securityLevel?: 'Low' | 'Moderate' | 'Heavy' | 'Extreme';
  contractBonus?: number;
  memoryVignettes?: Record<MemoryObjectKind, string>;
}

// === Room / procedural gen ===
export interface Room {
  id: number;
  bounds: { x: number; y: number; w: number; h: number };
  gridW: number;
  gridH: number;
  tiles: TileType[];             // flat array, index = y * gridW + x
  doors: Door[];
  objects: DreamObject[];
  cleared: boolean;
  visited: boolean;
  hasBeenOffscreen: boolean;     // for 'regenerate' visual rule
}

export type TileType = 0 | 1 | 2 | 3;  // 0=floor, 1=wall, 2=door, 3=void

export interface Door {
  x: number; y: number;          // tile coords
  side: 'north' | 'south' | 'east' | 'west';
  connectsToRoom: number;        // room index
}

export interface DreamObject {
  id: number;
  type: 'fragment' | 'disturbance' | 'descent-anchor' | 'seed-anchor' | 'memory';
  x: number; y: number;          // pixel coords
  collected: boolean;
  radius: number;
  memoryKind?: MemoryObjectKind; // only for type: 'memory'
  resonated?: boolean;           // has the memory resonance been activated?
}

// Environmental storytelling objects — placed in rooms to reflect the target's mind
export type MemoryObjectKind =
  | 'chair'      // Layer 1 — domestic
  | 'door'       // Layer 1 — domestic
  | 'window'     // Layer 1 — domestic
  | 'desk'       // Layer 2 — institutional
  | 'clock'      // Layer 2 — institutional
  | 'bars'       // Layer 2 — institutional
  | 'mirror'     // Layer 3 — abstract/emotional
  | 'photo'      // Layer 3 — abstract/emotional
  | 'toy';       // Layer 3 — abstract/emotional (spinning top — mirrors player's totem)

// === Entities ===
export interface Player {
  x: number; y: number;          // pixel coords
  vx: number; vy: number;
  hp: number;
  maxHp: number;
  lightRadius: number;           // shrinks with stability (pixels)
  speed: number;                 // pixels per second
  hasSeed: boolean;
  facing: number;                // angle in radians
  invulnTimer: number;           // i-frames after hit
  surgeTimer: number;            // active duration of lucid surge phase
  surgeCooldown: number;         // cooldown timer before next surge
  isSurging: boolean;            // active phase dash
  echoesLeft: number;            // throwable sonic lures
}

export interface Projection {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  state: 'patrol' | 'alert' | 'chase' | 'distracted';
  alertTimer: number;
  lastKnownPlayerX: number;
  lastKnownPlayerY: number;
  losLostTimer: number;          // time since LOS lost
  speed: number;
  damage: number;
  radius: number;
  patrolDir: number;             // angle for patrol movement
  patrolTimer: number;
  distractionTarget: { x: number; y: number } | null;
  glitchTimer?: number;          // erratic glitch movement in Abyss
}

// === Totem ===
export interface TotemConfig {
  id: string;
  name: string;
  type: 'top' | 'coin' | 'ring';
  spinDuration: number;          // seconds it spins in reality (dream = infinite)
  kickZoneWidth: number;         // 0-1, wider = easier kicks
  description: string;
  color: string;
}

// === Kick sequence ===
export interface KickState {
  active: boolean;
  currentKick: number;           // which kick in the chain (0-indexed)
  totalKicks: number;
  markerPos: number;             // 0-1 position on the bar
  markerDir: number;             // 1 or -1
  markerSpeed: number;           // computed from timeScale
  zoneStart: number;
  zoneEnd: number;
  attempts: number;
  successes: number;
  flashTimer: number;            // visual feedback on hit/miss
  flashType: 'hit' | 'miss' | null;
}

// === Meta progression ===
export interface MetaState {
  totalFragments: number;
  upgrades: {
    totemSpinSpeed: number;      // levels (0-4)
    startingStability: number;   // levels (0-4)
    kickZoneBonus: number;       // levels (0-4)
    lucidSurgeCooldown: number;  // levels (0-4)
    echoCapacity: number;        // levels (0-4)
    memoryCatalyst: number;      // levels (0-4)
  };
  unlockedTotems: string[];
  activeTotemId: string;
  runsCompleted: number;
  bestDepth: number;
  bestFragments: number;
  dailySeed: string;
  lastPlayedDate: string;
}

// === Input state ===
export interface InputState {
  keys: Set<string>;
  justPressed: Set<string>;
  mouse: { x: number; y: number; down: boolean };
}

// === Particles ===
export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'drift' | 'rain' | 'ash' | 'spark' | 'fragment';
}

// === Camera ===
export interface Camera {
  x: number; y: number;
  targetX: number; targetY: number;
  width: number; height: number;
  shake: number;
  getOffset(): { x: number; y: number };
}

// === Audio config ===
export interface AudioConfig {
  masterVolume: number;
  muted: boolean;
}

// === Rendering helpers ===
export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  camera: Camera;
  dt: number;
  time: number;
}
