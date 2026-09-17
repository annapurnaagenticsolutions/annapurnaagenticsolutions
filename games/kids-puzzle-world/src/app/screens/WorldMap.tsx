import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProgressionStore } from '@/app/stores/progressionStore'
import { puzzleRegions } from '@/app/data/regions'

const LEVELS_PER_REGION = 5

export default function WorldMap() {
  const navigate = useNavigate()
  const { isRegionUnlocked, loadProgress, completedLevels } = useProgressionStore()

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const totalPuzzles = puzzleRegions.length * LEVELS_PER_REGION
  const completedCount = Math.min(completedLevels.length, totalPuzzles)
  const completionPercent = Math.round((completedCount / totalPuzzles) * 100)

  return (
    <main className="min-h-screen overflow-y-auto bg-[#f4fbf5] px-4 py-8 text-[#18332b] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10 flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#2d5016]">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#c8dfcf] bg-white px-3 py-1.5 shadow-sm">
                <span aria-hidden="true" className="text-base">✦</span>
                Kids Puzzle World
              </span>
              <span className="text-[#587066]">Guest mode · saved on this device</span>
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#6b9a78]">A curiosity atlas</p>
            <h1 className="text-4xl font-bold leading-tight sm:text-6xl" style={{ fontFamily: 'var(--font-display)' }}>
              A world made for curious minds.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#587066] sm:text-lg">
              Explore five playful places where noticing, planning and making things work are the whole adventure.
            </p>
          </div>

          <section className="w-full rounded-3xl border border-[#c8dfcf] bg-white p-5 shadow-[0_18px_45px_rgba(45,80,22,0.08)] lg:max-w-xs" aria-label="World progress">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#587066]">World progress</p>
                <p className="mt-1 text-3xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                  {completedCount}<span className="text-lg font-semibold text-[#8aa398]">/{totalPuzzles}</span>
                </p>
              </div>
              <span className="rounded-full bg-[#e8f4f8] px-3 py-1 text-sm font-bold text-[#236b77]">{completionPercent}%</span>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e8f4f8]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercent} aria-label={`${completionPercent}% of puzzles completed`}>
              <div className="h-full rounded-full bg-[#6ba547] transition-[width] duration-500" style={{ width: `${completionPercent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-5 text-[#6b7f77]">No sign-in, ads or cloud profile. Progress stays with this browser.</p>
          </section>
        </header>

        <section aria-labelledby="regions-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#6b9a78]">Choose your next station</p>
              <h2 id="regions-heading" className="mt-1 text-2xl font-bold sm:text-3xl" style={{ fontFamily: 'var(--font-display)' }}>
                Five ways to think
              </h2>
            </div>
            <p className="hidden max-w-xs text-right text-sm leading-6 text-[#6b7f77] sm:block">Each region introduces a different kind of puzzle. Take your time.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {puzzleRegions.map((region, index) => {
              const unlocked = isRegionUnlocked(region.id)
              return (
                <button
                  key={region.id}
                  type="button"
                  onClick={() => unlocked && navigate(`/region/${region.id}`)}
                  disabled={!unlocked}
                  aria-label={unlocked ? `Open ${region.name}` : `${region.name} is locked`}
                  className={`group rounded-3xl border p-4 text-left shadow-[0_12px_30px_rgba(24,51,43,0.08)] transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#7fc3d4]/60 sm:p-5 ${
                    unlocked
                      ? 'border-[#c8dfcf] bg-white hover:-translate-y-1 hover:border-[#6ba547] hover:shadow-[0_18px_38px_rgba(45,80,22,0.15)]'
                      : 'cursor-not-allowed border-[#d9e1dc] bg-[#eef2ef] opacity-65'
                  }`}
                >
                  <div className={`relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${region.palette}`}>
                    <div className="absolute inset-0 opacity-20" aria-hidden="true" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 0 2px, transparent 3px), radial-gradient(circle at 80% 70%, white 0 2px, transparent 3px)', backgroundSize: '28px 28px' }} />
                    <span aria-hidden="true" className="relative text-6xl drop-shadow-md transition-transform duration-300 group-hover:scale-110">{region.emoji}</span>
                    <span className="absolute left-3 top-3 rounded-full bg-black/20 px-2.5 py-1 text-xs font-bold text-white backdrop-blur-sm">Station {index + 1}</span>
                    {!unlocked && <span className="absolute right-3 top-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-bold text-[#50645b]">Locked</span>}
                  </div>
                  <div className="px-1 pb-1 pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>{region.name}</h3>
                      <span aria-hidden="true" className="text-lg text-[#6b9a78]">{unlocked ? '↗' : '•'}</span>
                    </div>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-[#587066]">{region.tagline}</p>
                    <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[#6b9a78]">{region.skill}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <footer className="mt-10 border-t border-[#dce9df] pt-5 text-center text-sm text-[#6b7f77]">
          Small puzzles. Gentle retries. A growing world of ways to notice.
        </footer>
      </div>
    </main>
  )
}
