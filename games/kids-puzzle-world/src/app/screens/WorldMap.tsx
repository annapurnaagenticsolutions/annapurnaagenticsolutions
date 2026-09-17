import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressionStore } from '@/app/stores/progressionStore'

const regions = [
  { id: 'pattern-forest', name: 'Pattern Forest', emoji: '🧩' },
  { id: 'maze-mountain', name: 'Maze Mountain', emoji: '🗺️' },
  { id: 'balance-bay', name: 'Balance Bay', emoji: '⚖️' },
  { id: 'gear-factory', name: 'Gear Factory', emoji: '⚙️' },
  { id: 'shape-workshop', name: 'Shape Workshop', emoji: '🧩' },
]

export default function WorldMap() {
  const navigate = useNavigate()
  const { isRegionUnlocked, loadProgress, completedLevels } = useProgressionStore()

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const getBackgroundGradient = (regionId: string) => {
    const gradients: Record<string, string> = {
      'pattern-forest': 'linear-gradient(135deg, #2d5016 0%, #6ba547 100%)',
      'maze-mountain': 'linear-gradient(135deg, #3d3d3d 0%, #5a5a5a 100%)',
      'balance-bay': 'linear-gradient(135deg, #87ceeb 0%, #4a90e2 100%)',
      'gear-factory': 'linear-gradient(135deg, #b87333 0%, #d4af37 100%)',
      'shape-workshop': 'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 100%)',
    }
    return gradients[regionId] || 'linear-gradient(135deg, #ccc 0%, #999 100%)'
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-forest-sky via-balance-sky to-forest-light flex items-center justify-center">
      <div className="container mx-auto px-4">
        <h1 className="text-6xl font-bold text-center mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          Kids Puzzle World
        </h1>
        <p className="text-center text-gray-600 mb-4">Choose a region to explore</p>
        <p className="text-center text-sm text-gray-500 mb-12">Completed: {completedLevels.length} puzzles</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {regions.map((region) => {
            const unlocked = isRegionUnlocked(region.id)
            return (
              <button
                key={region.id}
                onClick={() => unlocked && navigate(`/region/${region.id}`)}
                disabled={!unlocked}
                className={`p-8 rounded-2xl transition-all ${
                  unlocked
                    ? 'bg-white shadow-lg hover:shadow-2xl hover:scale-105 cursor-pointer'
                    : 'bg-gray-300 shadow-sm cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br rounded-lg flex items-center justify-center text-4xl"
                  style={{
                    backgroundImage: getBackgroundGradient(region.id),
                    opacity: unlocked ? 1 : 0.5,
                  }}
                >
                  {region.emoji}
                </div>
                <h2 className="text-center text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                  {region.name}
                </h2>
                {!unlocked && <p className="text-center text-xs text-gray-500 mt-2">🔒 Locked</p>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
