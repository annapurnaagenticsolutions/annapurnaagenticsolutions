import { useState } from 'react'
import { PuzzleRuntime } from '@/runtime/types'
import { PathMazeAction } from './definition'
import { PathMazeState, isGateOpen } from './state'
import { usePuzzleRuntime } from '@/runtime/usePuzzleRuntime'

interface PathMazeRendererProps {
  runtime: PuzzleRuntime<PathMazeState, PathMazeAction>
}

export default function PathMazeRenderer({ runtime }: PathMazeRendererProps) {
  const { state, status } = usePuzzleRuntime(runtime)
  const [hintLevel, setHintLevel] = useState(0)

  const handleRequestHint = () => {
    const nextLevel = Math.min(hintLevel + 1, 3)
    setHintLevel(nextLevel)
    runtime.requestHint(nextLevel as any)
  }

  const hint = hintLevel > 0 ? (runtime.getHintState(hintLevel as any) as { hint: string }) : null

  const cellSize = 30
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const keyMap: Record<string, [number, number]> = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      a: [-1, 0],
      s: [0, 1],
      d: [1, 0],
    }
    const move = keyMap[e.key]
    if (move) {
      e.preventDefault()
      runtime.dispatch({ type: 'move', dx: move[0], dy: move[1] })
    }
  }

  // Goal and Key used to both render as near-identical yellow/gold, which is
  // exactly what made picking up a key look and feel like finishing the
  // level. Every special tile now has BOTH a distinct color AND its own
  // icon, so no two mechanics can be confused for each other by color alone.
  const gemsLeft = state.totalGems - state.gemsCollected.size
  const exitLocked = gemsLeft > 0
  const movesLeft = state.maxMoves - state.movesUsed
  const outOfMoves = movesLeft <= 0 && status !== 'won'

  const getCellColor = (x: number, y: number): string => {
    if (x === state.player.x && y === state.player.y) return '#6ba547' // Player
    // Exit is visibly dulled while it's still locked by uncollected gems.
    if (x === state.goalPosition.x && y === state.goalPosition.y) return exitLocked ? '#8a6650' : '#e8720c'
    const cell = state.grid[y]?.[x]
    if (cell?.type === 'wall') return '#3d3d3d'
    if (cell?.type === 'switch') {
      const isActive = cell.switchId ? state.activeSwitches.has(cell.switchId) : false
      return isActive ? '#2ecc71' : '#ff6b6b'
    }
    if (cell?.type === 'gate') {
      const gate = state.gates.find((g) => g.id === cell.gateId)
      const open = gate ? isGateOpen(gate, state.activeSwitches) : false
      const isAndGate = (gate?.switchIds.length ?? 0) > 1
      if (open) return '#87ceeb'
      return isAndGate ? '#9b59b6' : '#4a90e2'
    }
    if (cell?.type === 'key') {
      const collected = cell.keyId ? state.player.inventory.has(cell.keyId) : false
      return collected ? '#f0f0f0' : '#16a085' // Key — teal, unmistakably not the goal's orange
    }
    if (cell?.type === 'door') {
      const door = state.doors.find((d) => d.id === cell.doorId)
      const unlocked = door ? state.player.inventory.has(door.requiredKeyId) : false
      return unlocked ? '#87ceeb' : '#7b4a1e'
    }
    if (cell?.type === 'gem') {
      const collected = cell.gemId ? state.gemsCollected.has(cell.gemId) : false
      return collected ? '#f0f0f0' : '#e056fd'
    }
    return '#f0f0f0'
  }

  // Icon shown on top of the tile color — belt-and-suspenders against any
  // color confusion, and much more legible for kids than color alone.
  const getCellIcon = (x: number, y: number): string | null => {
    if (x === state.player.x && y === state.player.y) return null
    if (x === state.goalPosition.x && y === state.goalPosition.y) return exitLocked ? '🔒' : '🏁'
    const cell = state.grid[y]?.[x]
    if (cell?.type === 'gem') {
      const collected = cell.gemId ? state.gemsCollected.has(cell.gemId) : false
      return collected ? null : '💎'
    }
    if (cell?.type === 'switch') return null
    if (cell?.type === 'gate') {
      const gate = state.gates.find((g) => g.id === cell.gateId)
      const open = gate ? isGateOpen(gate, state.activeSwitches) : false
      return open ? '🔓' : '🔒'
    }
    if (cell?.type === 'key') {
      const collected = cell.keyId ? state.player.inventory.has(cell.keyId) : false
      return collected ? null : '🔑'
    }
    if (cell?.type === 'door') {
      const door = state.doors.find((d) => d.id === cell.doorId)
      const unlocked = door ? state.player.inventory.has(door.requiredKeyId) : false
      return unlocked ? '🔓' : '🚪'
    }
    return null
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-maze-stone to-maze-wall p-6 flex flex-col overflow-auto" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Maze Mountain
          </h1>
          <p className="text-sm text-white opacity-90 mt-1">
            Steps: <span className={`font-bold ${movesLeft <= 5 ? 'text-red-300' : ''}`}>{state.movesUsed}</span> / {state.maxMoves}
            {state.totalGems > 0 && (
              <>
                {'  •  '}💎 Gems: <span className="font-bold">{state.gemsCollected.size}</span> / {state.totalGems}
                {exitLocked ? ' (exit locked)' : ' (exit open!)'}
              </>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {hintLevel < 3 && (
            <button onClick={handleRequestHint} className="px-4 py-2 bg-maze-path text-white rounded-lg hover:bg-opacity-80">
              💡 Hint ({hintLevel}/3)
            </button>
          )}
          <button
            onClick={() => {
              runtime.dispatch({ type: 'reset' })
              setHintLevel(0)
            }}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            ↻ Reset
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-lg p-4 shadow-lg">
          <svg width={state.gridWidth * cellSize} height={state.gridHeight * cellSize} className="border-2 border-maze-stone">
            {state.grid.map((row, y) =>
              row.map((cell, x) => (
                <rect key={`${x},${y}`} x={x * cellSize} y={y * cellSize} width={cellSize} height={cellSize} fill={getCellColor(x, y)} stroke="#ccc" strokeWidth="1" />
              )),
            )}
            {state.grid.map((row, y) =>
              row.map((cell, x) => {
                const icon = getCellIcon(x, y)
                if (!icon) return null
                return (
                  <text key={`icon-${x},${y}`} x={x * cellSize + cellSize / 2} y={y * cellSize + cellSize / 2 + 5} textAnchor="middle" fontSize={cellSize * 0.6}>
                    {icon}
                  </text>
                )
              }),
            )}
            {/* Player indicator */}
            <circle cx={state.player.x * cellSize + cellSize / 2} cy={state.player.y * cellSize + cellSize / 2} r={cellSize / 3} fill="#2d5016" />
          </svg>

          {status === 'won' && (
            <div className="mt-4 p-4 bg-green-100 rounded-lg text-center">
              <p className="text-green-800 font-bold text-xl">🎉 Escaped with every gem, with {movesLeft} steps to spare!</p>
            </div>
          )}

          {outOfMoves && (
            <div className="mt-4 p-4 bg-red-100 rounded-lg text-center">
              <p className="text-red-800 font-bold text-xl">Out of steps!</p>
              <p className="text-red-700 text-sm">Plan the whole route before you walk it. Press ↻ Reset to try again.</p>
            </div>
          )}

          {hint && (
            <div className="mt-4 p-3 bg-blue-100 rounded-lg text-blue-800">
              <p>{hint.hint}</p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-700 justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#e056fd' }} /> 💎 Gem (all needed to open the exit)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#e8720c' }} /> 🏁 Exit</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#16a085' }} /> 🔑 Key (pick up, keep forever)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#ff6b6b' }} /> Switch (off)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#2ecc71' }} /> Switch (on)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#4a90e2' }} /> 🔒 Gate (needs 1 switch)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#9b59b6' }} /> 🔒 Gate (needs 2 switches)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 inline-block rounded-sm" style={{ background: '#7b4a1e' }} /> 🚪 Locked door (needs matching key)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
