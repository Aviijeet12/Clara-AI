'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'

interface StatsData {
  totalAccounts: number
  totalVersions: number
  demoCount: number
  onboardingCount: number
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData>({
    totalAccounts: 0,
    totalVersions: 0,
    demoCount: 0,
    onboardingCount: 0,
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const [accountsRes, historyRes] = await Promise.all([
          fetch('/api/accounts'),
          fetch('/api/history'),
        ])
        const accountsJson = await accountsRes.json()
        const historyJson = await historyRes.json()

        const accounts = accountsJson.accounts || []
        const history = historyJson.history || []

        setStats({
          totalAccounts: accounts.length,
          totalVersions: history.length,
          demoCount: history.filter((h: any) => h.type === 'demo').length,
          onboardingCount: history.filter((h: any) => h.type === 'onboarding').length,
        })
      } catch {
        // keep defaults
      }
    }
    loadStats()
  }, [])

  const statItems = [
    {
      title: 'Total Accounts',
      value: stats.totalAccounts.toString(),
      icon: '📊',
    },
    {
      title: 'Total Versions',
      value: stats.totalVersions.toString(),
      icon: '📄',
    },
    {
      title: 'Demo Processed',
      value: stats.demoCount.toString(),
      icon: '✅',
    },
    {
      title: 'Onboarding Processed',
      value: stats.onboardingCount.toString(),
      icon: '🚀',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map((stat, index) => (
        <Card
          key={index}
          className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm hover:border-border/80 transition-all duration-300 hover:shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground font-medium mb-2">
                {stat.title}
              </p>
              <h3 className="text-3xl font-bold text-foreground">
                {stat.value}
              </h3>
            </div>
            <div className="text-4xl">{stat.icon}</div>
          </div>
        </Card>
      ))}
    </div>
  )
}
