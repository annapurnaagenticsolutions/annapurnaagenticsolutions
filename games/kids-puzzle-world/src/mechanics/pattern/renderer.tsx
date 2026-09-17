import { useState } from 'react'
import { PuzzleRuntime } from '@/runtime/types'
import { PatternAction } from './definition'
import { PatternState } from './state'
import { usePuzzleRuntime } from '@/runtime/usePuzzleRuntime'

interface PatternRendererProps {
  runtime: PuzzleRuntime<PatternState, PatternAction>
}

export default function PatternRenderer({ runtime }: PatternRendererProps) {
  const { state, status } = usePuzzleRuntime(runtime)
  const [hintLevel, setHintLevel] = useState(0)

  const hiddenSlots = state.slots.filter((s) => !s.isVisible)
  const visibleSlots = state.slots.filter((s) => s.isVisible)

  const handleInputChange = (slotId: string, value: string): void => {
    if (value === '') {
      runtime.dispatch({ type: 'clearSlot', slotId })
      return
    }
    const numValue = parseInt(value, 10)
    if (!isNaN(numValue)) {
      runtime.dispatch({ type: 'fillSlot', slotId, value: numValue })
    }
  }

  const handleSubmit = () => {
    runtime.dispatch({ type: 'submit' })
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

  const getCurrentHint = () => {
    if (hintLevel === 0) return null
    return runtime.getHintState(hintLevel as any) as { hint: string; highlightIds?: string[] } | null
  }

  const hint = getCurrentHint()

  const isAnswerCorrect = hiddenSlots.length > 0 && hiddenSlots.every((slot) => slot.value !== null && slot.value === slot.correctValue)

  return (
    <div className="w-full h-screen bg-gradient-to-br from-forest-sky to-forest-light p-8 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-forest-moss" style={{ fontFamily: 'var(--font-display)' }}>
            Pattern Forest
          </h1>
          <p className="text-sm text-gray-600 mt-1">Rule: <span className="font-semibold">{state.rule}</span></p>
        </div>
        <div className="flex gap-2">
          {hintLevel < 4 && (
            <button onClick={handleRequestHint} className="px-4 py-2 bg-forest-leaf text-white rounded-lg hover:bg-forest-moss font-bold">
              💡 Hint ({hintLevel}/4)
            </button>
          )}
          <button onClick={handleReset} className="px-4 py-2 bg-gray-400 text-white rounded-lg hover:bg-gray-600 font-bold">
            ↻ Reset
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-8 shadow-lg max-w-2xl w-full">
          {/* Hint display */}
          {hint && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <p className="text-blue-800 font-semibold">{hint.hint}</p>
            </div>
          )}

          {/* Sequence display */}
          <div className="mb-8">
            <p className="text-center text-gray-600 mb-4 font-semibold">Complete the sequence:</p>
            <div className="flex gap-3 flex-wrap justify-center">
              {state.slots.map((slot: any) => (
                <div key={slot.id} className="flex flex-col items-center gap-2">
                  {slot.isVisible ? (
                    <div className="w-16 h-16 bg-forest-moss text-white rounded-lg flex items-center justify-center text-2xl font-bold shadow">
                      {slot.value}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <input
                        type="number"
                        value={slot.value === null ? '' : slot.value}
                        onChange={(e) => handleInputChange(slot.id, e.target.value)}
                        placeholder="?"
                        className="w-16 h-16 border-2 border-forest-moss rounded-lg text-center text-lg font-bold focus:outline-none focus:border-forest-leaf focus:ring-2 focus:ring-forest-leaf"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Feedback */}
          {status === 'won' && (
            <div className="text-center p-4 bg-green-100 border-2 border-green-500 rounded-lg mb-4">
              <p className="text-green-800 font-bold text-xl">🎉 Puzzle complete!</p>
              <p className="text-green-700 text-sm">You found the pattern!</p>
            </div>
          )}

          {isAnswerCorrect && status !== 'won' && (
            <div className="text-center p-4 bg-green-100 border-2 border-green-500 rounded-lg mb-4">
              <p className="text-green-800 font-bold">✅ All correct!</p>
            </div>
          )}

          {/* Submit button */}
          {hiddenSlots.length > 0 && status !== 'won' && (
            <button
              onClick={handleSubmit}
              className="w-full py-3 bg-forest-leaf text-white font-bold rounded-lg hover:bg-forest-moss text-lg transition-colors"
            >
              Check Pattern
            </button>
          )}

          {status === 'won' && (
            <button onClick={handleReset} className="w-full py-3 bg-forest-leaf text-white font-bold rounded-lg hover:bg-forest-moss text-lg transition-colors">
              Play Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
