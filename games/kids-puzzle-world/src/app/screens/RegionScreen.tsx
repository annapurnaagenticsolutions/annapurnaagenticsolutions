import { useNavigate, useParams } from 'react-router-dom'
import { useProgressionStore } from '@/app/stores/progressionStore'

export default function RegionScreen() {
  const navigate = useNavigate()
  const { regionId } = useParams()
  const { getLevelProgress } = useProgressionStore()

  const levels = Array.from({ length: 5 }, (_, i) => ({
    id: `level-${i + 1}`,
    number: i + 1,
  }))

  const getLevelStatus = (levelId: string) => {
    const levelKey = `${regionId}/${levelId}`
    const progress = getLevelProgress(levelKey)
    return progress?.status || 'unseen'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-2 border-green-500'
      case 'started':
        return 'bg-yellow-100 border-2 border-yellow-500'
      default:
        return 'bg-white'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅'
      case 'started':
        return '⏳'
      default:
        return '🔒'
    }
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-forest-sky to-forest-light p-8">
      <button
        onClick={() => navigate('/')}
        className="mb-8 px-4 py-2 bg-white rounded-lg shadow hover:shadow-lg transition-shadow"
      >
        ← Back to World
      </button>

      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-display)' }}>
          {regionId?.replace('-', ' ').toUpperCase()}
        </h1>
        <p className="text-gray-600">
          Completed: {levels.filter((l) => getLevelStatus(l.id) === 'completed').length}/{levels.length}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {levels.map((level) => {
          const status = getLevelStatus(level.id)
          return (
            <button
              key={level.id}
              onClick={() => navigate(`/puzzle/${regionId}/${level.id}`)}
              className={`p-6 rounded-xl shadow-md hover:shadow-lg hover:scale-105 transition-all ${getStatusColor(status)}`}
            >
              <div className="text-3xl font-bold text-center mb-2">
                {level.number}
              </div>
              <div className="text-center text-2xl mb-2">{getStatusIcon(status)}</div>
              <p className="text-center text-sm text-gray-600">
                {status === 'completed' ? 'Completed' : status === 'started' ? 'In Progress' : 'Not Started'}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}
