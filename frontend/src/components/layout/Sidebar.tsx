import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  ShieldAlert,
  Swords,
  History,
  Shield,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSelectedScan } from '../../hooks/useSelectedScan'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/graph', icon: Network, label: 'Graph' },
  { to: '/findings', icon: ShieldAlert, label: 'Findings' },
  { to: '/attack-paths', icon: Swords, label: 'Attack Paths' },
  { to: '/history', icon: History, label: 'History' },
]

export default function Sidebar() {
  const location = useLocation()
  const { selectedScanId } = useSelectedScan()

  const buildNavTarget = (to: string) => {
    const params = new URLSearchParams(location.search)
    if (selectedScanId) {
      params.set('scan', selectedScanId)
    } else {
      params.delete('scan')
    }
    const search = params.toString()
    return search ? `${to}?${search}` : to
  }

  return (
    <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white leading-tight">Cloud Risk Atlas</p>
          <p className="text-xs text-gray-500">AWS Security Posture</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={buildNavTarget(to)}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-800">
        <p className="text-xs text-gray-600">v0.1.0</p>
      </div>
    </aside>
  )
}
