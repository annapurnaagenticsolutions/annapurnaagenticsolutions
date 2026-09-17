import { AnySaveData, SaveDataV1, createDefaultSave, SAVE_SCHEMA_VERSION } from './saveSchema'

const SAVE_KEY = 'kpw:save'
const CORRUPTED_KEY_PREFIX = 'kpw:save:corrupted:'

function backupCorrupted(rawData: string): void {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupKey = `${CORRUPTED_KEY_PREFIX}${timestamp}`
    localStorage.setItem(backupKey, rawData)

    // Keep only the most recent backup
    const allKeys = Object.keys(localStorage)
    const corruptedKeys = allKeys.filter((k) => k.startsWith(CORRUPTED_KEY_PREFIX))
    if (corruptedKeys.length > 1) {
      const toDelete = corruptedKeys.sort().slice(0, -1)
      toDelete.forEach((k) => localStorage.removeItem(k))
    }
  } catch {
    // Silently fail if backup can't be written
  }
}

export function loadSave(): AnySaveData {
  try {
    const stored = localStorage.getItem(SAVE_KEY)
    if (!stored) {
      return createDefaultSave()
    }

    const parsed = JSON.parse(stored) as unknown

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Parsed save is not an object')
    }

    const data = parsed as Record<string, unknown>
    const version = typeof data.schemaVersion === 'number' ? data.schemaVersion : null

    if (!version || version < 1 || version > SAVE_SCHEMA_VERSION) {
      throw new Error(`Invalid schema version: ${version}`)
    }

    // For now, only V1 exists, so no migration needed
    if (version === 1) {
      return data as unknown as SaveDataV1
    }

    throw new Error(`Unknown schema version: ${version}`)
  } catch (error) {
    console.warn('Failed to load save, corrupted or invalid:', error)
    backupCorrupted(localStorage.getItem(SAVE_KEY) || '')
    localStorage.removeItem(SAVE_KEY)
    return createDefaultSave()
  }
}

let saveDebounceTimer: ReturnType<typeof setTimeout> | null = null

export function saveSave(data: AnySaveData): void {
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer)
  }

  saveDebounceTimer = setTimeout(() => {
    try {
      const now = new Date().toISOString()
      const toSave = {
        ...data,
        updatedAt: now,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(toSave))
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded')
      } else if (error instanceof Error && error.message.includes('private browsing')) {
        // Silently fail in private browsing mode
      } else {
        console.error('Failed to save:', error)
      }
    }
  }, 500)
}
