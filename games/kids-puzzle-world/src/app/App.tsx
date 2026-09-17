import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import WorldMap from './screens/WorldMap'
import RegionScreen from './screens/RegionScreen'
import PuzzleScreen from './screens/PuzzleScreen'

const ScenarioLab = lazy(() => import('@/dev/scenario-lab/ScenarioLab'))

const isDev = (import.meta as any).env.DEV || (import.meta as any).env.VITE_ENABLE_DEV_TOOLS

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WorldMap />} />
      <Route path="/region/:regionId" element={<RegionScreen />} />
      <Route path="/puzzle/:regionId/:levelId" element={<PuzzleScreen />} />

      {isDev && (
        <Route
          path="/dev/scenario-lab"
          element={
            <Suspense fallback={<div className="w-full h-screen flex items-center justify-center">Loading Scenario Lab...</div>}>
              <ScenarioLab />
            </Suspense>
          }
        />
      )}
    </Routes>
  )
}
