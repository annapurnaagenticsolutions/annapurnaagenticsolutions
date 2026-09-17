import type { TotemConfig } from '../types';

// ONEIRIC — Totem configurations
// The totem is the player's reality-check tool. Each has different kick-zone width and flavor.

export const TOTEMS: TotemConfig[] = [
  {
    id: 'top',
    name: 'The Spinning Top',
    type: 'top',
    spinDuration: 2.0,
    kickZoneWidth: 0.25,
    description: 'Spins forever in a dream. Falls in reality. The classic.',
    color: '#e8c89a',
  },
  {
    id: 'coin',
    name: 'The Weighted Coin',
    type: 'coin',
    spinDuration: 1.5,
    kickZoneWidth: 0.22,
    description: 'Always lands heads in reality. In a dream, it keeps flipping.',
    color: '#c0c0c0',
  },
  {
    id: 'ring',
    name: 'The Warm Ring',
    type: 'ring',
    spinDuration: 2.5,
    kickZoneWidth: 0.30,
    description: 'Warm to the touch in reality. Cold in dreams. Easier kicks.',
    color: '#d4a574',
  },
];

export const DEFAULT_TOTEM = TOTEMS[0];

export function getTotemById(id: string): TotemConfig {
  return TOTEMS.find(t => t.id === id) ?? DEFAULT_TOTEM;
}
