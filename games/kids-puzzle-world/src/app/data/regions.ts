export type PuzzleRegion = {
  id: string
  name: string
  emoji: string
  tagline: string
  skill: string
  palette: string
}

export const puzzleRegions: PuzzleRegion[] = [
  {
    id: 'pattern-forest',
    name: 'Pattern Forest',
    emoji: '🧩',
    tagline: 'Spot what comes next in a living sequence.',
    skill: 'Pattern recognition',
    palette: 'from-[#2d5016] to-[#6ba547]',
  },
  {
    id: 'maze-mountain',
    name: 'Maze Mountain',
    emoji: '🗺️',
    tagline: 'Plan a route, collect every gem and keep moving.',
    skill: 'Planning and navigation',
    palette: 'from-[#3d3d3d] to-[#5a5a5a]',
  },
  {
    id: 'balance-bay',
    name: 'Balance Bay',
    emoji: '⚖️',
    tagline: 'Use careful choices to find the steady middle.',
    skill: 'Cause and effect',
    palette: 'from-[#87ceeb] to-[#4a90e2]',
  },
  {
    id: 'gear-factory',
    name: 'Gear Factory',
    emoji: '⚙️',
    tagline: 'Build a machine where every moving part connects.',
    skill: 'Systems thinking',
    palette: 'from-[#b87333] to-[#d4af37]',
  },
  {
    id: 'shape-workshop',
    name: 'Shape Workshop',
    emoji: '🔷',
    tagline: 'Turn simple pieces into a complete shape.',
    skill: 'Spatial reasoning',
    palette: 'from-[#ff6b6b] to-[#ffd93d]',
  },
]

export function getPuzzleRegion(regionId: string | undefined) {
  return puzzleRegions.find((region) => region.id === regionId)
}
