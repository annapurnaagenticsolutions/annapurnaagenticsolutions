import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useProgressionStore } from '@/app/stores/progressionStore'
import { getPuzzleRegion } from '@/app/data/regions'

export default function RegionScreen() {
  const navigate = useNavigate()
  const { regionId } = useParams()
  const { getLevelProgress } = useProgressionStore()
  const region = getPuzzleRegion(regionId)

  useEffect(() => {
    if (!region) navigate('/', { replace: true })
  }, [navigate, region])

  if (!region) return null

  const levels = Array.from({ length: 5 }, (_, i) => ({
    id: `level-${i + 1}`,
    number: i + 1,
  }))

  const getLevelStatus = (levelId: string) => {
    const levelKey = `${regionId}/${levelId}`
    const progress = getLevelProgress(levelKey)
    return progress?.status || 'unseen'
  }

  const completedCount = levels.filter((level) => getLevelStatus(level.id) === 'completed').length

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f4fbf5] px-4 py-6 text-[#18332b] sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="mb-8 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#c8dfcf] bg-white px-4 py-2 text-sm font-bold text-[#2d5016] shadow-sm transition hover:border-[#6ba547] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fc3d4]/60"
        >
          <span aria-hidden="true">←</span> Back to World
        </button>

        <header className="mb-8 rounded-[2rem] border border-[#c8dfcf] bg-white p-6 shadow-[0_18px_45px_rgba(45,80,22,0.08)] sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className={`mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br ${region.palette} text-3xl shadow-inner`} aria-hidden="true">{region.emoji}</div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b9a78]">{region.skill}</p>
              <h1 className="mt-1 text-4xl font-bold sm:text-5xl" style={{ fontFamily: 'var(--font-display)' }}>{region.name}</h1>
              <p className="mt-3 max-w-xl text-base leading-7 text-[#587066]">{region.tagline} Pick a level and let the world show you what to notice.</p>
            </div>
            <div className="rounded-2xl bg-[#e8f4f8] px-5 py-4 sm:min-w-40">
              <p className="text-sm font-semibold text-[#236b77]">Region progress</p>
              <p className="mt-1 text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{completedCount}/5</p>
            </div>
          </div>
        </header>

        <section aria-labelledby="levels-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b9a78]">Choose a challenge</p>
              <h2 id="levels-heading" className="mt-1 text-2xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Five gentle steps</h2>
            </div>
            <p className="hidden text-sm text-[#6b7f77] sm:block">Every attempt teaches you something.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {levels.map((level) => {
              const status = getLevelStatus(level.id)
              const isCompleted = status === 'completed'
              const isStarted = status === 'started'
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => navigate(`/puzzle/${regionId}/${level.id}`)}
                  aria-label={`Open ${region.name}, level ${level.number}. ${isCompleted ? 'Completed' : isStarted ? 'In progress' : 'Not started'}.`}
                  className={`group min-h-40 rounded-3xl border p-5 text-left shadow-[0_10px_26px_rgba(24,51,43,0.06)] transition-all hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fc3d4]/60 ${
                    isCompleted ? 'border-[#77bf93] bg-[#effaf1]' : isStarted ? 'border-[#e3c36c] bg-[#fff9e7]' : 'border-[#dce9df] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f4f8] text-2xl font-bold text-[#236b77]" style={{ fontFamily: 'var(--font-display)' }}>{level.number}</span>
                    <span aria-hidden="true" className={`text-xl ${isCompleted ? 'text-[#2f8b57]' : isStarted ? 'text-[#b7801c]' : 'text-[#9cafaa]'}`}>{isCompleted ? '✓' : isStarted ? '↗' : '○'}</span>
                  </div>
                  <p className="mt-5 text-base font-bold">{isCompleted ? 'Completed' : isStarted ? 'In progress' : 'Ready to explore'}</p>
                  <p className="mt-1 text-sm text-[#6b7f77]">{isCompleted ? 'Play again or continue onward.' : 'A short challenge, no pressure.'}</p>
                </button>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
