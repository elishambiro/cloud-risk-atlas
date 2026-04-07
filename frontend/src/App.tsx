import { Suspense, lazy } from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import { ErrorBoundary } from './components/shared/ErrorBoundary'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const GraphView = lazy(() => import('./pages/GraphView'))
const Findings = lazy(() => import('./pages/Findings'))
const AttackPaths = lazy(() => import('./pages/AttackPaths'))
const ScanHistory = lazy(() => import('./pages/ScanHistory'))

function RouteFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-sm text-gray-500">Loading view...</div>
    </div>
  )
}

export default function App() {
  return (
    <div className="flex h-full bg-gray-950">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <TopBar />
        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/graph" element={<GraphView />} />
                <Route path="/findings" element={<Findings />} />
                <Route path="/attack-paths" element={<AttackPaths />} />
                <Route path="/history" element={<ScanHistory />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
