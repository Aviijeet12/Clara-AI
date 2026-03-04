'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { ChevronDown, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface AccountSummary {
  accountId: string
  versions: number[]
  latestType: string
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountSummary[]>([])

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts')
        const json = await res.json()
        setAccounts(json.accounts || [])
      } catch { /* ignore */ }
    }
    loadAccounts()
  }, [])

  // Derive current account from URL
  const accountMatch = pathname.match(/\/accounts\/([^/]+)/)
  const currentAccountId = accountMatch ? accountMatch[1] : null
  const currentAccount = accounts.find((a) => a.accountId === currentAccountId)

  const handleExportAll = async () => {
    try {
      const res = await fetch('/api/accounts')
      const json = await res.json()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'clara-accounts-export.json'
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  const handleExportAccount = async (accountId: string) => {
    try {
      const res = await fetch(`/api/account/${accountId}`)
      const json = await res.json()
      const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${accountId}-export.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed top-0 left-64 right-0 z-30 border-b border-border/50 bg-gradient-to-r from-card/95 via-card/90 to-card/95 backdrop-blur-xl px-8 py-4 flex items-center justify-between shadow-sm">
      {/* Left section */}
      <div className="flex items-center gap-6">
        {/* Account Quick-Nav */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 text-foreground">
              {currentAccountId || 'Select Account'}
              <ChevronDown className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {accounts.length === 0 ? (
              <DropdownMenuItem disabled>No accounts yet</DropdownMenuItem>
            ) : (
              accounts.map((a) => (
                <DropdownMenuItem
                  key={a.accountId}
                  onClick={() => router.push(`/accounts/${a.accountId}`)}
                  className={a.accountId === currentAccountId ? 'bg-accent/10' : ''}
                >
                  {a.accountId}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    v{Math.max(...a.versions)}
                  </Badge>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Current account badge */}
        {currentAccount && (
          <Badge variant="secondary" className="bg-secondary text-foreground">
            <div className="w-2 h-2 rounded-full bg-accent mr-2"></div>
            {currentAccount.latestType}
          </Badge>
        )}

        {!currentAccountId && (
          <Badge variant="secondary" className="bg-secondary text-foreground text-xs">
            {accounts.length} account{accounts.length !== 1 ? 's' : ''} processed
          </Badge>
        )}
      </div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-3">
        {currentAccountId ? (
          <Button
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => handleExportAccount(currentAccountId)}
          >
            <Download className="w-4 h-4" />
            Export Account
          </Button>
        ) : (
          <Button
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleExportAll}
            disabled={accounts.length === 0}
          >
            <Download className="w-4 h-4" />
            Export All
          </Button>
        )}
      </div>
    </div>
  )
}
