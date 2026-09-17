import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadSave, saveSave } from '@/persistence/saveStore'
import { createDefaultSave, LevelProgress } from '@/persistence/saveSchema'

interface ProgressionState {
  unlockedRegionIds: string[]
  levels: Record<string, LevelProgress>
  completedLevels: string[]

  // Actions
  unlockRegion: (regionId: string) => void
  completePuzzle: (levelKey: string) => void
  startPuzzle: (levelKey: string) => void
  isRegionUnlocked: (regionId: string) => boolean
  getLevelProgress: (levelKey: string) => LevelProgress | undefined
  loadProgress: () => void
  saveProgress: () => void
}

const REGION_ORDER = ['pattern-forest', 'maze-mountain', 'balance-bay', 'gear-factory', 'shape-workshop']

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      unlockedRegionIds: ['pattern-forest'], // Start with first region unlocked
      levels: {},
      completedLevels: [],

      unlockRegion: (regionId: string) => {
        set((state) => ({
          unlockedRegionIds: Array.from(new Set([...state.unlockedRegionIds, regionId])),
        }))
        get().saveProgress()
      },

      completePuzzle: (levelKey: string) => {
        set((state) => {
          const newLevels = { ...state.levels }
          if (!newLevels[levelKey]) {
            newLevels[levelKey] = { status: 'completed', lastPlayedAt: new Date().toISOString() }
          } else {
            newLevels[levelKey] = { ...newLevels[levelKey], status: 'completed' }
          }

          // Unlock next region if all puzzles in current region are complete
          const currentRegionIndex = REGION_ORDER.findIndex((rid) => levelKey.startsWith(rid))
          if (currentRegionIndex >= 0 && currentRegionIndex < REGION_ORDER.length - 1) {
            const nextRegion = REGION_ORDER[currentRegionIndex + 1]
            const regionLevels = Object.keys(newLevels).filter((k) => k.startsWith(nextRegion))
            if (regionLevels.length === 0 || regionLevels.every((k) => newLevels[k].status === 'completed')) {
              state.unlockedRegionIds.push(nextRegion)
            }
          }

          return {
            levels: newLevels,
            completedLevels: Object.keys(newLevels).filter((k) => newLevels[k].status === 'completed'),
          }
        })
        get().saveProgress()
      },

      startPuzzle: (levelKey: string) => {
        set((state) => {
          const newLevels = { ...state.levels }
          if (!newLevels[levelKey]) {
            newLevels[levelKey] = { status: 'started', lastPlayedAt: new Date().toISOString() }
          } else {
            newLevels[levelKey] = { ...newLevels[levelKey], status: 'started', lastPlayedAt: new Date().toISOString() }
          }
          return { levels: newLevels }
        })
      },

      isRegionUnlocked: (regionId: string) => {
        return get().unlockedRegionIds.includes(regionId)
      },

      getLevelProgress: (levelKey: string) => {
        return get().levels[levelKey]
      },

      loadProgress: () => {
        const saved = loadSave()
        set({
          unlockedRegionIds: saved.progression.unlockedRegionIds,
          levels: saved.progression.levels,
          completedLevels: Object.keys(saved.progression.levels).filter(
            (k) => saved.progression.levels[k].status === 'completed',
          ),
        })
      },

      saveProgress: () => {
        const state = get()
        const save = loadSave()
        save.progression.unlockedRegionIds = state.unlockedRegionIds
        save.progression.levels = state.levels
        saveSave(save)
      },
    }),
    {
      name: 'progression-store',
      storage: {
        getItem: () => null, // Delegate to saveStore
        setItem: () => {},
        removeItem: () => {},
      },
    },
  ),
)
