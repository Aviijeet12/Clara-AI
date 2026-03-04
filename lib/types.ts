// ─── Core Domain Types ───────────────────────────────────────────────────────

export interface BusinessHours {
  days: string;
  start: string;
  end: string;
  timezone: string;
}

export interface EmergencyRoutingRule {
  contact_name: string;
  phone: string;
  role: string;
  order: number;
  fallback: string;
}

export interface CallTransferRules {
  timeout_seconds: number;
  max_retries: number;
  message_if_fails: string;
}

export interface AccountMemo {
  account_id: string;
  company_name: string;
  version: number;
  created_at: string;
  updated_at: string;
  type: "demo" | "onboarding";
  status: "active" | "pending" | "completed";
  // ─── Assignment-required fields ───
  business_hours: BusinessHours;
  office_address: string;
  services_supported: string[];
  emergency_definition: string[];
  emergency_routing_rules: EmergencyRoutingRule[];
  non_emergency_routing_rules: string;
  routing_rules: {
    emergency: EmergencyRoutingRule[];
    non_emergency: string;
  };
  call_transfer_rules: CallTransferRules;
  integration_constraints: string[];
  after_hours_flow_summary: string;
  office_hours_flow_summary: string;
  // ─── Extended fields ───
  owner_name: string;
  phone: string;
  email: string;
  website: string;
  industry: string;
  years_in_business: number | null;
  number_of_employees: number | null;
  service_area: string;
  pricing_model: string;
  average_job_value: string;
  peak_season: string;
  tone: string;
  greeting_style: string;
  call_objective: string;
  key_selling_points: string[];
  objection_handling: string[];
  scheduling_preferences: string;
  follow_up_procedure: string;
  crm: string;
  scheduling_tool: string;
  payment_processor: string;
  other_tools: string[];
  notes: string;
  questions_or_unknowns: string[];
}

// ─── Retell Agent Spec ───────────────────────────────────────────────────────

export interface RetellAgentTool {
  name: string;
  description: string;
  parameters: Record<string, string>;
}

export interface RetellAgentSpec {
  agent_name: string;
  account_id: string;
  version: number;
  created_at: string;
  voice_style: string;
  system_prompt: string;
  key_variables: {
    timezone: string;
    business_hours: string;
    office_address: string;
    emergency_routing: string;
    services: string[];
  };
  tool_invocation_placeholders: RetellAgentTool[];
  call_transfer_protocol: string;
  fallback_protocol: string;
  conversation_flow: {
    office_hours_flow: string;
    after_hours_flow: string;
    opening: string;
    closing: string;
    fallback: string;
  };
}

// ─── Changelog ───────────────────────────────────────────────────────────────

export interface ChangelogEntry {
  field: string;
  path: string;
  old_value: unknown;
  new_value: unknown;
  change_type: "added" | "updated" | "removed";
}

export interface Changelog {
  account_id: string;
  from_version: number;
  to_version: number;
  created_at: string;
  total_changes: number;
  changes: ChangelogEntry[];
}

// ─── API Types ───────────────────────────────────────────────────────────────

export interface ProcessRequest {
  accountId: string;
  transcript: string;
  type: "demo" | "onboarding";
}

export interface ProcessResponse {
  success: boolean;
  message: string;
  accountId: string;
  version: number;
  files: string[];
}

export interface AccountDataResponse {
  accountId: string;
  versions: number[];
  currentVersion: number;
  memo: AccountMemo;
  retellSpec: RetellAgentSpec;
  changelog: Changelog | null;
  allMemos: Record<number, AccountMemo>;
  allRetellSpecs: Record<number, RetellAgentSpec>;
}

export interface AccountListItem {
  accountId: string;
  versions: number[];
  latestType: string;
  updatedAt: string;
}

export interface HistoryEntry {
  id: string;
  accountId: string;
  version: number;
  type: "demo" | "onboarding";
  createdAt: string;
  changesCount: number;
  changelog: Changelog | null;
}
