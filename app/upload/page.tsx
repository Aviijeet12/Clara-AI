'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

const DEMO_TRANSCRIPT = `Hi, my name is John Smith and I run Smith's Plumbing Solutions. We've been in business for 12 years. Our company has 8 employees. Our industry is residential and commercial plumbing.

Business hours are Monday through Friday, 8:00 AM to 5:00 PM Central time. We also take emergency calls 24/7.

Services offered are: drain cleaning, pipe repair, water heater installation, emergency plumbing, bathroom remodeling.

We serve the greater Denver metro area. Our pricing model is hourly rate plus materials. The average job value is $350. Our busiest season is winter because of frozen pipe emergencies.

An emergency is defined as: flooding, burst pipes, sewage backup, gas leak smell near plumbing, no hot water in winter.

For emergencies, the emergency contact is John Smith at 303-555-0199. He is the primary on-call technician. If he's unavailable, try Mike the senior tech at 303-555-0198. Fallback: leave a voicemail and we guarantee a callback within 15 minutes.

Non-emergency calls should be routed to the office during business hours. Take the caller's name, number, and a brief description, then schedule a callback or appointment.

If a transfer fails, say: "I apologize, I'm unable to connect you right now. Can I take your name and number so we can call you back within 30 minutes?"

Integration constraints: never create jobs for sprinkler systems in our system, those go to a separate contractor.

Our goal is to book more service appointments and reduce missed calls. Our tone should be friendly and professional. Greeting style: "Thanks for calling Smith's Plumbing, how can we help you today?"

Key selling points are: 24/7 emergency service, licensed and insured, free estimates, same-day service available.

Common objections include: pricing concerns, availability questions, warranty coverage.

We use ServiceTitan as our CRM. Our scheduling tool is Housecall Pro. Payment processor is Square. We also use QuickBooks for accounting.

My phone is 303-555-0147. Email is john@smithplumbing.com. Website is smithplumbing.com. Our address is 1234 Main Street, Denver, CO 80202.

Follow-up procedure: call customer within 24 hours after service completion. Note: we offer a 10% discount for first-time customers.`

const ONBOARDING_TRANSCRIPT = `This is the onboarding call for Smith's Plumbing Solutions. After reviewing the demo setup, here are some updates.

The owner's name is John Michael Smith. The business name is Smith's Premium Plumbing Solutions — they've rebranded recently.

They now have 12 employees, up from 8. They've expanded their service area to include Boulder and Fort Collins in addition to the Denver metro area.

Business hours are now Monday through Saturday, 7:00 AM to 6:00 PM Mountain time.

Services offered are: drain cleaning, pipe repair, water heater installation, emergency plumbing, bathroom remodeling, kitchen plumbing, sewer line repair, water filtration systems.

Emergency definition now also includes: frozen pipes and water heater failure.

The emergency contact is still John Smith at 303-555-0199, but they added a second on-call: Sarah Johnson, dispatch manager, at 303-555-0200. If both are unavailable, page the after-hours answering service at 303-555-0300.

Their average job value has increased to $475. The pricing model is now flat-rate pricing for standard jobs plus hourly for complex work.

Scheduling preferences: they want to offer online booking and prefer morning appointment slots.

They switched their CRM to Jobber. Payment processor is now Stripe. They also use Google Calendar and Zapier as other tools.

Tone should be warm and confident. The call objective is to convert inbound calls into booked appointments with a focus on upselling maintenance plans.

Key selling points are: 24/7 emergency service, licensed and insured, free estimates, same-day service available, satisfaction guarantee, flexible financing options.

Note: they want the AI agent to always mention their current promotion — $50 off any service over $200 for new customers.`

export default function UploadPage() {
  const router = useRouter()
  const [transcriptType, setTranscriptType] = useState<'demo' | 'onboarding'>('demo')
  const [accountId, setAccountId] = useState('')
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    version?: number
    files?: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleProcess = async () => {
    if (!accountId.trim()) {
      setError('Please enter an Account ID')
      return
    }
    if (!transcript.trim()) {
      setError('Please enter or paste a transcript')
      return
    }

    setError(null)
    setResult(null)
    setIsProcessing(true)

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: accountId.trim(),
          transcript: transcript.trim(),
          type: transcriptType,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Processing failed')
        return
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsProcessing(false)
    }
  }

  const loadDemoTranscript = () => {
    setTranscript(transcriptType === 'demo' ? DEMO_TRANSCRIPT : ONBOARDING_TRANSCRIPT)
    if (!accountId) setAccountId('smith-plumbing')
  }

  const resetForm = () => {
    setTranscript('')
    setAccountId('')
    setResult(null)
    setError(null)
  }

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Sidebar />
      <Topbar />

      <main className="ml-64 pt-24 pb-12 px-8">
        <div className="max-w-3xl space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Upload Transcript
            </h1>
            <p className="text-muted-foreground">
              Paste a call transcript to extract structured data and generate agent specs
            </p>
          </div>

          {/* Success State */}
          {result?.success ? (
            <Card className="p-12 border border-border/50 bg-gradient-to-br from-green-600/20 dark:from-green-500/10 to-green-600/10 dark:to-green-500/5 backdrop-blur-sm text-center">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-2">
                Processing Complete!
              </h3>
              <p className="text-muted-foreground mb-6">{result.message}</p>
              <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-muted-foreground mb-1">Account ID</p>
                <p className="text-foreground font-mono">{accountId}</p>
                <p className="text-sm text-muted-foreground mt-3 mb-1">Version</p>
                <p className="text-foreground">v{result.version}</p>
                <p className="text-sm text-muted-foreground mt-3 mb-1">Files Generated</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {result.files?.map((file) => (
                    <span
                      key={file}
                      className="text-xs font-mono bg-accent/10 text-accent px-2 py-1 rounded"
                    >
                      {file}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => router.push(`/accounts/${accountId}`)}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  View Account Details
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Upload Another
                </Button>
              </div>
            </Card>
          ) : (
            <>
              {/* Error Banner */}
              {error && (
                <Card className="p-4 border border-red-500/50 bg-red-500/10 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-500 font-semibold text-sm">Error</p>
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </Card>
              )}

              {/* Form */}
              <div className="space-y-6">
                {/* Account ID + Type */}
                <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Account ID
                      </label>
                      <Input
                        value={accountId}
                        onChange={(e) => setAccountId(e.target.value)}
                        placeholder="e.g., smith-plumbing"
                        className="bg-secondary border-border/50 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-foreground mb-3">
                        Transcript Type
                      </label>
                      <Select
                        value={transcriptType}
                        onValueChange={(v) => setTranscriptType(v as 'demo' | 'onboarding')}
                      >
                        <SelectTrigger className="bg-secondary border-border/50 text-foreground">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="demo">Demo</SelectItem>
                          <SelectItem value="onboarding">Onboarding</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-2">
                        {transcriptType === 'demo'
                          ? 'Creates v1 — initial account setup from demo call'
                          : 'Creates v2+ — merges with existing data, generates changelog'}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Transcript */}
                <Card className="p-6 border border-border/50 bg-gradient-to-br from-card to-card/50 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-foreground">
                      Call Transcript
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={loadDemoTranscript}
                      className="text-accent hover:text-accent/80 text-xs"
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Load Example ({transcriptType})
                    </Button>
                  </div>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste the full call transcript here..."
                    rows={14}
                    className="w-full bg-secondary border border-border/50 rounded-lg p-4 text-foreground placeholder:text-muted-foreground text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {transcript.length > 0
                      ? `${transcript.length} characters · ${transcript.split(/\s+/).filter(Boolean).length} words`
                      : 'Paste a transcript or load an example to get started'}
                  </p>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                  <Button
                    onClick={handleProcess}
                    disabled={!accountId.trim() || !transcript.trim() || isProcessing}
                    className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Process Transcript
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border/50"
                    onClick={resetForm}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
