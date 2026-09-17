import { useState } from 'react'
import { useProgressionStore } from '@/app/stores/progressionStore'

export default function ScenarioLab() {
  const { loadProgress, unlockedRegionIds, completedLevels } = useProgressionStore()
  const [activeTab, setActiveTab] = useState<'progression' | 'state' | 'tools'>('progression')

  const regions = ['pattern-forest', 'maze-mountain', 'balance-bay', 'gear-factory', 'shape-workshop']

  const handleUnlockAll = () => {
    const store = useProgressionStore.getState()
    regions.forEach((r) => store.unlockRegion(r))
  }

  const handleResetProgress = () => {
    localStorage.removeItem('progression-store')
    localStorage.removeItem('kpw:save')
    window.location.reload()
  }

  const handleCompleteAllLevels = () => {
    const store = useProgressionStore.getState()
    regions.forEach((region) => {
      for (let i = 1; i <= 5; i++) {
        const levelKey = `${region}/level-${i}`
        store.completePuzzle(levelKey)
      }
    })
  }

  const handleLoadProgress = () => {
    loadProgress()
  }

  return (
    <div className="w-full h-screen bg-gray-900 text-white flex">
      {/* Sidebar Navigation */}
      <div className="w-48 bg-gray-800 border-r border-gray-700 p-4">
        <h2 className="text-xl font-bold mb-6">🧪 Scenario Lab</h2>
        <div className="space-y-2">
          <button
            onClick={() => setActiveTab('progression')}
            className={`w-full text-left px-4 py-2 rounded ${activeTab === 'progression' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            Progression
          </button>
          <button
            onClick={() => setActiveTab('state')}
            className={`w-full text-left px-4 py-2 rounded ${activeTab === 'state' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            Game State
          </button>
          <button
            onClick={() => setActiveTab('tools')}
            className={`w-full text-left px-4 py-2 rounded ${activeTab === 'tools' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
          >
            Tools
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-auto">
        {/* Progression Tab */}
        {activeTab === 'progression' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Progression State</h2>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Unlocked Regions</h3>
              <div className="grid grid-cols-2 gap-4">
                {regions.map((region) => (
                  <div key={region} className={`p-3 rounded ${unlockedRegionIds.includes(region) ? 'bg-green-900' : 'bg-red-900'}`}>
                    <p className="font-mono text-sm">{region}</p>
                    <p className="text-xs">{unlockedRegionIds.includes(region) ? '✅ Unlocked' : '🔒 Locked'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-bold mb-4">Level Progress</h3>
              <p className="mb-4">Total completed: {completedLevels.length}/25</p>
              <div className="bg-gray-700 rounded h-4 overflow-hidden">
                <div
                  className="bg-green-500 h-full transition-all"
                  style={{ width: `${(completedLevels.length / 25) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* State Tab */}
        {activeTab === 'state' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Raw Game State</h2>

            <div className="bg-gray-800 rounded-lg p-6 mb-6 font-mono text-sm overflow-x-auto">
              <pre>
{JSON.stringify(
  {
    unlockedRegions: unlockedRegionIds,
    completedLevelCount: completedLevels.length,
    completedLevels: completedLevels.slice(0, 10).concat(completedLevels.length > 10 ? ['...'] : []),
  },
  null,
  2,
)}
              </pre>
            </div>

            <div className="bg-gray-800 rounded-lg p-6 font-mono text-sm overflow-x-auto">
              <h3 className="font-bold mb-2">localStorage Keys:</h3>
              <pre>
{Object.keys(localStorage)
  .filter((k) => k.startsWith('kpw') || k.includes('progression'))
  .map((k) => `${k}: ${localStorage.getItem(k)?.substring(0, 50)}...`)
  .join('\n')}
              </pre>
            </div>
          </div>
        )}

        {/* Tools Tab */}
        {activeTab === 'tools' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Developer Tools</h2>

            <div className="space-y-4">
              <div className="bg-blue-900 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">Progression Tools</h3>
                <div className="space-y-2">
                  <button
                    onClick={handleUnlockAll}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-bold"
                  >
                    🔓 Unlock All Regions
                  </button>
                  <button
                    onClick={handleCompleteAllLevels}
                    className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded font-bold"
                  >
                    ✅ Complete All Levels
                  </button>
                  <button
                    onClick={handleLoadProgress}
                    className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded font-bold"
                  >
                    🔄 Reload Progress
                  </button>
                </div>
              </div>

              <div className="bg-red-900 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-2">Destructive Actions</h3>
                <button
                  onClick={() => {
                    if (confirm('Reset all progress? This cannot be undone.')) {
                      handleResetProgress()
                    }
                  }}
                  className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded font-bold"
                >
                  🗑️ Reset All Progress
                </button>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold mb-4">Quick Links</h3>
                <div className="space-y-2">
                  <a href="/" className="block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-center">
                    🌍 World Map
                  </a>
                  <a href="/region/pattern-forest" className="block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-center">
                    📍 Pattern Forest
                  </a>
                  <a href="/puzzle/pattern-forest/level-1" className="block px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-center">
                    🎮 Sample Puzzle
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
