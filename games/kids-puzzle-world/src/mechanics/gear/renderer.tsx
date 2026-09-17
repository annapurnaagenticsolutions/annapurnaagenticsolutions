import { useEffect, useRef, useState } from 'react'
import { PuzzleRuntime } from '@/runtime/types'
import { GearAction } from './definition'
import { GearState } from './state'
import { usePuzzleRuntime } from '@/runtime/usePuzzleRuntime'

interface GearRendererProps {
  runtime: PuzzleRuntime<GearState, GearAction>
}

export default function GearRenderer({ runtime }: GearRendererProps) {
  const { state, status } = usePuzzleRuntime(runtime)
  const [hintLevel, setHintLevel] = useState(0)
  const lastFrameRef = useRef<number | null>(null)

  // Continuous sims route through dispatch({type:'tick', dt}) so the angle
  // shown on screen is always read from real simulation state, never faked.
  // Nothing turns until the machine is actually engaged.
  useEffect(() => {
    let rafId: number
    const frame = (time: number) => {
      if (lastFrameRef.current !== null && status !== 'won') {
        const dt = Math.min((time - lastFrameRef.current) / 1000, 0.05)
        runtime.dispatch({ type: 'tick', dt })
      }
      lastFrameRef.current = time
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [runtime, status])

  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    runtime.dispatch({ type: 'setDriverSpeed', speed: parseFloat(e.target.value) })
  }

  const handleRequestHint = () => {
    const nextLevel = Math.min(hintLevel + 1, 3)
    setHintLevel(nextLevel)
    runtime.requestHint(nextLevel as any)
  }

  const hint = hintLevel > 0 ? (runtime.getHintState(hintLevel as any) as { hint: string; highlightGearIds?: string[] }) : null

  const targetsWithGears = state.targets
    .map((t) => ({ target: t, gear: state.gears.find((g) => g.id === t.gearId) }))
    .filter((t): t is { target: (typeof state.targets)[number]; gear: NonNullable<(typeof state.gears)[number]> } => !!t.gear)

  const maxX = Math.max(...state.gears.map((g) => g.x + g.radius), 400)
  const maxY = Math.max(...state.gears.map((g) => g.y + g.radius), 260)
  const svgWidth = maxX + 40
  const svgHeight = maxY + 40

  const attemptsLeft = state.maxAttempts - state.attemptsUsed
  const outOfAttempts = attemptsLeft <= 0 && status !== 'won'

  return (
    <div className="w-full h-screen bg-gradient-to-br from-gear-copper to-gear-iron p-6 flex flex-col overflow-auto">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-4xl font-bold text-gear-brass" style={{ fontFamily: 'var(--font-display)' }}>
            Gear Factory
          </h1>
          <p className="text-sm text-gear-brass opacity-90 mt-1">
            Attempts left: <span className="font-bold">{Math.max(0, attemptsLeft)}</span> / {state.maxAttempts}
          </p>
        </div>
        <div className="flex gap-2">
          {hintLevel < 3 && (
            <button onClick={handleRequestHint} className="px-4 py-2 bg-gear-brass text-gray-800 rounded-lg hover:bg-opacity-80 font-bold">
              💡 Hint ({hintLevel}/3)
            </button>
          )}
          <button
            onClick={() => {
              runtime.dispatch({ type: 'reset' })
              setHintLevel(0)
            }}
            className="px-4 py-2 bg-gear-brass text-gray-800 rounded-lg hover:bg-opacity-80 font-bold"
          >
            ↻ Reset
          </button>
        </div>
      </div>

      {hint && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded max-w-2xl mx-auto w-full">
          <p className="text-blue-800 font-semibold">{hint.hint}</p>
        </div>
      )}

      <div className="flex-1 flex items-center justify-center overflow-auto">
        <svg width={svgWidth} height={svgHeight} className="bg-gray-900 rounded-lg shadow-lg" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Connection lines drawn first, underneath the gears — with a
              branching train the player needs to actually see which gears
              share a driver input, not just infer it. */}
          {state.connections.map((conn, i) => {
            const from = state.gears.find((g) => g.id === conn.fromGearId)
            const to = state.gears.find((g) => g.id === conn.toGearId)
            if (!from || !to) return null
            return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#7a8b99" strokeWidth={3} />
          })}

          {state.gears.map((gear) => {
            const isHighlighted = hint?.highlightGearIds?.includes(gear.id)
            const isTarget = state.targets.some((t) => t.gearId === gear.id)
            return (
              <g key={gear.id}>
                <circle cx={gear.x} cy={gear.y} r={gear.radius} fill={gear.isDriver ? '#d4af37' : '#c0c0c0'} stroke="#333" strokeWidth="2" />
                {/* Rotation indicator */}
                <line x1={gear.x} y1={gear.y} x2={gear.x + Math.cos(gear.angle) * gear.radius} y2={gear.y + Math.sin(gear.angle) * gear.radius} stroke="#333" strokeWidth="2" />
                {/* Tooth count — the number the player needs to do the math */}
                <text x={gear.x} y={gear.y + 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#333">
                  {gear.teeth}
                </text>
                {isTarget && <circle cx={gear.x} cy={gear.y} r={gear.radius + 5} fill="none" stroke="#ff6b6b" strokeWidth="2" strokeDasharray="5,5" />}
                {isHighlighted && <circle cx={gear.x} cy={gear.y} r={gear.radius + 10} fill="none" stroke="#4d96ff" strokeWidth="2" strokeDasharray="3,3" />}
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-4 bg-white rounded-lg p-5 shadow-lg max-h-[42vh] overflow-auto">
        <div className="mb-3">
          <label className="block text-sm font-bold mb-2">Driver Speed Dial (gold gear)</label>
          <input
            type="range"
            min={state.speedMin}
            max={state.speedMax}
            step={state.speedStep}
            value={state.stagedSpeed}
            onChange={handleSpeedChange}
            disabled={outOfAttempts || status === 'won'}
            className="w-full"
          />
          <div className="flex items-center justify-center gap-4 mt-2">
            <p className="text-lg font-bold">{state.stagedSpeed.toFixed(2)} rad/s</p>
            <button
              onClick={() => runtime.dispatch({ type: 'engage' })}
              disabled={outOfAttempts || status === 'won'}
              className="px-5 py-2 bg-gear-copper text-white rounded-lg font-bold disabled:opacity-40 hover:opacity-90"
            >
              ⚙ Engage ({Math.max(0, attemptsLeft)} left)
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 mt-1">
            The machine only runs when you press Engage — and each run costs an attempt.
          </p>
        </div>

        {targetsWithGears.length > 0 && (
          <div className="space-y-2">
            {targetsWithGears.length > 1 && <p className="text-xs text-gray-500 -mb-1">All {targetsWithGears.length} branches must be exactly right at the same time:</p>}
            {targetsWithGears.map(({ target, gear }, i) => {
              const speedDiff = gear.angularVelocity - target.targetAngularVelocity
              const isMet = state.isEngaged && Math.abs(speedDiff) <= state.tolerance
              return (
                <div key={target.gearId} className={`p-3 rounded ${isMet ? 'bg-green-50' : 'bg-blue-50'}`}>
                  <p className="text-sm">
                    <strong>Branch {i + 1} needs:</strong> {target.targetAngularVelocity.toFixed(2)} rad/s
                    {state.isEngaged ? (
                      <>
                        {' — '}
                        <strong>ran at:</strong> {gear.angularVelocity.toFixed(2)} rad/s{' '}
                        {isMet ? '✅' : Math.abs(gear.angularVelocity) < Math.abs(target.targetAngularVelocity) ? '⬆ too slow' : '⬇ too fast'}
                      </>
                    ) : (
                      <span className="text-gray-500"> — not run yet</span>
                    )}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {status === 'won' && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg text-center">
            <p className="text-green-800 font-bold">🎉 Every branch is turning correctly!</p>
          </div>
        )}

        {outOfAttempts && (
          <div className="mt-4 p-3 bg-red-100 rounded-lg text-center">
            <p className="text-red-800 font-bold">Out of attempts! Press ↻ Reset for a fresh machine.</p>
          </div>
        )}
      </div>
    </div>
  )
}
