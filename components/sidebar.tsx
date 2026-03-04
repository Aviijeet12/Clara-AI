'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, BarChart3, Upload, Clock } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Accounts', href: '/accounts', icon: BarChart3 },
  { name: 'Upload Transcript', href: '/upload', icon: Upload },
  { name: 'Version History', href: '/history', icon: Clock },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-gradient-to-b from-card to-card/95 px-6 py-8 flex flex-col">
      {/* Logo */}
      <div className="mb-12">
        <div className="text-2xl font-bold text-foreground">
          <span className="text-accent">Clara</span> AI
          <div className="text-xs font-semibold text-muted-foreground mt-2">
            <span className="inline-block bg-accent/10 px-2 py-1 rounded text-accent">Call Automation</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-accent text-accent-foreground shadow-md'
                  : 'text-foreground/70 hover:text-foreground hover:bg-secondary'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">v1.0.0</p>
      </div>
    </div>
  )
}
