'use client'

import { useState, useEffect, use } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { JsonViewer } from '@/components/json-viewer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, Loader2, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AccountDataResponse, ChangelogEntry } from '@/lib/types'

export default function AccountDetailPage({
  params,
}: {
  params: Promise<{ accountId: string }>
}) {
  const { accountId } = use(params)
  const [data, setData] = useState<AccountDataResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<number>(0)

  useEffect(() => {
    fetchAccountData()
  }, [accountId])

  const fetchAccountData = async (version?: number) => {
    setLoading(true)
    setError(null)
    try {
      const url = version
        ? `/api/account/${accountId}?version=${version}`
        : `/api/account/${accountId}`
      const res = await fetch(url)
      const json = await res.json()

      if (!res.ok) {
        setError(json.message || 'Failed to load account data')
        return
      }

      setData(json)
      setSelectedVersion(json.currentVersion)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const handleVersionChange = (version: number) => {
    setSelectedVersion(version)
    fetchAccountData(version)
  }

  if (loading) {
    return (
      <div className="bg-background text-foreground min-h-screen">
        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-24 pb-12 px-8 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading account data...</p>
          </div>
        </main>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-background text-foreground min-h-screen">
        <Sidebar />
        <Topbar />
        <main className="ml-64 pt-24 pb-12 px-8">
          <Card className="max-w-lg mx-auto p-8 border border-red-500/50 bg-red-500/10 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-foreground mb-2">Error Loading Account</h3>
            <p className="text-red-400 mb-6">{error || 'Unknown error'}</p>
            <div className="flex gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/accounts">Back to Accounts</Link>
              </Button>
              <Button onClick={() => fetchAccountData()} className="bg-accent text-accent-foreground">
                Retry
              </Button>
            </div>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar />
      <Topbar />

      <main className="ml-64 pt-24 pb-12 px-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <Link
                href="/accounts"
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Accounts
              </Link>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {accountId}
              </h1>
              <p className="text-muted-foreground">
                {data.memo.company_name || 'Account'} —{' '}
                {data.versions.length} version{data.versions.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Version Toggle */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 border-border/50">
                  v{selectedVersion}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {data.versions.map((v) => (
                  <DropdownMenuItem
                    key={v}
                    onClick={() => handleVersionChange(v)}
                    className={v === selectedVersion ? 'bg-accent/10' : ''}
                  >
                    v{v}
                    {v === Math.max(...data.versions) && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        latest
                      </Badge>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Status Bar */}
          <div className="flex gap-3 flex-wrap">
            <Badge className="bg-accent/10 text-accent border-accent/30">
              v{selectedVersion}
            </Badge>
            <Badge variant="secondary">
              {data.memo.type}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-green-600/20 text-green-700 dark:text-green-400"
            >
              {data.memo.status}
            </Badge>
            {data.memo.questions_or_unknowns.length > 0 && (
              <Badge
                variant="secondary"
                className="bg-amber-600/20 text-amber-700 dark:text-amber-400"
              >
                {data.memo.questions_or_unknowns.length} unknown{data.memo.questions_or_unknowns.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Account Memo */}
            <JsonViewer title={`Account Memo (v${selectedVersion})`} data={data.memo} />

            {/* Retell Agent Spec */}
            <JsonViewer
              title={`Retell Agent Spec (v${selectedVersion})`}
              data={data.retellSpec}
            />
          </div>

          {/* Questions / Unknowns */}
          {data.memo.questions_or_unknowns.length > 0 && (
            <Card className="p-6 border border-amber-500/30 bg-amber-500/5 backdrop-blur-sm">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                ⚠️ Questions / Unknowns
              </h3>
              <ul className="space-y-2">
                {data.memo.questions_or_unknowns.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-amber-500 font-bold mt-0.5">?</span>
                    <span className="text-foreground/80">{q}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Changelog */}
          {data.changelog && (
            <Card className="p-8 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Changelog
              </h3>
              <p className="text-muted-foreground mb-6">
                v{data.changelog.from_version} → v{data.changelog.to_version} · {data.changelog.total_changes} change{data.changelog.total_changes !== 1 ? 's' : ''}
              </p>

              <div className="space-y-2 bg-secondary/30 rounded-lg p-4">
                {data.changelog.changes.map((change: ChangelogEntry, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 text-sm">
                    <span
                      className={`font-mono font-semibold px-2 py-1 rounded text-xs ${
                        change.change_type === 'added'
                          ? 'bg-green-600/20 dark:bg-green-500/20 text-green-700 dark:text-green-400'
                          : change.change_type === 'updated'
                          ? 'bg-blue-600/20 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400'
                          : 'bg-red-600/20 dark:bg-red-500/20 text-red-700 dark:text-red-400'
                      }`}
                    >
                      {change.change_type === 'added'
                        ? '+'
                        : change.change_type === 'updated'
                        ? '~'
                        : '-'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-purple-600 dark:text-purple-400 font-mono">
                        {change.path}
                      </span>
                      <span className="text-foreground/70">: </span>
                      {change.old_value !== null && change.old_value !== undefined && (
                        <>
                          <span className="text-red-600 dark:text-red-400 line-through">
                            {JSON.stringify(change.old_value)}
                          </span>
                          <span className="text-foreground/70"> → </span>
                        </>
                      )}
                      <span className="text-green-600 dark:text-green-400">
                        {JSON.stringify(change.new_value)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
