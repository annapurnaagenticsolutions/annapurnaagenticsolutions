import { useRef, useState } from 'react'
import { PuzzleRuntime } from '@/runtime/types'
import { BalanceAction } from './definition'
import { BalanceState, calculateTorque } from './state'
import { usePuzzleRuntime } from '@/runtime/usePuzzleRuntime'

interface BalanceRendererProps {
  runtime: PuzzleRuntime<BalanceState, BalanceAction>
}

export default function BalanceRenderer({ runtime }: BalanceRendererProps) {
  const { state, status } = usePuzzleRuntime(runtime)
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hintLevel, setHintLevel] = useState(0)
  const svgRef = useRef<SVGSVGElement>(null)

  const PIVOT_X = 220
  const PIVOT_Y = 300

  // SVG has a viewBox independent of its rendered size, so client coordinates
  // must be mapped through the element's own bounding box, not used directly.
  const toSvgPoint = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return { x: clientX, y: clientY }
    const rect = svg.getBoundingClientRect()
    const viewBox = svg.viewBox.baseVal
    const scaleX = viewBox.width / rect.width
    const scaleY = viewBox.height / rect.height
    return {
      x: (clientX - rect.left) * scaleX + viewBox.x,
      y: (clientY - rect.top) * scaleY + viewBox.y,
    }
  }

  const handleMouseDown = (e: React.MouseEvent, objId: string) => {
    const obj = state.bodies.find((b) => b.id === objId)
    if (obj && !obj.isStatic && !obj.isLocked) {
      setDragging(objId)
      const point = toSvgPoint(e.clientX, e.clientY)
      setDragOffset({ x: point.x - obj.x, y: point.y - obj.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragging) {
      const point = toSvgPoint(e.clientX, e.clientY)
      runtime.dispatch({ type: 'moveObject', objectId: dragging, x: point.x - dragOffset.x, y: point.y - dragOffset.y })
    }
  }

  const handleMouseUp = () => {
    if (dragging) {
      runtime.dispatch({ type: 'settle' })
      setDragging(null)
    }
  }

  const handleReset = () => {
    runtime.dispatch({ type: 'reset' })
    setHintLevel(0)
  }

  const handleRequestHint = () => {
    const nextLevel = Math.min(hintLevel + 1, 4)
    setHintLevel(nextLevel)
    runtime.requestHint(nextLevel as any)
  }

  const hint = hintLevel > 0 ? (runtime.getHintState(hintLevel as any) as { hint: string; highlightId?: string }) : null

  // Live visual feedback: the platform actually tilts in proportion to the
  // current torque, so dragging visibly does something on every frame
  // instead of only reacting once you happen to land on the exact answer.
  const torque = calculateTorque(state.bodies, PIVOT_X, PIVOT_Y)
  const tiltAngle = Math.max(-14, Math.min(14, torque / 20))
  const isBalanced = Math.abs(torque) <= state.targetTorqueTolerance
  const movesLeft = state.maxMoves - state.movesUsed
  const outOfMoves = movesLeft <= 0 && status !== 'won'
  // Shown in mass x notch units — the number the player is actually
  // reasoning about, not raw pixels.
  const leftPull = state.bodies
    .filter((b) => !b.isStatic && b.x < PIVOT_X)
    .reduce((sum, b) => sum + b.mass * Math.round((PIVOT_X - b.x) / state.slotUnit), 0)
  const rightPull = state.bodies
    .filter((b) => !b.isStatic && b.x > PIVOT_X)
    .reduce((sum, b) => sum + b.mass * Math.round((b.x - PIVOT_X) / state.slotUnit), 0)

  return (
    <div
      className="w-full h-screen bg-gradient-to-br from-balance-sky to-balance-water p-8 flex flex-col"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
            Balance Bay
          </h1>
          <p className="text-sm text-white opacity-90 mt-1">
            Moves: <span className={`font-bold ${movesLeft <= 1 ? 'text-red-300' : ''}`}>{state.movesUsed}</span> / {state.maxMoves}
            {'  •  '}Left pull <span className="font-bold">{leftPull}</span> vs Right pull <span className="font-bold">{rightPull}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {hintLevel < 4 && (
            <button onClick={handleRequestHint} className="px-4 py-2 bg-forest-leaf text-white rounded-lg hover:opacity-90 font-bold">
              💡 Hint ({hintLevel}/4)
            </button>
          )}
          <button onClick={handleReset} className="px-4 py-2 bg-balance-sand text-gray-800 rounded-lg hover:bg-opacity-80 font-bold">
            ↻ Reset
          </button>
        </div>
      </div>

      {hint && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded max-w-2xl mx-auto w-full">
          <p className="text-blue-800 font-semibold">{hint.hint}</p>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center">
        <svg ref={svgRef} width="600" height="400" className="bg-white rounded-lg shadow-lg" viewBox="0 0 600 400">
          {/* Platform + objects tilt together around the pivot, in proportion
              to the live torque, so every drag gives immediate visual feedback
              even before the exact balance point is found. */}
          <g transform={`rotate(${tiltAngle} ${PIVOT_X} ${PIVOT_Y})`}>
            {state.bodies
              .filter((b) => b.isStatic)
              .map((platform) => (
                <g key={platform.id}>
                  <rect
                    x={platform.x - platform.width / 2}
                    y={platform.y - platform.height / 2}
                    width={platform.width}
                    height={platform.height}
                    fill={isBalanced ? '#6bcf7f' : '#8b6f47'}
                    stroke="#5a3a1a"
                    strokeWidth="2"
                  />
                </g>
              ))}

            {/* Numbered notches — blocks can only rest on these, so distance
                from the pivot is a whole number the player can compute with. */}
            {Array.from({ length: state.maxSlot * 2 + 1 }, (_, i) => i - state.maxSlot).map((slot) => {
              const nx = PIVOT_X + slot * state.slotUnit
              return (
                <g key={`notch-${slot}`}>
                  <line x1={nx} y1={PIVOT_Y - 26} x2={nx} y2={PIVOT_Y - 18} stroke="#5a3a1a" strokeWidth={slot === 0 ? 2 : 1} opacity={0.8} />
                  <text x={nx} y={PIVOT_Y + 14} textAnchor="middle" fontSize="9" fill="#5a3a1a" opacity={0.85}>
                    {Math.abs(slot)}
                  </text>
                </g>
              )
            })}

            {state.bodies
              .filter((b) => !b.isStatic)
              .map((obj) => (
                <g
                  key={obj.id}
                  onMouseDown={(e) => handleMouseDown(e, obj.id)}
                  style={{ cursor: obj.isLocked ? 'not-allowed' : dragging === obj.id ? 'grabbing' : 'grab' }}
                >
                  <rect
                    x={obj.x - obj.width / 2}
                    y={obj.y - obj.height / 2}
                    width={obj.width}
                    height={obj.height}
                    fill={obj.isLocked ? '#8d9aa5' : dragging === obj.id ? '#6bcf7f' : '#ff6b6b'}
                    stroke={hint?.highlightId === obj.id ? '#4d96ff' : '#333'}
                    strokeWidth={hint?.highlightId === obj.id ? 4 : 2}
                    rx="4"
                  />
                  <text x={obj.x} y={obj.y + 5} textAnchor="middle" fontSize="13" fill="#fff" fontWeight="bold">
                    {obj.mass}
                  </text>
                  {obj.isLocked && (
                    <text x={obj.x} y={obj.y - obj.height / 2 - 3} textAnchor="middle" fontSize="11">
                      🔒
                    </text>
                  )}
                </g>
              ))}
          </g>

          {/* Pivot point stays fixed — it's the fulcrum, not part of the tilt */}
          <circle cx={PIVOT_X} cy={PIVOT_Y} r="5" fill="#d4af37" />
        </svg>
      </div>

      <div className="max-w-2xl mx-auto w-full mb-2">
        <div className="flex items-center justify-between text-white text-xs mb-1">
          <span>⬅ Left heavy</span>
          <span>Balanced</span>
          <span>Right heavy ➡</span>
        </div>
        <div className="relative w-full h-3 bg-white bg-opacity-30 rounded-full overflow-hidden">
          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white" />
          <div
            className={`absolute top-0 bottom-0 w-2 rounded-full transition-all ${isBalanced ? 'bg-green-400' : 'bg-yellow-300'}`}
            style={{ left: `calc(50% + ${Math.max(-49, Math.min(49, torque / 8))}%)` }}
          />
        </div>
      </div>

      {status === 'won' && (
        <div className="mt-4 p-4 bg-green-100 rounded-lg text-center">
          <p className="text-green-800 font-bold text-xl">🎉 Balanced exactly — with {movesLeft} move{movesLeft === 1 ? '' : 's'} to spare!</p>
        </div>
      )}

      {outOfMoves && (
        <div className="mt-4 p-4 bg-red-100 rounded-lg text-center">
          <p className="text-red-800 font-bold text-xl">Out of moves!</p>
          <p className="text-red-700 text-sm">Work out the notches before dragging. Press ↻ Reset to try again.</p>
        </div>
      )}

      <div className="mt-3 text-white text-center text-sm">
        <p>Drag blocks onto the notches. A block's pull = its number x how many notches from the pivot. 🔒 blocks are bolted down.</p>
      </div>
    </div>
  )
}
