# Retell AI Setup Guide

> Step-by-step instructions for importing Clara AI's generated agent specs into Retell.

## 1. Create a Retell Account

1. Go to [https://www.retell.ai/](https://www.retell.ai/)
2. Sign up for a **free account** (no credit card required)
3. Complete email verification
4. You will land on the Retell Dashboard

## 2. Understanding the Generated Spec

For each account, Clara AI generates a **Retell Agent Spec JSON** at:

```
outputs/accounts/<account_id>/v1/retell_agent.json    (from demo call)
outputs/accounts/<account_id>/v2/retell_agent.json    (after onboarding update)
```

Each spec contains:

| Field | Purpose |
|---|---|
| `agent_name` | Name for the agent in Retell |
| `voice_style` | Voice tone to select in Retell |
| `system_prompt` | The full prompt to paste into Retell's agent config |
| `key_variables` | Timezone, business hours, address, emergency contacts, services |
| `tool_invocation_placeholders` | Tool definitions (schedule, transfer, emergency log) |
| `call_transfer_protocol` | Transfer timeout, retries, failure handling |
| `fallback_protocol` | What to do when transfer fails |
| `conversation_flow` | Office hours flow, after hours flow, opening, closing |

## 3. Manual Import Steps (Retell Dashboard)

Since Retell's free tier does not allow programmatic agent creation via API, follow these manual steps:

### Step 3a: Create a New Agent

1. In the Retell Dashboard, click **"Create Agent"**
2. Set the **Agent Name** to the value from `agent_name` in the spec
   - Example: `"Smith's Plumbing Solutions AI Receptionist"`
3. Click **Create**

### Step 3b: Configure the System Prompt

1. Open the agent you just created
2. Go to the **"Prompt"** or **"Instructions"** section
3. Copy the entire `system_prompt` field from the retell spec JSON:
   ```bash
   # On Windows (PowerShell):
   Get-Content outputs/accounts/smith-plumbing/v2/retell_agent.json | ConvertFrom-Json | Select-Object -ExpandProperty system_prompt | Set-Clipboard

   # On Mac/Linux:
   cat outputs/accounts/smith-plumbing/v2/retell_agent.json | jq -r '.system_prompt' | pbcopy
   ```
4. Paste the full prompt into Retell's prompt editor
5. Click **Save**

### Step 3c: Configure Voice

1. In the agent settings, go to **"Voice"**
2. Select a voice that matches the `voice_style` field
   - For `"professional and friendly"` → choose a warm, clear voice (e.g., "Rachel" or "Drew")
   - For `"warm and conversational"` → choose a casual voice
3. Click **Save**

### Step 3d: Configure Tools (Functions)

1. In the agent settings, go to **"Functions"** or **"Tools"**
2. For each tool in `tool_invocation_placeholders`, create a function:

   **Tool 1: schedule_appointment**
   - Name: `schedule_appointment`
   - Description: `Schedule a service appointment`
   - Parameters:
     - `date` (string) — preferred date
     - `time` (string) — preferred time
     - `service_type` (string) — type of service
     - `customer_name` (string) — customer name
     - `phone` (string) — customer phone

   **Tool 2: collect_customer_info**
   - Name: `collect_customer_info`
   - Description: `Collect and store caller contact information`
   - Parameters:
     - `name` (string) — full name
     - `phone` (string) — phone number
     - `email` (string, optional) — email
     - `address` (string) — service address
     - `notes` (string) — additional notes

   **Tool 3: transfer_call**
   - Name: `transfer_call`
   - Description: `Transfer the call to a human representative`
   - Parameters:
     - `target` (string) — who to transfer to
     - `reason` (string) — reason for transfer

   **Tool 4: log_emergency**
   - Name: `log_emergency`
   - Description: `Log an emergency dispatch request`
   - Parameters:
     - `caller_name` (string)
     - `caller_phone` (string)
     - `address` (string)
     - `description` (string)
     - `priority` (string) — high/critical

3. Connect each tool to a webhook or leave as placeholder for now
4. Click **Save**

### Step 3e: Set Key Variables

1. If Retell supports **custom variables** or **metadata**:
   - Set `timezone` from key_variables
   - Set `business_hours` from key_variables
   - Set `office_address` from key_variables
2. These are already embedded in the system prompt, so this is optional

### Step 3f: Test the Agent

1. Click **"Test"** or **"Try it"** in the Retell dashboard
2. Test with:
   - "Hi, I'd like to schedule a plumbing appointment" (office hours test)
   - "I have a pipe burst, I need someone now!" (emergency test)
   - "What are your hours?" (informational test)
3. Verify the agent follows the prompt's conversation flows

## 4. Updating from v1 to v2

When you process an onboarding transcript and generate v2:

1. Open the existing agent in Retell
2. Replace the **system prompt** with the one from `v2/retell_agent.json`
3. Update any changed tools or variables
4. Review the changelog at `outputs/accounts/<id>/changelog.json` to see what changed
5. Test again to verify updated behavior

## 5. Bulk Import (Multiple Accounts)

For each of the 5 accounts, repeat steps 3a-3f:

| Account | Spec File |
|---|---|
| Smith Plumbing | `outputs/accounts/smith-plumbing/v2/retell_agent.json` |
| Bright Spark Electric | `outputs/accounts/bright-spark-electric/v2/retell_agent.json` |
| Comfort Zone HVAC | `outputs/accounts/comfort-zone-hvac/v2/retell_agent.json` |
| GreenScape Lawn | `outputs/accounts/greenscape-lawn/v2/retell_agent.json` |
| ClearView Windows | `outputs/accounts/clearview-windows/v2/retell_agent.json` |

> Use `v2` (post-onboarding) as the latest version. v1 is the initial draft.

## 6. API Integration (If You Upgrade Retell Plan)

If you upgrade to a Retell plan that supports API access:

```bash
# Create agent via API
curl -X POST https://api.retell.ai/v1/agent \
  -H "Authorization: Bearer YOUR_RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d @outputs/accounts/smith-plumbing/v2/retell_agent.json

# Update agent
curl -X PATCH https://api.retell.ai/v1/agent/AGENT_ID \
  -H "Authorization: Bearer YOUR_RETELL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"system_prompt": "..."}'
```

Environment variable needed:
```
RETELL_API_KEY=your_api_key_here
```

## Notes

- The free tier of Retell is sufficient for manual agent creation and testing
- All tool invocation placeholders are designed so the agent **never mentions function calls to the caller**
- The system prompt includes explicit rules about this: "Do NOT mention internal tools, functions, or systems to the caller"
- Each spec version (v1/v2) is self-contained — you don't need external context to configure the agent
