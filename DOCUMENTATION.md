# Clara AI — Call Automation Pipeline — Project Documentation

## Table of Contents

1. [What This Project Does](#what-this-project-does)
2. [Architecture Overview](#architecture-overview)
3. [Tech Stack](#tech-stack)
4. [How It Works — End-to-End Flow](#how-it-works--end-to-end-flow)
5. [File & Folder Structure](#file--folder-structure)
6. [API Reference](#api-reference)
7. [Business Logic Deep Dive](#business-logic-deep-dive)
8. [How to Run the Project](#how-to-run-the-project)
9. [Step-by-Step Usage Guide](#step-by-step-usage-guide)
10. [Presentation Guide — How to Showcase](#presentation-guide--how-to-showcase)

---

## What This Project Does

This is a **zero-cost AI Call Automation Pipeline** for Clara Answers. It processes **call transcripts** (from sales demos and onboarding calls) and automatically:

1. **Extracts structured business data** from unstructured text transcripts
2. **Generates an Account Memo** — a JSON document with all required spec fields
3. **Generates a Retell AI Agent Spec** — a configuration file for an AI phone agent
4. **Supports versioning** — demo creates v1, onboarding creates v2 by merging with v1
5. **Tracks changes** — a changelog shows exactly what fields were added/updated between versions
6. **Never overwrites** — v1 is preserved; onboarding creates a new v2 alongside it
7. **Is idempotent** — running demo twice for the same account returns a 409 conflict

### Real-World Context

Clara Answers is an AI-powered voice agent built using Retell. It handles inbound calls for service trade businesses (fire protection, sprinkler/alarm contractors, electrical, HVAC, facility maintenance). Each client has different workflows, escalation paths, and business rules.

The pipeline automates the client journey:
- A **demo call** captures initial info about the business → generates v1 config
- An **onboarding call** refines and updates that info → generates v2 config
- The dashboard lets the team review, compare, and manage all account configurations

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌────────┐│
│  │Dashboard │  │ Upload   │  │ Accounts  │  │History ││
│  │  Page    │  │  Page    │  │  List +   │  │  Page  ││
│  │          │  │          │  │  Detail   │  │        ││
│  └──────────┘  └────┬─────┘  └─────┬─────┘  └───┬────┘│
│                     │              │             │      │
└─────────────────────┼──────────────┼─────────────┼──────┘
                      │              │             │
              ┌───────▼──────────────▼─────────────▼──────┐
              │              API ROUTES                     │
              │                                            │
              │  POST /api/process     — process transcript│
              │  GET  /api/accounts    — list all accounts │
              │  GET  /api/account/:id — get account data  │
              │  GET  /api/history     — version history   │
              └───────────────┬────────────────────────────┘
                              │
              ┌───────────────▼────────────────────────────┐
              │           BUSINESS LOGIC (lib/)             │
              │                                            │
              │  engine.ts  — extract, merge, generate     │
              │  storage.ts — file read/write operations   │
              │  types.ts   — TypeScript type definitions  │
              └───────────────┬────────────────────────────┘
                              │
              ┌───────────────▼────────────────────────────┐
              │    LOCAL FILE STORAGE (outputs/accounts/)   │
              │                                            │
              │  outputs/accounts/                         │
              │    smith-plumbing/                          │
              │      v1/                                    │
              │        account_memo.json  ← account memo v1│
              │        retell_agent.json  ← agent spec v1  │
              │      v2/                                    │
              │        account_memo.json  ← account memo v2│
              │        retell_agent.json  ← agent spec v2  │
              │      changelog.json       ← diff v1 → v2   │
              └────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer       | Technology                   | Cost | Why                                      |
|-------------|------------------------------|------|------------------------------------------|
| Framework   | Next.js 16 (App Router)      | $0   | Full-stack React with API routes         |
| Language    | TypeScript (strict mode)     | $0   | Type safety, better DX                   |
| Styling     | TailwindCSS + shadcn/ui      | $0   | Utility-first, accessible UI components  |
| Storage     | Local JSON files (fs/promises)| $0  | No database needed, simple persistence   |
| Extraction  | Regex pattern matching       | $0   | Zero-cost alternative to LLM extraction  |
| Orchestrator| Next.js API routes           | $0   | Equivalent to n8n, simpler setup         |
| Package Mgr | pnpm                         | $0   | Fast, disk-efficient                     |

**Total cost: $0** — No paid APIs, no database subscriptions, no LLM credits.

---

## How It Works — End-to-End Flow

### Flow 1: Demo Transcript → v1 (Pipeline A)

```
User pastes transcript  →  POST /api/process (type: "demo")
                                    │
                    Idempotency check (409 if v1 exists)
                                    │
                    extractStructuredData(transcript)
                          │                    │
                    AccountMemo v1      RetellAgentSpec v1
                          │                    │
                    Save v1/account_memo.json  Save v1/retell_agent.json
                          │       (in outputs/accounts/{id}/)
                    Return success + redirect to account page
```

**What happens internally:**

1. `extractStructuredData()` in `lib/engine.ts` uses **regex pattern matching** to find:
   - Business info: company name, owner, phone, email, address, industry
   - Business hours: days, start, end, timezone
   - Services supported as a list
   - Emergency definition (triggers)
   - Emergency routing rules (contact chain, phones, roles, fallback)
   - Call transfer rules (timeout, retries, failure message)
   - Integration constraints
   - After-hours flow summary
   - Office hours flow summary
   - Tech stack: CRM, scheduling tool, payment processor
2. Creates an `AccountMemo` object with all required spec fields
3. If a critical field can't be extracted, it's added to `questions_or_unknowns`
4. `generateRetellSpec()` generates an AI agent configuration with:
   - System prompt with office hours flow (9-step) and after hours flow (6-step)
   - Transfer protocol and fallback protocol
   - "IMPORTANT RULES" (never mention function calls, don't ask too many questions)
   - Tool invocation placeholders (schedule_appointment, collect_customer_info, transfer_call, log_emergency)
   - Key variables (timezone, business hours, address, emergency routing, services)
5. Both are saved as JSON files under `outputs/accounts/{accountId}/`

### Flow 2: Onboarding Transcript → v2 (Pipeline B)

```
User pastes transcript  →  POST /api/process (type: "onboarding")
                                    │
                    Load existing v1/account_memo.json
                          │
                    extractStructuredData(transcript)
                          │
                    mergeAccountData(v1, newData)
                          │                    │
                    AccountMemo v2      RetellAgentSpec v2
                          │                    │
                    generateChangelog(v1, v2)
                          │
                    Save v2/account_memo.json, v2/retell_agent.json, changelog.json
                    (all in outputs/accounts/{id}/)
```

**Key merge rules:**
- v1 is **never** overwritten
- Only fields **explicitly mentioned** in the onboarding transcript override v1 values
- Empty/null fields in the new extraction are **ignored** (won't blank out v1 data)
- Any fields that couldn't be extracted are added to `questions_or_unknowns`
- The changelog records every single field that changed, was added, or was removed

---

## File & Folder Structure

```
project-root/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with fonts, metadata
│   ├── page.tsx                  # Dashboard (home page, live stats)
│   ├── upload/
│   │   └── page.tsx              # Upload transcript page (main input)
│   ├── accounts/
│   │   ├── page.tsx              # Accounts list page
│   │   └── [accountId]/
│   │       └── page.tsx          # Account detail (JSON viewer, changelog)
│   ├── history/
│   │   └── page.tsx              # Version history timeline
│   └── api/                      # Backend API routes
│       ├── process/route.ts      # POST — process transcript
│       ├── accounts/route.ts     # GET — list all accounts
│       ├── account/[accountId]/route.ts  # GET — account detail + versions
│       └── history/route.ts      # GET — version history
│
├── lib/                          # Core business logic
│   ├── types.ts                  # All TypeScript interfaces
│   │                             # AccountMemo, RetellAgentSpec, Changelog, etc.
│   ├── engine.ts                 # Extract, merge, generate, changelog functions
│   ├── storage.ts                # File system read/write (outputs/accounts/)
│   └── utils.ts                  # General utilities (cn, etc.)
│
├── components/                   # Reusable UI components
│   ├── sidebar.tsx               # Navigation sidebar (Clara AI branding)
│   ├── topbar.tsx                # Top bar (account nav, export button)
│   ├── stats-cards.tsx           # Dashboard statistics (live from API)
│   ├── json-viewer.tsx           # JSON syntax-highlighted viewer
│   └── ui/                       # shadcn/ui primitives
│
├── scripts/
│   └── batch-process.ts          # Batch process all 10 transcripts
│
├── workflows/
│   └── README.md                 # Workflow architecture documentation
│
├── sample-transcripts/           # 5 demo + 5 onboarding transcript files (legacy)
│   ├── demo-smith-plumbing.txt
│   └── ...
│
├── data/                          # Transcript files (submission format)
│   ├── demo_calls/
│   │   ├── demo-smith-plumbing.txt
│   │   ├── demo-bright-spark.txt
│   │   ├── demo-comfort-zone.txt
│   │   ├── demo-greenscape.txt
│   │   └── demo-clearview.txt
│   └── onboarding_calls/
│       ├── onboarding-smith-plumbing.txt
│       ├── onboarding-bright-spark.txt
│       ├── onboarding-comfort-zone.txt
│       ├── onboarding-greenscape.txt
│       └── onboarding-clearview.txt
│
├── outputs/accounts/             # Generated JSON output (per account, versioned)
│   ├── smith-plumbing/
│   │   ├── v1/
│   │   │   ├── account_memo.json   # Account Memo v1 (from demo)
│   │   │   └── retell_agent.json   # Retell Agent Spec v1
│   │   ├── v2/
│   │   │   ├── account_memo.json   # Account Memo v2 (from onboarding)
│   │   │   └── retell_agent.json   # Retell Agent Spec v2
│   │   └── changelog.json          # Diff v1 → v2
│   ├── bright-spark-electric/
│   ├── comfort-zone-hvac/
│   ├── greenscape-lawn/
│   └── clearview-windows/
│
├── README.md                     # Main README with setup + architecture
├── DOCUMENTATION.md              # This file — detailed project docs
├── package.json
├── tsconfig.json
└── next.config.mjs
```

---

## API Reference

### `POST /api/process`

Process a transcript and generate versioned output files.

**Request body:**
```json
{
  "accountId": "smith-plumbing",
  "transcript": "Hi, my name is John Smith...",
  "type": "demo"
}
```

**Response (201 — success):**
```json
{
  "success": true,
  "message": "Demo transcript processed successfully. v1 files created.",
  "accountId": "smith-plumbing",
  "version": 1,
  "files": ["v1/account_memo.json", "v1/retell_agent.json"]
}
```

**Response (409 — idempotency conflict):**
```json
{
  "success": false,
  "message": "Account \"smith-plumbing\" already has demo data (v1). Use type \"onboarding\" to update."
}
```

**Rules:**
- `type: "demo"` → creates v1 (initial setup). Returns 409 if v1 already exists (idempotent).
- `type: "onboarding"` → requires existing v1, creates v2 + changelog.
- Returns `400` if onboarding is attempted without a prior demo.

---

### `GET /api/accounts`

List all processed accounts.

**Response:**
```json
{
  "success": true,
  "accounts": [
    {
      "accountId": "smith-plumbing",
      "versions": [1, 2],
      "latestType": "onboarding",
      "updatedAt": "2026-03-04T10:30:00Z"
    }
  ]
}
```

---

### `GET /api/account/{accountId}?version=1`

Get full account data for a specific account and version.

**Response includes:** memo, retellSpec, changelog, all versions, all memos, all retell specs.

---

### `GET /api/history`

Get version history across all accounts.

**Response:** Array of history entries with account ID, version, type, timestamp, and change count.

---

## Business Logic Deep Dive

### `extractStructuredData()` — lib/engine.ts

The **core extraction function** that parses unstructured transcript text into structured data using **regex pattern matching** (no paid AI calls).

**How it works:**

```
Transcript text
      │
      ├── findValue(text, /regex1/, /regex2/)    → single string
      ├── findList(text, /regex/)                 → array of strings
      ├── findNumber(text, /regex/)               → number or null
      │
      ▼
AccountMemo object with all spec-required fields:
  - account_id, company_name
  - business_hours { days, start, end, timezone }
  - office_address
  - services_supported []
  - emergency_definition []
  - emergency_routing_rules [{ contact_name, phone, role, order, fallback }]
  - non_emergency_routing_rules
  - call_transfer_rules { timeout_seconds, max_retries, message_if_fails }
  - integration_constraints []
  - after_hours_flow_summary
  - office_hours_flow_summary
  - questions_or_unknowns []
  - notes
  + extended fields (owner_name, phone, email, website, industry, etc.)
```

If a critical field can't be extracted, it's added to `questions_or_unknowns` — **never hallucinated**.

### `mergeAccountData()` — lib/engine.ts

Deep-merges onboarding data into v1 data:
- Uses recursive object traversal
- Skips empty/null/undefined values from the new data (won't erase v1 data)
- Bumps version number automatically
- Combines `questions_or_unknowns` lists from both versions (deduplicated)

### `generateRetellSpec()` — lib/engine.ts

Converts an AccountMemo into a Retell AI agent configuration:

**System prompt includes:**
- Office Hours Flow (9-step): greeting → purpose → collect name/number → scheduling → transfer → fallback → confirm → "anything else?" → close
- After Hours Flow (6-step): greeting (inform closed) → check emergency → IF emergency: collect name/number/address, attempt dispatch chain, fallback → IF not emergency: take message, assure callback → "anything else?" → close
- Transfer Protocol: timeout, retries, failure message
- Fallback Protocol: apologize, collect info, assure callback
- IMPORTANT RULES: never mention function calls, don't ask too many questions, only collect what's needed

**Tools (hidden from caller):**
- `schedule_appointment` — book service appointment
- `collect_customer_info` — store caller contact details
- `transfer_call` — transfer to human representative
- `log_emergency` — log emergency dispatch request

### `generateChangelog()` — lib/engine.ts

Compares v1 and v2 by:
1. Flattening both objects into dot-path notation (`business_hours.timezone`)
2. Comparing every field value
3. Classifying changes as `added`, `updated`, or `removed`
4. Ignoring metadata fields (version, timestamps, type)

---

## How to Run the Project

### Prerequisites
- Node.js 18+ installed
- pnpm (or npm/yarn)

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start the development server
pnpm dev

# 3. Open in browser
# → http://localhost:3000
```

No database, no API keys, no environment variables needed.

### Batch Process All Transcripts

With the dev server running in another terminal:

```bash
npx tsx scripts/batch-process.ts
```

### Build for Production

```bash
pnpm build
pnpm start
```

---

## Step-by-Step Usage Guide

### Step 1: Process a Demo Transcript

1. Navigate to **Upload Transcript** (`/upload`)
2. Enter an Account ID (e.g., `smith-plumbing`)
3. Select type: **Demo**
4. Either paste a transcript or click **"Load Example (demo)"**
5. Click **"Process Transcript"**
6. See the success screen showing generated files: `v1/account_memo.json`, `v1/retell_agent.json`
8. Click **"View Account Details"**

### Step 2: Review Generated Data

On the Account Detail page (`/accounts/smith-plumbing`):
- **Left panel**: Account Memo — all extracted business data in JSON
- **Right panel**: Retell Agent Spec — AI agent configuration with system prompt
- **Copy JSON button**: copies formatted JSON to clipboard
- **Version dropdown**: shows available versions
- **Questions/Unknowns**: flags any missing data (no hallucination)

### Step 3: Process an Onboarding Transcript

1. Go back to **Upload Transcript**
2. Same Account ID: `smith-plumbing`
3. Select type: **Onboarding**
4. Paste/load the onboarding transcript
5. Click **"Process Transcript"**
6. Success screen shows: `v2/account_memo.json`, `v2/retell_agent.json`, `changelog.json`

### Step 4: Compare Versions

1. On the Account Detail page, use the **version toggle** (v1 ↔ v2)
2. Scroll down to see the **Changelog** section:
   - Green `+` = new field added
   - Blue `~` = field updated (shows old → new value)
   - Red `-` = field removed

### Step 5: Browse All Accounts

- **Accounts page** (`/accounts`) shows cards for every processed account
- **History page** (`/history`) shows a timeline of all versions across all accounts
- **Export** button in topbar downloads account data as JSON

---

## Presentation Guide — How to Showcase

### Opening (30 seconds)

> "This is a zero-cost AI Call Automation pipeline for Clara Answers. It takes raw call transcripts from demos and onboarding calls and automatically extracts structured business data, generates Retell AI agent configurations with proper prompt hygiene, and tracks changes across versions. No paid APIs, no database subscriptions — runs entirely locally."

### Live Demo Script (5 minutes)

#### 1. Show the Dashboard (~30s)
- Open `http://localhost:3000`
- Point out the navigation: Dashboard, Accounts, Upload, History
- "Live stats showing account count, version count, demo/onboarding breakdown"

#### 2. Process a Demo Transcript (~1 min)
- Go to Upload page
- Enter an account ID, select Demo type
- Click "Load Example" → "Process Transcript"
- "Two files generated — account memo v1 and Retell agent spec v1"

#### 3. Review the Output (~1 min)
- Click "View Account Details"
- Point out extracted data — business hours, emergency routing, services
- Switch to Retell Agent Spec
- "Notice the system prompt has office hours flow, after hours flow, transfer protocol — never mentions function calls to the caller"

#### 4. Process Onboarding (~1 min)
- Go back to Upload → switch to Onboarding → process it
- "v2 is created by merging onboarding with v1. The original v1 is preserved."

#### 5. Show the Changelog (~1 min)
- Scroll down on account detail page
- "Every field change tracked — business rebranded, hours expanded, new CRM, added services"
- Toggle between v1 and v2

#### 6. Show Batch Processing + History (~30s)
- "The batch script processes all 10 transcripts automatically"
- Show History page: "Complete audit trail across all accounts"
