import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PuzzleRuntime } from '@/runtime/types'
import { useProgressionStore } from '@/app/stores/progressionStore'
import { patternPuzzleDefinition } from '@/mechanics/pattern/definition'
import { pathMazePuzzleDefinition } from '@/mechanics/path-maze/definition'
import { balancePuzzleDefinition } from '@/mechanics/balance/definition'
import { gearPuzzleDefinition } from '@/mechanics/gear/definition'
import { assemblyPuzzleDefinition } from '@/mechanics/assembly/definition'
import PatternRenderer from '@/mechanics/pattern/renderer'
import PathMazeRenderer from '@/mechanics/path-maze/renderer'
import BalanceRenderer from '@/mechanics/balance/renderer'
import GearRenderer from '@/mechanics/gear/renderer'
import AssemblyRenderer from '@/mechanics/assembly/renderer'

const regionMechanicMap: Record<string, any> = {
  'pattern-forest': { definition: patternPuzzleDefinition, renderer: PatternRenderer },
  'maze-mountain': { definition: pathMazePuzzleDefinition, renderer: PathMazeRenderer },
  'balance-bay': { definition: balancePuzzleDefinition, renderer: BalanceRenderer },
  'gear-factory': { definition: gearPuzzleDefinition, renderer: GearRenderer },
  'shape-workshop': { definition: assemblyPuzzleDefinition, renderer: AssemblyRenderer },
}

export default function PuzzleScreen() {
  const navigate = useNavigate()
  const { regionId, levelId } = useParams()
  const [runtime, setRuntime] = useState<PuzzleRuntime<any, any> | null>(null)
  const [won, setWon] = useState(false)
  const { completePuzzle, startPuzzle } = useProgressionStore()

  const mechanicConfig = regionId ? regionMechanicMap[regionId] : null
  // A ref (not React state) guards the one-shot "completed" side effect —
  // state would have to live in the same dependency array that recreates the
  // runtime, which is exactly the loop that caused this bug in the first place.
  const hasCompletedRef = useRef(false)

  useEffect(() => {
    if (!mechanicConfig) {
      navigate('/')
      return
    }

    // Fresh puzzle instance: none of its previous "won" display state applies.
    setWon(false)
    hasCompletedRef.current = false

    const levelKey = `${regionId}/${levelId}`
    startPuzzle(levelKey)

    // Encode level number in the high digits so difficulty is deterministic per level,
    // while low digits vary per play session for puzzle variety within that difficulty.
    const levelNumber = levelId ? parseInt(levelId.replace('level-', ''), 10) || 1 : 1
    const seed = levelNumber * 1_000_000 + (Date.now() % 1_000_000)
    const newRuntime = new PuzzleRuntime(mechanicConfig.definition, seed)

    // Subscribe to status changes
    const unsubscribe = newRuntime.subscribe((rt) => {
      const isWon = rt.status === 'won'
      setWon(isWon)
      if (isWon && !hasCompletedRef.current) {
        hasCompletedRef.current = true
        completePuzzle(levelKey)
        // Show completion message then redirect
        setTimeout(() => {
          navigate(`/region/${regionId}`)
        }, 2000)
      }
    })

    setRuntime(newRuntime)
    return () => unsubscribe()
    // Deliberately scoped to route params only: this effect must create a new
    // puzzle exactly once per (regionId, levelId) pair. Including `won` (or
    // other values this effect itself updates) here recreates the runtime
    // every time the puzzle is won, discarding it and silently replacing it
    // with a brand-new unsolved puzzle — which is what made every region look
    // "already solved" immediately after a win (or after Reset).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId, levelId])

  if (!runtime || !mechanicConfig) {
    return <div className="w-full h-screen flex items-center justify-center bg-gray-100">Loading puzzle...</div>
  }

  const Renderer = mechanicConfig.renderer
  return (
    <div className="w-full h-screen">
      <Renderer runtime={runtime} />
      {won && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-3xl font-bold mb-2">Puzzle Complete!</h2>
            <p className="text-gray-600">Returning to region...</p>
          </div>
        </div>
      )}
    </div>
  )
}
