import type { LayerTheme } from '../types';

// ONEIRIC — Dream layer themes
// Each layer has a distinct palette, particle type, ambient frequency, and visual rule.

export const LAYER_THEMES: LayerTheme[] = [
  {
    name: 'Surface',
    depth: 1,
    palette: {
      // Warm amber dream — floor lighter, walls darker, background deepest.
      bg: '#2a1e14',
      fg: '#fff5e0',
      accent: '#ffd8a0',
      fog: 'rgba(240, 200, 150, 0.10)',
      wall: '#3a2a1a',
      floor: '#5a4632',
    },
    particleType: 'drift',
    ambientHz: 60,
    visualRule: 'normal',
    description: 'The shallow dream. Almost real. Warm light drifts.',
    architectureStyle: 'classical',
  },
  {
    name: 'Current',
    depth: 2,
    palette: {
      // Cold teal dream — dark void, bright accents.
      bg: '#0f2832',
      fg: '#c0f8ff',
      accent: '#a0e8ff',
      fog: 'rgba(140, 200, 230, 0.12)',
      wall: '#1a4a5a',
      floor: '#2a5a6a',
    },
    particleType: 'rain',
    ambientHz: 110,
    visualRule: 'mirror',
    description: 'The flowing dream. Rain falls upward. Rooms mirror themselves.',
    architectureStyle: 'glass',
  },
  {
    name: 'Abyss',
    depth: 3,
    palette: {
      // Deep crimson dream — dark void, bright crimson accents.
      bg: '#2a1010',
      fg: '#ff8080',
      accent: '#ff6060',
      fog: 'rgba(220, 80, 80, 0.14)',
      wall: '#4a1c1c',
      floor: '#5a2828',
    },
    particleType: 'ash',
    ambientHz: 220,
    visualRule: 'regenerate',
    description: 'The deep dream. Ash falls. Rooms shift when you look away.',
    architectureStyle: 'fractured',
  },
];

export const LIMBO_THEME: LayerTheme = {
  name: 'Limbo',
  depth: 99,
  palette: {
    bg: '#000000',
    fg: '#ffffff',
    accent: '#888888',
    fog: 'rgba(255, 255, 255, 0.02)',
    wall: '#222222',
    floor: '#111111',
  },
  particleType: 'void',
  ambientHz: 0,
  visualRule: 'normal',
  description: 'Unstructured mind. No totem. Find the fragment or fade.',
  architectureStyle: 'fractured',
};

export function getThemeForDepth(depth: number): LayerTheme {
  if (depth >= 99) return LIMBO_THEME;
  return LAYER_THEMES[Math.min(depth - 1, LAYER_THEMES.length - 1)] ?? LAYER_THEMES[0];
}
