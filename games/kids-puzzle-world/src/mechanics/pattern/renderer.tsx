import { useState } from 'react'
import { HintTier, PuzzleRuntime } from '@/runtime/types'
import { PatternAction, PatternHintState } from './definition'
import { PatternState } from './state'
import { usePuzzleRuntime } from '@/runtime/usePuzzleRuntime'

interface PatternRendererProps {
  runtime: PuzzleRuntime<PatternState, PatternAction>
}

const DIRECTIONS = [
  { angle: 0, name: 'Up' },
  { angle: 90, name: 'Right' },
  { angle: 180, name: 'Down' },
  { angle: 270, name: 'Left' },
]

function DirectionArrow({ angle }: { angle: number }) {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true" style={{ transform: `rotate(${angle}deg)` }}>
      <path d="M24 40V8M10 22 24 8l14 14" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function PatternRenderer({ runtime }: PatternRendererProps) {
  const { state, status } = usePuzzleRuntime(runtime)
  const [hintLevel, setHintLevel] = useState(0)
  const [checked, setChecked] = useState(false)
  const hiddenSlots = state.slots.filter((slot) => !slot.isVisible)
  const [selectedSlotId, setSelectedSlotId] = useState(hiddenSlots[0]?.id)
  const selectedSlot = hiddenSlots.find((slot) => slot.id === selectedSlotId) ?? hiddenSlots[0]
  const isRotation = state.rule === 'rotation'
  const hint = hintLevel ? runtime.getHintState(hintLevel as HintTier) as PatternHintState : null

  const fillSlot = (slotId: string, value: number) => {
    setChecked(false)
    runtime.dispatch({ type: 'fillSlot', slotId, value })
  }

  const handleInputChange = (slotId: string, value: string) => {
    setChecked(false)
    if (value === '') {
      runtime.dispatch({ type: 'clearSlot', slotId })
      return
    }
    const number = Number(value)
    if (Number.isSafeInteger(number)) fillSlot(slotId, number)
  }

  const handleReset = () => {
    runtime.reset()
    setHintLevel(0)
    setChecked(false)
    setSelectedSlotId(hiddenSlots[0]?.id)
  }

  return (
    <section className="pattern-puzzle w-full min-h-screen bg-gradient-to-br from-forest-sky to-forest-light p-4 sm:p-8 flex flex-col text-forest-moss" aria-labelledby="pattern-title">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <h1 id="pattern-title" className="text-3xl sm:text-4xl font-bold font-display">Pattern Forest</h1>
        <div className="flex gap-2">
          <button type="button" disabled={hintLevel >= 4} onClick={() => {
            const next = Math.min(hintLevel + 1, 4)
            setHintLevel(next)
            runtime.requestHint(next as HintTier)
          }} className="min-h-12 px-4 py-2 bg-white border-2 border-forest-moss rounded-lg font-bold hover:bg-forest-sky disabled:opacity-50">
            Hint ({hintLevel}/4)
          </button>
          <button type="button" onClick={handleReset} className="min-h-12 px-4 py-2 bg-white border-2 border-forest-moss rounded-lg font-bold hover:bg-forest-sky">Reset puzzle</button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-4 sm:p-8 shadow-lg max-w-2xl w-full">
          <h2 className="text-center text-xl font-bold mb-2">What comes next?</h2>
          <p id="pattern-instructions" className="text-center mb-6">
            {isRotation ? 'Choose an empty place, then pick the arrow that fits.' : 'Look for the pattern. Fill each empty place, then check your answer.'}
          </p>
          {hint && <p role="status" className="bg-forest-sky border-l-4 border-forest-moss p-4 mb-6 rounded">{hint.hint}</p>}

          <ol aria-label="Pattern sequence" className="flex gap-3 flex-wrap justify-center mb-6">
            {state.slots.map((slot, index) => {
              const direction = DIRECTIONS.find((item) => item.angle === slot.value)?.name
              return (
                <li key={slot.id} className="flex flex-col items-center gap-2">
                  <span className="text-sm">Place {index + 1}</span>
                  {slot.isVisible ? (
                    <div className="w-16 h-16 bg-forest-moss text-white rounded-lg flex items-center justify-center text-2xl font-bold" aria-label={isRotation ? `Place ${index + 1}: ${direction}` : `Place ${index + 1}: ${slot.value}`}>
                      {isRotation ? <DirectionArrow angle={slot.value ?? 0} /> : slot.value}
                    </div>
                  ) : isRotation ? (
                    <button type="button" aria-label={`Choose arrow for place ${index + 1}${direction ? `: ${direction}` : ': empty'}`} aria-pressed={selectedSlot?.id === slot.id} aria-describedby="pattern-instructions"
                      onClick={() => setSelectedSlotId(slot.id)} className={`w-16 h-16 border-2 border-forest-moss rounded-lg flex items-center justify-center text-2xl font-bold ${selectedSlot?.id === slot.id ? 'bg-forest-light ring-2 ring-forest-moss ring-offset-2' : 'bg-white hover:bg-forest-sky'}`}>
                      {slot.value === null ? '?' : <DirectionArrow angle={slot.value} />}
                    </button>
                  ) : (
                    <label>
                      <span className="sr-only">Answer for place {index + 1}</span>
                      <input type="number" inputMode="numeric" step="1" value={slot.value ?? ''} onChange={(event) => handleInputChange(slot.id, event.target.value)} aria-describedby="pattern-instructions"
                        className="w-16 h-16 border-2 border-forest-moss rounded-lg text-center text-lg font-bold" />
                    </label>
                  )}
                </li>
              )
            })}
          </ol>

          {isRotation && selectedSlot && (
            <fieldset className="mb-6">
              <legend className="text-center w-full mb-3 font-bold">Pick an arrow for place {state.slots.indexOf(selectedSlot) + 1}</legend>
              <div className="flex flex-wrap justify-center gap-3">
                {DIRECTIONS.map(({ angle, name }) => (
                  <button type="button" key={angle} aria-label={`Point ${name.toLowerCase()}`} aria-pressed={selectedSlot.value === angle} onClick={() => fillSlot(selectedSlot.id, angle)}
                    className="min-w-16 min-h-16 p-2 border-2 border-forest-moss rounded-lg flex flex-col items-center bg-white hover:bg-forest-sky">
                    <DirectionArrow angle={angle} /><span className="text-sm">{name}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <p role="status" aria-live="polite" className="min-h-12 mb-3 text-center font-semibold">
            {status === 'won' ? 'You found the pattern!' : checked ? hiddenSlots.some((slot) => slot.value === null) ? 'Fill every empty place, then try again.' : 'Not quite yet. Look at how the pattern repeats and try another choice.' : ''}
          </p>
          <button type="button" onClick={() => { setChecked(true); runtime.dispatch({ type: 'submit' }) }} disabled={status === 'won'}
            className="w-full min-h-12 py-3 px-4 bg-forest-moss text-white font-bold rounded-lg hover:opacity-90 disabled:opacity-60">
            Check Pattern
          </button>
        </div>
      </div>
    </section>
  )
}
