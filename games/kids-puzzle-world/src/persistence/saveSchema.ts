export const SAVE_SCHEMA_VERSION = 1

export interface SaveDataV1 {
  schemaVersion: 1
  createdAt: string
  updatedAt: string
  preferences: {
    audioMuted: boolean
    reducedMotion: boolean
    highContrast: boolean
    locale: string
  }
  progression: {
    unlockedRegionIds: string[]
    levels: Record<string, LevelProgress>
  }
  devFlags?: {
    unlockAll?: boolean
  }
}

export interface LevelProgress {
  status: 'unseen' | 'started' | 'completed'
  bestMetric?: number
  hintTiersUsedMax?: number
  lastPlayedAt: string
}

export type AnySaveData = SaveDataV1

export function createDefaultSave(): SaveDataV1 {
  const now = new Date().toISOString()
  return {
    schemaVersion: 1,
    createdAt: now,
    updatedAt: now,
    preferences: {
      audioMuted: false,
      reducedMotion: false,
      highContrast: false,
      locale: 'en',
    },
    progression: {
      unlockedRegionIds: ['pattern-forest'],
      levels: {},
    },
  }
}
