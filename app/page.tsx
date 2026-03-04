'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { StatsCards } from '@/components/stats-cards'
import { Card } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import type { HistoryEntry } from '@/lib/types'

export default function Dashboard() {
  const [recentActivity, setRecentActivity] = useState<HistoryEntry[]>([])

  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await fetch('/api/history')
        const json = await res.json()
        setRecentActivity((json.history || []).slice(0, 5))
      } catch { /* keep empty */ }
    }
    loadActivity()
  }, [])

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar />
      <Topbar />

      {/* Main content */}
      <main className="ml-64 pt-24 pb-12 px-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground">
              Welcome back! Here's your call automation overview.
            </p>
          </div>

          {/* Stats Cards */}
          <StatsCards />

          {/* Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Link href="/upload" className="group cursor-pointer">
              <Card className="p-8 border border-border/50 bg-gradient-to-br from-accent/10 to-accent/5 backdrop-blur-sm hover:border-accent/50 transition-all duration-300 h-full hover:shadow-lg hover:shadow-accent/20">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="text-4xl mb-4">📤</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Upload Transcript
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Add new call transcripts for processing
                    </p>
                  </div>
                  <div className="flex items-center text-accent group-hover:translate-x-2 transition-transform mt-4">
                    <span className="text-sm font-semibold">Get Started</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/history" className="group cursor-pointer">
              <Card className="p-8 border border-border/50 bg-gradient-to-br from-blue-600/20 dark:from-blue-500/10 to-blue-600/10 dark:to-blue-500/5 backdrop-blur-sm hover:border-blue-600/50 dark:hover:border-blue-500/50 transition-all duration-300 h-full hover:shadow-lg hover:shadow-blue-600/20 dark:hover:shadow-blue-500/20">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="text-4xl mb-4">📜</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Version History
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Track all changes and revisions
                    </p>
                  </div>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:translate-x-2 transition-transform mt-4">
                    <span className="text-sm font-semibold">View Details</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/accounts" className="group cursor-pointer">
              <Card className="p-8 border border-border/50 bg-gradient-to-br from-green-600/20 dark:from-green-500/10 to-green-600/10 dark:to-green-500/5 backdrop-blur-sm hover:border-green-600/50 dark:hover:border-green-500/50 transition-all duration-300 h-full hover:shadow-lg hover:shadow-green-600/20 dark:hover:shadow-green-500/20">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">
                      Manage Accounts
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Review account details and specs
                    </p>
                  </div>
                  <div className="flex items-center text-green-600 dark:text-green-400 group-hover:translate-x-2 transition-transform mt-4">
                    <span className="text-sm font-semibold">Browse</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {/* Recent Activity */}
          <Card className="p-8 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-foreground mb-6">
              Recent Activity
            </h3>
            <div className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-sm">No activity yet. Upload a transcript to get started.</p>
              ) : (
                recentActivity.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between pb-4 border-b border-border/30 last:border-b-0 last:pb-0">
                    <div>
                      <p className="text-foreground font-medium">
                        {entry.accountId} — {entry.type === 'demo' ? 'Demo processed' : `Onboarding v${entry.version}`}
                        {entry.changesCount > 0 && ` (${entry.changesCount} changes)`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{timeAgo(entry.createdAt)}</p>
                    </div>
                    <span className="text-2xl">{entry.type === 'demo' ? '📤' : '🔄'}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
