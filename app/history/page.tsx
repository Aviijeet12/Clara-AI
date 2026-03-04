'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, FolderOpen, Calendar, User, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { HistoryEntry } from '@/lib/types'

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/history')
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || 'Failed to load history')
        return
      }
      setHistory(json.history)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const uniqueAccounts = new Set(history.map((h) => h.accountId))

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar />
      <Topbar />

      <main className="ml-64 pt-24 pb-12 px-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Version History
            </h1>
            <p className="text-muted-foreground">
              Track all changes and revisions across accounts
            </p>
          </div>

          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading history...</p>
            </div>
          )}

          {!loading && history.length === 0 && (
            <Card className="p-16 border border-border/50 bg-card/50 text-center">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                No History Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Process a transcript to start tracking versions
              </p>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/upload">Upload Transcript</Link>
              </Button>
            </Card>
          )}

          {!loading && history.length > 0 && (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground mb-2">Total Versions</p>
                  <p className="text-3xl font-bold text-foreground">{history.length}</p>
                  <p className="text-xs text-muted-foreground mt-2">All time</p>
                </Card>
                <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground mb-2">Total Changes</p>
                  <p className="text-3xl font-bold text-foreground">
                    {history.reduce((sum, h) => sum + h.changesCount, 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Fields modified</p>
                </Card>
                <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                  <p className="text-sm text-muted-foreground mb-2">Accounts</p>
                  <p className="text-3xl font-bold text-foreground">
                    {uniqueAccounts.size}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">Tracked</p>
                </Card>
              </div>

              {/* Version Timeline */}
              <Card className="border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm overflow-hidden">
                <div className="divide-y divide-border/30">
                  {history.map((entry) => (
                    <Link
                      key={entry.id}
                      href={`/accounts/${entry.accountId}`}
                      className="block p-6 hover:bg-secondary/30 transition-colors duration-200"
                    >
                      <div className="flex items-start justify-between gap-6">
                        {/* Left Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-lg font-bold text-accent">
                              v{entry.version}
                            </span>
                            <Badge
                              variant={entry.type === 'demo' ? 'secondary' : 'default'}
                              className={
                                entry.type === 'demo'
                                  ? 'bg-blue-600/20 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-600/30 dark:hover:bg-blue-500/30'
                                  : ''
                              }
                            >
                              {entry.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                              {entry.accountId}
                            </span>
                          </div>
                          <p className="text-foreground font-medium mb-2">
                            {entry.type === 'demo'
                              ? 'Initial account setup from demo transcript'
                              : `Onboarding update — ${entry.changesCount} field${entry.changesCount !== 1 ? 's' : ''} changed`}
                          </p>
                        </div>

                        {/* Right Content */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            {new Date(entry.createdAt).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileText className="w-4 h-4" />
                            {entry.changesCount > 0
                              ? `${entry.changesCount} changes`
                              : 'Initial version'}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
