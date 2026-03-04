# Workflow Architecture

> Clara AI provides **two orchestration options**: Next.js API routes (primary) and n8n workflow exports (alternative).

## Orchestration Options

| Approach | Files | When to Use |
|---|---|---|
| **Next.js API Routes** (primary) | `app/api/process/route.ts` | Use by default — zero setup, runs with `pnpm dev` |
| **n8n Workflows** (alternative) | `workflows/*.json` | Use if you prefer visual workflow orchestration |

## n8n Workflow Exports

This directory contains importable n8n workflow JSON files:

| File | Pipeline | Description |
|---|---|---|
| `clara-pipeline-a-demo.json` | Pipeline A | Demo Call → Extract → Generate Retell Spec → Save v1 |
| `clara-pipeline-b-onboarding.json` | Pipeline B | Onboarding → Load v1 → Merge → Changelog → Save v2 |

### Importing into n8n

```bash
# 1. Start n8n (Docker)
docker run -it --rm -p 5678:5678 -v n8n_data:/home/node/.n8n n8nio/n8n

# 2. Open http://localhost:5678

# 3. Import workflows:
#    - Click "Workflows" → "Import from File"
#    - Select clara-pipeline-a-demo.json
#    - Repeat for clara-pipeline-b-onboarding.json

# 4. Activate both workflows

# 5. Test Pipeline A:
curl -X POST http://localhost:5678/webhook/process-demo \
  -H "Content-Type: application/json" \
  -d '{"accountId": "test-account", "transcript": "...", "type": "demo"}'

# 6. Test Pipeline B:
curl -X POST http://localhost:5678/webhook/process-onboarding \
  -H "Content-Type: application/json" \
  -d '{"accountId": "test-account", "transcript": "...", "type": "onboarding"}'
```

### n8n Environment Variables

```
OUTPUT_DIR=./outputs/accounts
```

## Workflow Definitions (Next.js API)

### Workflow 1: Pipeline A — Demo Call → v1

```
Trigger: POST /api/process (type: "demo")
    │
    ├── Step 1: Validate input
    │   ├── Check accountId is provided
    │   ├── Check transcript is provided
    │   └── Check type is "demo"
    │
    ├── Step 2: Idempotency check
    │   └── If account already has v1 → return 409 Conflict
    │
    ├── Step 3: Extract structured data
    │   └── engine.extractStructuredData(transcript, accountId, "demo")
    │   └── Uses regex pattern matching (zero-cost, no LLM)
    │
    ├── Step 4: Generate Retell agent spec
    │   └── engine.generateRetellSpec(accountMemo)
    │   └── Builds system prompt with office/after-hours flows
    │
    ├── Step 5: Store artifacts
    │   ├── Save outputs/accounts/{id}/v1/account_memo.json
    │   └── Save outputs/accounts/{id}/v1/retell_agent.json
    │
    └── Step 6: Return success response
        └── { success: true, version: 1, files: [...] }
```

### Workflow 2: Pipeline B — Onboarding → v2

```
Trigger: POST /api/process (type: "onboarding")
    │
    ├── Step 1: Validate input
    │   └── Same as Pipeline A
    │
    ├── Step 2: Load existing data
    │   ├── Get account versions
    │   └── Load latest memo (v1)
    │   └── If no v1 exists → return 400
    │
    ├── Step 3: Extract new structured data
    │   └── engine.extractStructuredData(transcript, accountId, "onboarding")
    │
    ├── Step 4: Merge data
    │   └── engine.mergeAccountData(v1, newData)
    │   └── Deep merge: onboarding overrides demo, empty fields preserved
    │
    ├── Step 5: Generate updated Retell spec
    │   └── engine.generateRetellSpec(mergedMemo)
    │
    ├── Step 6: Generate changelog
    │   └── engine.generateChangelog(v1, mergedMemo)
    │   └── Field-level diff with old/new values
    │
    ├── Step 7: Store artifacts
    │   ├── Save outputs/accounts/{id}/v2/account_memo.json
    │   ├── Save outputs/accounts/{id}/v2/retell_agent.json
    │   └── Save outputs/accounts/{id}/changelog.json
    │
    └── Step 8: Return success response
        └── { success: true, version: 2, files: [...] }
```

### Workflow 3: Batch Processing

```
Trigger: pnpm batch (or npx tsx scripts/batch-process.ts)
    │
    ├── Phase 1: Process all demo transcripts
    │   └── For each account in PAIRS:
    │       ├── Read data/demo_calls/demo-{name}.txt
    │       └── POST /api/process (type: "demo")
    │
    └── Phase 2: Process all onboarding transcripts
        └── For each account in PAIRS:
            ├── Read data/onboarding_calls/onboarding-{name}.txt
            └── POST /api/process (type: "onboarding")
```

## n8n Node-by-Node Breakdown

### Pipeline A (clara-pipeline-a-demo.json)

| Node | Type | Purpose |
|---|---|---|
| Webhook Trigger | `webhook` | Receives POST with `{accountId, transcript, type}` |
| Validate Type = demo | `if` | Rejects non-demo requests |
| Validate Input | `if` | Checks accountId and transcript are present |
| Extract Structured Data | `code` | Regex-based extraction (mirrors `lib/engine.ts`) |
| Generate Retell Agent Spec | `code` | Builds system prompt and agent config |
| Save Account Memo v1 | `writeFile` | Writes `v1/account_memo.json` |
| Save Retell Spec v1 | `writeFile` | Writes `v1/retell_agent.json` |
| Respond Success | `respondToWebhook` | Returns `{success: true, version: 1}` |

### Pipeline B (clara-pipeline-b-onboarding.json)

| Node | Type | Purpose |
|---|---|---|
| Webhook Trigger | `webhook` | Receives POST with onboarding data |
| Validate Type = onboarding | `if` | Rejects non-onboarding requests |
| Validate Input | `if` | Checks inputs |
| Load Existing v1 Memo | `readFile` | Reads the account's `v1/account_memo.json` |
| Extract + Merge + Changelog | `code` | Extracts, deep-merges, diffs fields |
| Generate Retell Spec v2 | `code` | Builds updated system prompt |
| Save Account Memo v2 | `writeFile` | Writes `v2/account_memo.json` |
| Save Retell Spec v2 | `writeFile` | Writes `v2/retell_agent.json` |
| Save Changelog | `writeFile` | Writes `changelog.json` |
| Respond Success | `respondToWebhook` | Returns `{success: true, version: 2}` |
