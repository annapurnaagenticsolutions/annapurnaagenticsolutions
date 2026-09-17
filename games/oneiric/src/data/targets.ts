// ONEIRIC — Dream targets
// Each target is a mind you infiltrate. Their idea is what you plant.
// Their memory objects populate the dream rooms — environmental storytelling.

import type { DreamTarget, MemoryObjectKind } from '../types';

export const TARGETS: DreamTarget[] = [
  {
    name: 'EVELYN HART',
    idea: 'Let go',
    ideaIcon: 'rose',
    mindTheme: 1,
    securityLevel: 'Low',
    contractBonus: 25,
    memoryObjects: ['chair', 'window', 'photo', 'mirror'] as MemoryObjectKind[],
    portraitColor: '#e8a0a8',
    bio: 'A mother who cannot release what she has lost.',
    memoryVignettes: {
      chair: 'An empty rocking chair. A lullaby lingers in the quiet air.',
      window: 'Rain on the nursery glass. She stood here waiting until sunrise.',
      photo: 'A faded silver frame. A summer afternoon that never ended.',
      mirror: 'She searches the glass for a face that is no longer there.',
      door: 'A nursery door left ajar. She cannot bear to close it.',
      desk: 'Letters addressed to a future that never arrived.',
      clock: 'The second hand frozen at 3:17 AM.',
      bars: 'A crib railing painted white, worn down by anxious hands.',
      toy: 'A small wooden spinning top. It never falls in her memory.',
    },
  },
  {
    name: 'MARCUS COLE',
    idea: 'Trust again',
    ideaIcon: 'key',
    mindTheme: 2,
    securityLevel: 'Moderate',
    contractBonus: 40,
    memoryObjects: ['door', 'desk', 'clock', 'bars'] as MemoryObjectKind[],
    portraitColor: '#a0c0e8',
    bio: 'A man who locked every door and swallowed the key.',
    memoryVignettes: {
      door: 'A heavy brass vault. He remembers the code, but forgets what is inside.',
      desk: 'A mountain of ledgers documenting every betrayal.',
      clock: 'A metronome counting down the seconds until someone lies.',
      bars: 'Security gates he built himself. He is the prisoner and the warden.',
      chair: 'A lone high-backed chair facing a closed door.',
      window: 'Frosted bulletproof glass looking down at a city he fears.',
      mirror: 'A reflection of a man who trusts no one, especially himself.',
      photo: 'A photograph with every other face carefully scratched out.',
      toy: 'A puzzle box that has no solution.',
    },
  },
  {
    name: 'THE ARCHITECT',
    idea: 'Stop building',
    ideaIcon: 'feather',
    mindTheme: 2,
    securityLevel: 'Extreme',
    contractBonus: 75,
    memoryObjects: ['desk', 'clock', 'mirror', 'toy'] as MemoryObjectKind[],
    portraitColor: '#c0b0e0',
    bio: 'She constructed a fortress from guilt and cannot leave.',
    memoryVignettes: {
      desk: 'Blueprints of endless impossible corridors that loop back to grief.',
      clock: 'A pendulum that swings backward through years she wishes to undo.',
      mirror: 'A looking glass that reflects the architecture, but not her.',
      toy: 'A brass top spinning in perpetual equilibrium on drafting paper.',
      chair: 'The chair at the drafting table where she fell asleep decades ago.',
      door: 'A doorway that opens only into another identical doorway.',
      window: 'A window framing a city that folds upward into the sky.',
      bars: 'Geometric lattice framing an inescapable geometric labyrinth.',
      photo: 'A snapshot of the first house she built before the guilt.',
    },
  },
  {
    name: 'LILY CHEN',
    idea: 'Forgive yourself',
    ideaIcon: 'flame',
    mindTheme: 1,
    securityLevel: 'Low',
    contractBonus: 30,
    memoryObjects: ['chair', 'photo', 'toy', 'window'] as MemoryObjectKind[],
    portraitColor: '#f0b070',
    bio: 'A child who grew up carrying a fire she never started.',
    memoryVignettes: {
      chair: 'A small wooden stool in the corner of a burned room.',
      photo: 'A photograph singed at the edges. A warm family dinner.',
      toy: 'A soot-covered toy carousel that still faintly turns.',
      window: 'Looking out at the ember glow of a past she cannot douse.',
      door: 'A heavy oak door warm to the touch.',
      desk: 'A school notebook filled with apologies never delivered.',
      clock: 'A melted clock on a mantelpiece.',
      bars: 'The fire escape ladder where she looked back.',
      mirror: 'Smoke swirls in the glass, obscuring who she used to be.',
    },
  },
  {
    name: 'OLD MAN RIVER',
    idea: 'Remember me',
    ideaIcon: 'letter',
    mindTheme: 1,
    securityLevel: 'Moderate',
    contractBonus: 45,
    memoryObjects: ['chair', 'clock', 'photo', 'door'] as MemoryObjectKind[],
    portraitColor: '#d0c8a0',
    bio: 'A father whose children forgot his name. He is forgetting too.',
    memoryVignettes: {
      chair: 'A worn leather armchair that still holds the shape of his father.',
      clock: 'A grandfather clock chiming an hour that has already passed.',
      photo: 'Faces in a family album whose names slowly dissolve from his mind.',
      door: 'The front door of a childhood home that was demolished 40 years ago.',
      window: 'Watching the porch light, waiting for children who moved away.',
      desk: 'Unsent postcards to addresses that no longer exist.',
      bars: 'The garden fence he painted every summer.',
      mirror: 'An old stranger looks back from the glass.',
      toy: 'A carved wooden bird his grandfather gave him.',
    },
  },
  {
    name: 'THE STRANGER',
    idea: 'Wake up',
    ideaIcon: 'feather',
    mindTheme: 3,
    securityLevel: 'Extreme',
    contractBonus: 80,
    memoryObjects: ['mirror', 'bars', 'window', 'clock'] as MemoryObjectKind[],
    portraitColor: '#a0a0a0',
    bio: 'No one knows his name. He may not be dreaming at all.',
    memoryVignettes: {
      mirror: 'The glass reflects your own face, not his.',
      bars: 'Iron bars dissolving into digital dust and static.',
      window: 'Beyond the window is the source code of this reality.',
      clock: 'A digital counter ticking down to zero.',
      chair: 'An empty chair in an endless dark void.',
      door: 'An exit sign glowing above a door that leads to your awake self.',
      desk: 'A terminal screen displaying your conversation history.',
      photo: 'A photo of the screen you are currently looking at.',
      toy: 'A spinning top that refuses to obey any law of physics.',
    },
  },
  {
    name: 'DR. AMARI',
    idea: 'Doubt the cure',
    ideaIcon: 'key',
    mindTheme: 2,
    securityLevel: 'Heavy',
    contractBonus: 60,
    memoryObjects: ['desk', 'bars', 'clock', 'mirror'] as MemoryObjectKind[],
    portraitColor: '#90d0c0',
    bio: 'A psychiatrist who prescribed away her own grief.',
    memoryVignettes: {
      desk: 'Prescription pads with every diagnosis redacted in black ink.',
      bars: 'The quiet observation ward where she listened to other people’s tears.',
      clock: 'Fifty-minute therapy hour timers running in unison.',
      mirror: 'A clinical gaze that diagnoses herself as cured, and numb.',
      chair: 'The leather couch where patients laid bare their souls.',
      door: 'The clinic door with a sign: Do Not Disturb.',
      window: 'Rain streaming down glass like unwept tears.',
      photo: 'Her medical degree diploma, cold and framed in black steel.',
      toy: 'A Newton’s cradle clicking incessantly in the stillness.',
    },
  },
  {
    name: 'JUNE WARD',
    idea: 'Burn the letter',
    ideaIcon: 'letter',
    mindTheme: 3,
    securityLevel: 'Moderate',
    contractBonus: 50,
    memoryObjects: ['photo', 'mirror', 'window', 'toy'] as MemoryObjectKind[],
    portraitColor: '#e890b0',
    bio: 'An actress who reads the same love letter every night.',
    memoryVignettes: {
      photo: 'A stage portrait from her opening night forty years ago.',
      mirror: 'A dressing room vanity mirror lined with warm glowing bulbs.',
      window: 'Looking down from a penthouse suite onto a stage door.',
      toy: 'A miniature theater model with paper actors frozen mid-sentence.',
      chair: 'A velvet theater seat labeled Row A, Seat 1.',
      door: 'The backstage door she walked out of and never returned to.',
      desk: 'A stack of handwritten love letters tied with faded silk ribbon.',
      clock: 'The curtain-call bell ringing for an audience that went home.',
      bars: 'The spotlight rig hanging above an empty stage.',
    },
  },
];

/**
 * Select a random target using the provided RNG function.
 * Deterministic when given a seeded RNG.
 */
export function getRandomTarget(rng: () => number): DreamTarget {
  const idx = Math.floor(rng() * TARGETS.length) % TARGETS.length;
  return TARGETS[idx];
}

/** Select N distinct target options for the gateway antechamber doors. */
export function getContractSelection(rng: () => number, count = 3): DreamTarget[] {
  const shuffled = [...TARGETS].sort(() => rng() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
