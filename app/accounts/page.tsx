'use client'

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle, ArrowRight, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import type { AccountListItem } from '@/lib/types'

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<AccountListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/accounts')
      const json = await res.json()
      if (!res.ok) {
        setError(json.message || 'Failed to load accounts')
        return
      }
      setAccounts(json.accounts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar />
      <Topbar />

      <main className="ml-64 pt-24 pb-12 px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Accounts
              </h1>
              <p className="text-muted-foreground">
                Browse all processed accounts and their versions
              </p>
            </div>
            <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/upload">+ New Upload</Link>
            </Button>
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
              <p className="text-muted-foreground">Loading accounts...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <Card className="p-4 border border-red-500/50 bg-red-500/10 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-500 font-semibold text-sm">Error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </Card>
          )}

          {/* Empty State */}
          {!loading && !error && accounts.length === 0 && (
            <Card className="p-16 border border-border/50 bg-card/50 text-center">
              <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">
                No Accounts Yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Upload a transcript to create your first account
              </p>
              <Button asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/upload">Upload Transcript</Link>
              </Button>
            </Card>
          )}

          {/* Accounts Grid */}
          {!loading && accounts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {accounts.map((account) => (
                <Link
                  key={account.accountId}
                  href={`/accounts/${account.accountId}`}
                  className="group"
                >
                  <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/10">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                        {account.accountId}
                      </h3>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </div>
                    <div className="flex gap-2 mb-4">
                      {account.versions.map((v) => (
                        <Badge key={v} variant="secondary" className="text-xs">
                          v{v}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge
                        variant="secondary"
                        className={
                          account.latestType === 'demo'
                            ? 'bg-blue-600/20 text-blue-700 dark:text-blue-400'
                            : 'bg-green-600/20 text-green-700 dark:text-green-400'
                        }
                      >
                        {account.latestType}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(account.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
