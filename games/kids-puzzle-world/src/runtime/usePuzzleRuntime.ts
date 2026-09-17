import { useSyncExternalStore, useRef } from 'react'
import { PuzzleRuntime } from './types'

export function usePuzzleRuntime<S, A>(runtime: PuzzleRuntime<S, A>) {
  // Keep a stable reference to the subscribe function
  const subscribeRef = useRef((onStoreChange: () => void) => {
    return runtime.subscribe(() => onStoreChange())
  })

  // Cache snapshot to ensure same object reference for same state
  const snapshotRef = useRef<{ state: S; status: string }>()

  const getSnapshot = () => {
    const state = runtime.currentState
    const status = runtime.status

    // Only create new object if state or status changed
    if (!snapshotRef.current || snapshotRef.current.state !== state || snapshotRef.current.status !== status) {
      snapshotRef.current = { state, status }
    }

    return snapshotRef.current
  }

  return useSyncExternalStore(subscribeRef.current, getSnapshot)
}
