'use client'

import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface JsonViewerProps {
  title: string
  data: Record<string, any>
}

export function JsonViewer({ title, data }: JsonViewerProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const JsonLine = ({ children, indent = 0 }: { children: React.ReactNode, indent?: number }) => (
    <div style={{ marginLeft: `${indent * 1.5}rem` }} className="text-sm font-mono">
      {children}
    </div>
  )

  const renderJson = (obj: any, indent = 0): React.ReactNode => {
    if (obj === null) return <span className="text-red-500 dark:text-red-400">null</span>
    if (typeof obj === 'boolean') return <span className="text-blue-600 dark:text-blue-400">{obj ? 'true' : 'false'}</span>
    if (typeof obj === 'number') return <span className="text-amber-600 dark:text-amber-400">{obj}</span>
    if (typeof obj === 'string') return <span className="text-green-600 dark:text-green-400">"{obj}"</span>
    
    if (Array.isArray(obj)) {
      if (obj.length === 0) return <span className="text-foreground/70">[]</span>
      return (
        <div>
          <span className="text-foreground/70">[</span>
          {obj.map((item, i) => (
            <JsonLine key={i} indent={indent + 1}>
              {renderJson(item, indent + 1)}
              {i < obj.length - 1 && <span className="text-foreground/70">,</span>}
            </JsonLine>
          ))}
          <JsonLine indent={indent}>
            <span className="text-foreground/70">]</span>
          </JsonLine>
        </div>
      )
    }

    if (typeof obj === 'object') {
      const keys = Object.keys(obj)
      if (keys.length === 0) return <span className="text-foreground/70">{'{}'}</span>
      return (
        <div>
          <span className="text-foreground/70">{'{'}</span>
          {keys.map((key, i) => (
            <JsonLine key={key} indent={indent + 1}>
              <span className="text-purple-600 dark:text-purple-400">"{key}"</span>
              <span className="text-foreground/70">: </span>
              {renderJson(obj[key], indent + 1)}
              {i < keys.length - 1 && <span className="text-foreground/70">,</span>}
            </JsonLine>
          ))}
          <JsonLine indent={indent}>
            <span className="text-foreground/70">{'}'}</span>
          </JsonLine>
        </div>
      )
    }

    return <span className="text-foreground">{String(obj)}</span>
  }

  return (
    <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-xs">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span className="text-xs">Copy</span>
            </>
          )}
        </Button>
      </div>
      <div className="bg-secondary/50 rounded-lg p-4 overflow-x-auto">
        <pre className="text-sm leading-relaxed text-foreground/90">
          {renderJson(data)}
        </pre>
      </div>
    </Card>
  )
}
