# Clara AI — Call Automation Pipeline

> Zero-cost automation pipeline: Demo Call → Retell Agent Draft → Onboarding Updates → Agent Revision

## Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  TRANSCRIPT INPUT                                           │
│  (paste in UI or batch via script)                          │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│  POST /api/process                                          │
│  ├── type: "demo"       → Pipeline A (v1)                   │
│  └── type: "onboarding" → Pipeline B (v2, merge, changelog) │
└──────────────┬──────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  lib/engine.ts       │
    │  ├ extractStructured │  ← Regex-based extraction (zero cost)
    │  │  Data()           │
    │  ├ mergeAccountData()│  ← Deep merge v1 + onboarding
    │  ├ generateRetellSpec│  ← Builds Retell agent JSON with
    │  │  ()               │    prompt hygiene (office hours flow,
    │  │                   │    after hours flow, transfer protocol)
    │  └ generateChangelog │  ← Field-level diff v1 → v2
    │    ()                │
    └──────────┬──────────┘
               │
    ┌──────────▼──────────┐
    │  lib/storage.ts      │
    │  Read/write JSON to  │
    │  outputs/accounts/   │
    └──────────┬──────────┘
               │
    ┌──────────▼───────────────────────────────────────┐
    │  outputs/accounts/<account_id>/                   │
    │  ├── v1/                                           │
    │  │   ├── account_memo.json  (Account Memo v1)      │
    │  │   └── retell_agent.json  (Retell Agent Spec v1) │
    │  ├── v2/                                           │
    │  │   ├── account_memo.json  (Account Memo v2)      │
    │  │   └── retell_agent.json  (Retell Agent Spec v2) │
    │  └── changelog.json         (Field-level diff)     │
    └──────────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │  Web Dashboard (UI)  │
    │  ├ Dashboard          │  ← Live stats, recent activity
    │  ├ Upload Transcript  │  ← Paste + process
    │  ├ Accounts           │  ← Browse all accounts
    │  ├ Account Detail     │  ← JSON viewer, version toggle,
    │  │                    │    changelog diff viewer
    │  └ History            │  ← Timeline of all versions
    └─────────────────────┘
```

### Pipeline A: Demo Call → v1

1. User submits demo transcript via UI (or batch script)
2. `extractStructuredData()` parses transcript using regex patterns
3. Creates Account Memo v1 with all required fields:
   - `account_id`, `company_name`, `business_hours`, `office_address`
   - `services_supported`, `emergency_definition`, `emergency_routing_rules`
   - `non_emergency_routing_rules`, `call_transfer_rules`
   - `integration_constraints`, `after_hours_flow_summary`, `office_hours_flow_summary`
   - `questions_or_unknowns` (only for truly missing data)
4. `generateRetellSpec()` creates agent config with:
   - System prompt including office hours flow, after hours flow, transfer protocol
   - Key variables (timezone, business hours, address, emergency routing)
   - Tool invocation placeholders (hidden from caller)
   - Call transfer protocol with timeout, retries, failure message
   - Fallback protocol if transfer fails
5. Saves `v1/account_memo.json` and `v1/retell_agent.json` to `outputs/accounts/<id>/`

### Pipeline B: Onboarding → v2

1. User submits onboarding transcript for existing account
2. Loads latest version from storage
3. Extracts new data from onboarding transcript
4. `mergeAccountData()` deep-merges: onboarding overrides demo, empty fields preserved
5. `generateChangelog()` diffs every field (added/updated/removed)
6. Saves `v2/account_memo.json`, `v2/retell_agent.json`, and `changelog.json`

## How to Run Locally

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start the dev server
pnpm dev

# 3. Open the dashboard
open http://localhost:3000
```

### Batch Process All 5 Accounts

With the dev server running in another terminal:

```bash
npx tsx scripts/batch-process.ts
```

This processes all 10 transcripts (5 demo + 5 onboarding) automatically and produces
outputs for all 5 accounts.

## How to Plug in Dataset Files

### Option 1: Via the Web UI

1. Go to http://localhost:3000/upload
2. Enter an Account ID (e.g., `smith-plumbing`)
3. Select "Demo" type
4. Paste the demo transcript text
5. Click "Process Transcript"
6. Repeat with "Onboarding" type for the onboarding transcript

### Option 2: Via the Batch Script

1. Place transcript files in `sample-transcripts/` as `demo-<name>.txt` and `onboarding-<name>.txt`
2. Add the account to the `PAIRS` array in `scripts/batch-process.ts`
3. Run `npx tsx scripts/batch-process.ts`

### Option 3: Direct API Call

```bash
curl -X POST http://localhost:3000/api/process \
  -H "Content-Type: application/json" \
  -d '{"accountId": "my-account", "transcript": "...", "type": "demo"}'
```

## Where Outputs Are Stored

```
outputs/
  accounts/
    smith-plumbing/
      v1/
        account_memo.json   ← Account Memo v1 (from demo)
        retell_agent.json   ← Retell Agent Spec v1
      v2/
        account_memo.json   ← Account Memo v2 (from onboarding)
        retell_agent.json   ← Retell Agent Spec v2
      changelog.json        ← Diff showing all v1→v2 changes
    bright-spark-electric/
      v1/
        account_memo.json
        retell_agent.json
      v2/
        account_memo.json
        retell_agent.json
      changelog.json
    comfort-zone-hvac/
      ...
    greenscape-lawn/
      ...
    clearview-windows/
      ...
```

## Output Formats

### Account Memo JSON (per spec)

Every account memo includes these required fields:

| Field | Description |
|---|---|
| `account_id` | Unique identifier |
| `company_name` | Business name |
| `business_hours` | `{ days, start, end, timezone }` |
| `office_address` | Physical address |
| `services_supported` | Array of services |
| `emergency_definition` | What constitutes an emergency (triggers) |
| `emergency_routing_rules` | Who to call, order, fallback |
| `non_emergency_routing_rules` | Standard call routing |
| `call_transfer_rules` | `{ timeout_seconds, max_retries, message_if_fails }` |
| `integration_constraints` | Things the system must never do |
| `after_hours_flow_summary` | After-hours call handling procedure |
| `office_hours_flow_summary` | Business hours call handling procedure |
| `questions_or_unknowns` | Only if truly missing from transcript |
| `notes` | Additional notes |

### Retell Agent Draft Spec (per spec)

| Field | Description |
|---|---|
| `agent_name` | Name of the AI agent |
| `voice_style` | Voice tone description |
| `system_prompt` | Full prompt with office/after hours flows, transfer protocol |
| `key_variables` | `{ timezone, business_hours, office_address, emergency_routing, services }` |
| `tool_invocation_placeholders` | Tools the agent can use (hidden from caller) |
| `call_transfer_protocol` | Timeout, retries, failure message |
| `fallback_protocol` | Apologize, collect info, assure callback |
| `version` | v1 for demo, v2 for onboarding |

### Prompt Hygiene

The generated system prompt includes:

- **Office Hours Flow**: greeting → purpose → collect name/number → route/transfer → fallback if fails → confirm next steps → "anything else?" → close
- **After Hours Flow**: greet → inform closed → check emergency → if emergency: collect name/number/address, attempt dispatch, fallback → if not emergency: take message, assure callback → "anything else?" → close
- **Transfer Protocol**: timeout, retries, failure message
- **Rules**: Never mention function calls to caller, don't ask too many questions, only collect what's needed for routing

### Changelog (v1 → v2)

```json
{
  "account_id": "smith-plumbing",
  "from_version": 1,
  "to_version": 2,
  "total_changes": 15,
  "changes": [
    {
      "field": "company_name",
      "path": "company_name",
      "old_value": "Smith's Plumbing Solutions",
      "new_value": "Smith's Premium Plumbing Solutions",
      "change_type": "updated"
    }
  ]
}
```

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Framework | Next.js (App Router) | Free |
| Language | TypeScript (strict mode) | Free |
| Styling | TailwindCSS + shadcn/ui | Free |
| Storage | Local JSON files (fs/promises) | Free |
| Extraction | Regex pattern matching | Free (no LLM) |
| Package Manager | pnpm | Free |

**Total cost: $0** — No paid APIs, no database subscriptions, no LLM credits.

## Retell Setup

Since Retell's free tier does not allow programmatic agent creation via API:

1. Create a free Retell account at https://www.retell.ai/
2. Create a new agent in the Retell dashboard
3. Copy the `system_prompt` from `outputs/accounts/<id>/v2/retell_agent.json`
4. Paste it into the Retell agent's prompt configuration
5. Configure voice, tools, and variables as described in the spec

**For detailed step-by-step instructions, see [RETELL_SETUP.md](RETELL_SETUP.md).**

The `retell_v*.json` files are structured to match Retell's configuration format
and serve as a "Retell Agent Spec JSON" output ready for manual import.

## n8n Workflow Exports

Ready-to-import n8n workflow JSON files are included in `/workflows/`:

| File | Description |
|---|---|
| `workflows/clara-pipeline-a-demo.json` | Pipeline A: Demo Call → v1 |
| `workflows/clara-pipeline-b-onboarding.json` | Pipeline B: Onboarding → v2 |

To use with n8n:
```bash
docker run -it --rm -p 5678:5678 n8nio/n8n
# Open http://localhost:5678 → Import workflow → Select JSON file → Activate
```

See [workflows/README.md](workflows/README.md) for detailed setup instructions.

## Deployment

### Option 1: Docker (Recommended)

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t clara-ai .
docker run -p 3000:3000 -v clara-data:/app/outputs clara-ai
```

### Option 2: VPS / Cloud VM

```bash
git clone <repo-url> && cd clara-ai
pnpm install
pnpm build
PORT=3000 pnpm start
```

### Option 3: Railway / Render / Fly.io

These platforms support Docker — just point them at the repo and they'll
build from the Dockerfile automatically. Mount a persistent volume at `/app/outputs`.

### Environment Variables

See [.env.example](.env.example) for all configuration options.

## Dataset

5 home-service businesses, each with a demo + onboarding transcript pair:

| # | Account ID | Industry | Location |
|---|---|---|---|
| 1 | `smith-plumbing` | Plumbing | Denver, CO |
| 2 | `bright-spark-electric` | Electrical | Austin, TX |
| 3 | `comfort-zone-hvac` | HVAC | Atlanta, GA |
| 4 | `greenscape-lawn` | Landscaping | Portland, OR |
| 5 | `clearview-windows` | Window Cleaning | Salt Lake City, UT |

## Project Structure

```
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Dashboard (live stats + activity)
│   ├── upload/page.tsx           # Transcript upload with built-in examples
│   ├── accounts/page.tsx         # Account listing
│   ├── accounts/[accountId]/     # Account detail (JSON viewer, changelog)
│   ├── history/page.tsx          # Version history timeline
│   └── api/                      # API routes
│       ├── process/route.ts      # POST — process transcript
│       ├── accounts/route.ts     # GET — list accounts
│       ├── account/[id]/route.ts # GET — account detail
│       └── history/route.ts      # GET — version history
├── lib/
│   ├── types.ts                  # TypeScript interfaces (AccountMemo, RetellAgentSpec, etc.)
│   ├── engine.ts                 # Core logic: extract, merge, generate, changelog
│   ├── storage.ts                # File I/O layer
│   └── utils.ts                  # Utilities
├── scripts/
│   └── batch-process.ts          # Batch process all 10 transcripts
├── workflows/
│   ├── README.md                 # Workflow architecture documentation
│   ├── clara-pipeline-a-demo.json       # n8n export: Pipeline A (demo → v1)
│   └── clara-pipeline-b-onboarding.json # n8n export: Pipeline B (onboarding → v2)
├── sample-transcripts/           # 5 demo + 5 onboarding transcript files
├── outputs/accounts/             # Generated JSON output (per account, versioned)
├── components/                   # UI components (sidebar, topbar, json-viewer, shadcn/ui)
├── Dockerfile                    # Multi-stage Docker build
├── docker-compose.yml            # Docker Compose for easy deployment
├── .env.example                  # Environment variables template
├── RETELL_SETUP.md               # Step-by-step Retell import guide
├── DOCUMENTATION.md              # Detailed project documentation
└── README.md                     # This file
```

## Known Limitations

1. **Regex-based extraction**: Pattern matching works well for structured demo/onboarding calls
   but may miss data in highly unstructured or conversational transcripts. In production,
   you would swap `extractStructuredData()` for an LLM-based extractor.

2. **No authentication**: The dashboard has no login system. In production, add auth
   to protect account data.

3. **File-based storage**: JSON files work for the assignment but don't support
   concurrent writes or queries. In production, use a database (Supabase, PostgreSQL).

4. **No audio transcription**: The pipeline accepts text transcripts only. For audio
   input, you would add a Whisper-based transcription step before extraction.

5. **Single-server**: No distributed processing. Batch script processes sequentially.

6. **Demo overwrites**: Running a demo twice for the same account_id overwrites v1.
   In production, add a confirmation prompt or auto-increment.

## What I Would Improve with Production Access

1. **LLM-powered extraction** — Replace regex with GPT-4 structured output (function calling)
   for more reliable data extraction from conversational transcripts.

2. **Retell API integration** — Programmatically create and update agents via Retell's API
   instead of generating spec files for manual import.

3. **Supabase backend** — Move from file storage to Supabase for real-time sync,
   proper querying, and multi-user support.

4. **n8n orchestration** — Build a visual workflow in n8n with webhooks for automated
   processing when new recordings arrive.

5. **Whisper transcription** — Add an audio upload option with local Whisper transcription
   for end-to-end automation from recording to agent config.

6. **Task tracker integration** — Create Asana/Linear tasks automatically when a new
   account is processed or when `questions_or_unknowns` need human review.

7. **Webhook-based triggers** — Auto-process transcripts when uploaded to a shared
   Google Drive or Dropbox folder.

8. **Diff viewer UI** — Side-by-side visual diff of v1 vs v2 JSON (the current UI shows
   a changelog, but a side-by-side comparison would be more intuitive).

## Bonus Features Implemented

- **Web Dashboard** — Full UI for uploading, browsing accounts, viewing specs, and tracking history
- **Diff/Changelog Viewer** — Color-coded changelog showing added (green), updated (blue), removed (red) fields with old → new values
- **Batch Processing** — Script to process all 10 transcripts end-to-end
- **Live Dashboard Stats** — Real-time account count, version count, demo/onboarding breakdown
- **Version Toggle** — Switch between v1 and v2 on the account detail page

## License

MIT
