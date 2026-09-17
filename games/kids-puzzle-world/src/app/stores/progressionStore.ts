import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { loadSave, saveSave } from '@/persistence/saveStore'
import { LevelProgress } from '@/persistence/saveSchema'

interface ProgressionState {
  unlockedRegionIds: string[]
  levels: Record<string, LevelProgress>
  completedLevels: string[]

  unlockRegion: (regionId: string) => void
  completePuzzle: (levelKey: string) => void
  startPuzzle: (levelKey: string) => void
  isRegionUnlocked: (regionId: string) => boolean
  getLevelProgress: (levelKey: string) => LevelProgress | undefined
  loadProgress: () => void
  saveProgress: () => void
}

const REGION_ORDER = ['pattern-forest', 'maze-mountain', 'balance-bay', 'gear-factory', 'shape-workshop']
const LEVELS_PER_REGION = 5

export const useProgressionStore = create<ProgressionState>()(
  persist(
    (set, get) => ({
      unlockedRegionIds: ['pattern-forest'],
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
          newLevels[levelKey] = {
            ...(newLevels[levelKey] || {}),
            status: 'completed',
            lastPlayedAt: new Date().toISOString(),
          }

          const currentRegionId = REGION_ORDER.find((regionId) => levelKey.startsWith(`${regionId}/`))
          const currentRegionIndex = currentRegionId ? REGION_ORDER.indexOf(currentRegionId) : -1
          const currentRegionComplete = currentRegionId
            ? Array.from({ length: LEVELS_PER_REGION }, (_, index) => `${currentRegionId}/level-${index + 1}`).every(
                (key) => newLevels[key]?.status === 'completed',
              )
            : false

          const unlockedRegionIds = [...state.unlockedRegionIds]
          if (currentRegionComplete && currentRegionIndex >= 0 && currentRegionIndex < REGION_ORDER.length - 1) {
            const nextRegion = REGION_ORDER[currentRegionIndex + 1]
            if (!unlockedRegionIds.includes(nextRegion)) unlockedRegionIds.push(nextRegion)
          }

          return {
            unlockedRegionIds,
            levels: newLevels,
            completedLevels: Object.keys(newLevels).filter((key) => newLevels[key].status === 'completed'),
          }
        })
        get().saveProgress()
      },

      startPuzzle: (levelKey: string) => {
        set((state) => {
          const newLevels = { ...state.levels }
          newLevels[levelKey] = {
            ...(newLevels[levelKey] || {}),
            status: 'started',
            lastPlayedAt: new Date().toISOString(),
          }
          return { levels: newLevels }
        })
      },

      isRegionUnlocked: (regionId: string) => get().unlockedRegionIds.includes(regionId),

      getLevelProgress: (levelKey: string) => get().levels[levelKey],

      loadProgress: () => {
        const saved = loadSave()
        set({
          unlockedRegionIds: saved.progression.unlockedRegionIds,
          levels: saved.progression.levels,
          completedLevels: Object.keys(saved.progression.levels).filter(
            (key) => saved.progression.levels[key].status === 'completed',
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
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  ),
)
