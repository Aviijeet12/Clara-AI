import type {
  AccountMemo,
  RetellAgentSpec,
  RetellAgentTool,
  Changelog,
  ChangelogEntry,
} from "./types";

// ─── Transcript Extraction ───────────────────────────────────────────────────
// Parses a plain-text transcript and extracts structured account data.
// Uses keyword/pattern matching (no paid AI APIs).

function cleanExtracted(val: string): string {
  // Strip leading punctuation/whitespace that leaks from regex captures
  return val.replace(/^[\s:.,;!\-]+/, "").trim();
}

function findValue(transcript: string, ...patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) return cleanExtracted(match[1]);
  }
  return "";
}

function findList(transcript: string, ...patterns: RegExp[]): string[] {
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return match[1]
        .split(/[,;]/)
        .map((s) => cleanExtracted(s))
        .filter(Boolean);
    }
  }
  return [];
}

function findNumber(transcript: string, ...patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

export function extractStructuredData(
  transcript: string,
  accountId: string,
  type: "demo" | "onboarding"
): AccountMemo {
  // Normalize Windows \r\n → \n so regex `.` and `\n` terminators work
  transcript = transcript.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const now = new Date().toISOString();
  const questions: string[] = [];

  // ── Company Name ──
  const companyName = findValue(
    transcript,
    /(?:business\s+name|company\s+name)\s+(?:is|:)\s*(?:now\s+)?(.+?)(?:\s*[\u2014\u2013—–]|\.\s|,|\n|$)/i,
    /(?:rebranded\s+to)\s+(.+?)(?:\.\s+to\s+|\s*[\u2014\u2013—–]|\.\s*$|,|\n|$)/i,
    /(?:we\s+are|I\s+(?:run|own|operate))\s+(.+?)(?:\.|,|\n|$)/i
  );
  if (!companyName) questions.push("What is the business/company name?");

  // ── Owner Name ──
  const ownerName = findValue(
    transcript,
    /(?:my\s*name\s*is|owner(?:'s)?\s*name|name)\s*(?:is|:)?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})(?:\s+and|\.|,|\n|$)/i,
    /(?:I'm|I\s*am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
  );
  if (!ownerName) questions.push("What is the owner's name?");

  // ── Contact Info ──
  const phone = findValue(
    transcript,
    /(?:phone|number|call\s*(?:us|me)\s*at)\s*(?:is|:)?\s*([\d\-\(\)\+\s]{7,})/i
  );

  const email = findValue(
    transcript,
    /(?:email|e-mail)\s*(?:is|:)?\s*([\w.\-+]+@[\w.\-]+\.\w+)/i
  );

  const officeAddress = findValue(
    transcript,
    /(?:our\s+address|office\s+address)\s+is\s+(.+?)(?:\.\s|\n|$)/i,
    /(?:address\s+is)\s+(.+?\d{5})(?:\.\s|\n|$)/i,
    /(?:located\s+at)\s+(.+?)(?:\.\s|\n|$)/i
  );

  const website = findValue(
    transcript,
    /(?:website|site|url)\s*(?:is|:)?\s*((?:https?:\/\/)?[\w.\-]+\.\w+\/?[\w.\-]*)/i
  ).replace(/\.$/, "");

  const industry = findValue(
    transcript,
    /(?:industry|sector|field|type\s*of\s*business)\s*(?:is|:)?\s*(.+?)(?:\.|,|\n|$)/i,
    /(?:we\s*(?:do|provide|specialize\s*in))\s+(.+?)(?:\.|,|\n|$)/i
  );

  const yearsInBusiness = findNumber(
    transcript,
    /(?:been\s*(?:in\s*business|operating|running)\s*(?:for)?)\s*(\d+)\s*years?/i,
    /(\d+)\s*years?\s*(?:in\s*business|experience|of\s*experience)/i
  );

  const numEmployees = findNumber(
    transcript,
    /(?:have|has|with|now\s*have)\s*(\d+)\s*(?:employees|staff|team\s*members|workers|people)/i,
    /(\d+)\s*(?:employees|staff|team\s*members|workers|people)/i
  );

  // ── Business Hours ──
  const hoursText = findValue(
    transcript,
    /(?:business\s*hours?|office\s*hours?|hours?\s*of\s*operation|we(?:'re)?\s*open)\s*(?:are|is|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );
  const timezone = findValue(
    transcript,
    /(?:timezone|time\s*zone)\s*(?:is|:)?\s*(.+?)(?:\.|,|\n|$)/i,
    /\b(Eastern|Central|Mountain|Pacific|EST|CST|MST|PST|ET|CT|MT|PT)\b/i
  );
  const daysText = findValue(
    transcript,    /\b((?:Monday|Mon)\s*(?:through|to|thru)\s*(?:Friday|Saturday|Sunday|Fri|Sat|Sun))/i,    /(?:open|available|operate)\s*(?:from\s*)?(Monday|Mon)[\s\-–]*(through|to|thru)\s*(Friday|Saturday|Sunday|Fri|Sat|Sun)/i
  );
  const startTime = findValue(
    transcript,
    /(?:open\s*(?:at|from)|start\s*at)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/i,
    /(\d{1,2}(?::\d{2})?\s*(?:am|AM))\s*(?:to|–|-)/i
  );
  const endTime = findValue(
    transcript,
    /(?:close\s*at|until|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|AM|PM)?)/i,
    /(?:to|–|-)\s*(\d{1,2}(?::\d{2})?\s*(?:pm|PM))/i
  );

  const businessHours = {
    days: daysText || hoursText || "Monday-Friday",
    start: startTime || "8:00 AM",
    end: endTime || "5:00 PM",
    timezone: timezone || "Local",
  };
  if (!hoursText && !daysText) questions.push("What are the business hours (days, start, end, timezone)?");

  // ── Services ──
  const servicesSupported = findList(
    transcript,
    /(?:services?\s*(?:offered|supported|we\s*offer|include|provided|we\s*provide))\s*(?:are|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );

  const serviceArea = findValue(
    transcript,
    /(?:service\s+area)\s+(?:is|:)\s*(.+?)(?:\.|,|\n|$)/i,
    /(?:we\s+serve|serving)\s+(.+?)(?:\.|,|\n|$)/i
  );
  // For onboarding "expanded to include X" / "now also includes X" — append to existing
  const serviceAreaExpansion = findValue(
    transcript,
    /(?:service\s+area)\s+(?:now\s+(?:also\s+)?)?(?:includes?|expanded\s+to\s+include)\s+(.+?)(?:\.|,|\n|$)/i,
    /(?:expanded\s+(?:their\s+)?service\s+area\s+to\s+include)\s+(.+?)(?:\.|,|\n|$)/i
  );

  // ── Emergency handling ──
  const emergencyDef = findList(
    transcript,
    /(?:an\s+)?emergency\s+is\s+defined\s+as\s*:?\s*(.+?)(?:\.\s|\n|$)/i,
    /emergency\s+definition\s+(?:now\s+(?:also\s+)?)?includes?\s*:?\s*(.+?)(?:\.\s|\n|$)/i,
    /(?:emergenc(?:y|ies))\s+(?:includes?|are|means?|triggers?)\s*:?\s*(.+?)(?:\.\s|\n|$)/i
  );
  const emergencyDefFallback = findValue(
    transcript,
    /(?:consider(?:ed)?\s+(?:an?\s+)?emergency)\s*(?:is|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );
  const emergencyDefinition = emergencyDef.length > 0
    ? emergencyDef
    : emergencyDefFallback
      ? [emergencyDefFallback]
      : [];
  if (emergencyDefinition.length === 0) questions.push("What constitutes an emergency? (triggers/definitions)");

  // ── Emergency Routing ──
  const emergencyContactRaw = findValue(
    transcript,
    /emergency\s+contact\s+is\s+(?:still\s+)?(.+?)(?:\.\s|\n|$)/i,
    /for\s+emergencies?,?\s+(?:the\s+)?(?:emergency\s+)?contact\s+is\s+(?:still\s+)?(.+?)(?:\.\s|\n|$)/i
  );
  const emergencyPhone = findValue(
    transcript,
    /(?:emergency\s+(?:phone|number|line))\s+(?:is|:)\s*([\d\-\(\)\+\s]{7,})/i
  );

  // Parse "Name at phone" from emergency contact text
  let emergencyContactName = emergencyContactRaw;
  let emergencyContactPhone = emergencyPhone;
  if (emergencyContactRaw) {
    const contactParts = emergencyContactRaw.match(/^(.+?)\s+at\s+([\d\-\(\)\+]+)/);
    if (contactParts) {
      emergencyContactName = contactParts[1];
      if (!emergencyContactPhone) emergencyContactPhone = contactParts[2];
    }
  }

  // Extract fallback procedure
  const emergencyFallbackText = findValue(
    transcript,
    /(?:fallback)\s*:?\s*(.+?)(?:\.\s|\n|$)/i
  );

  const emergencyRoutingRules = emergencyContactRaw
    ? [
        {
          contact_name: emergencyContactName,
          phone: emergencyContactPhone || phone || "primary business line",
          role: "Primary on-call",
          order: 1,
          fallback: emergencyFallbackText || "Leave voicemail and assure caller of callback within 15 minutes",
        },
      ]
    : [];
  if (emergencyRoutingRules.length === 0) questions.push("Who should be contacted for emergencies? (name, phone, order, fallback)");

  // ── Non-emergency routing ──
  const nonEmergencyRouting = findValue(
    transcript,
    /(?:non[\s-]*emergency|regular|standard)\s*(?:calls?|routing)\s*(?:should|are|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );

  // ── Call Transfer Rules ──
  const transferTimeout = findNumber(
    transcript,
    /(?:transfer|hold)\s*(?:timeout|wait)\s*(?:is|:)?\s*(\d+)\s*seconds?/i
  );
  const transferRetries = findNumber(
    transcript,
    /(?:retries|retry|attempts?)\s*(?:is|:)?\s*(\d+)/i
  );
  const transferFailMsg = findValue(
    transcript,
    /(?:if\s+(?:a\s+)?transfer\s+fails?,?\s+say)\s*:?\s*"(.+?)"/i,
    /(?:if\s*(?:transfer|call)\s*fails?|unable\s*to\s*transfer)\s*(?:say|tell|:)?\s*"?(.+?)"?(?:\.\s|\n|$)/i
  );

  const callTransferRules = {
    timeout_seconds: transferTimeout || 30,
    max_retries: transferRetries || 2,
    message_if_fails:
      transferFailMsg ||
      "I'm sorry, I wasn't able to connect you. Can I take your name and number so someone can call you back shortly?",
  };

  // ── Integration constraints ──
  const integrationConstraints = findList(
    transcript,
    /(?:integration\s+constraints?)\s*:?\s*(.+?)(?:\.\s|\n|$)/i,
    /(?:never\s+(?:create|schedule|book|accept|quote))\s+(.+?)(?:\.\s|\n|$)/i
  );

  // ── Flow summaries ──
  const afterHoursFlow = findValue(
    transcript,
    /(?:after[\s-]*hours?\s*(?:flow|process|handling|procedure))\s*(?:is|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );
  const officeHoursFlow = findValue(
    transcript,
    /(?:office[\s-]*hours?\s+(?:flow|process|handling|procedure))\s*(?:is|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );

  // ── Pricing / Scheduling / Tone / Selling points ──
  const pricingModel = findValue(
    transcript,
    /(?:pricing|charge|rate|cost)\s*(?:model|structure)?\s*(?:is|:)?\s*(.+?)(?:\.|,|\n|$)/i
  );

  const avgJobValue = findValue(
    transcript,
    /(?:average\s*(?:job|project|ticket)\s*(?:value|cost|size))\s*(?:is|:)?\s*\$?\s*(.+?)(?:\.|,|\n|$)/i
  );

  const peakSeason = findValue(
    transcript,
    /(?:busy|peak|busiest)\s*(?:season|time|months?|period)\s*(?:is|:)?\s*(.+?)(?:\.|,|\n|$)/i
  );

  const greetingStyle = findValue(
    transcript,
    /[Gg]reeting\s+style\s*:\s*"(.+?)"/i,
    /[Gg]reeting\s+style\s*:\s*(.+?)(?:\n|$)/i,
    /(?:answer\s+(?:the\s+)?(?:phone|call))\s*(?:with|like|:)\s*"?(.+?)"?(?:\n|$)/i
  );

  const tone = findValue(
    transcript,
    /(?:tone|manner)\s*(?:should\s*be|is|:)?\s*(.+?)(?:\.|,|\n|$)/i
  );

  const callObjective = findValue(
    transcript,
    /(?:goal|objective|purpose)\s*(?:of\s*the\s*call)?\s*(?:is|should\s*be|:)?\s*(.+?)(?:\.|,|\n|$)/i
  );

  const objectionHandling = findList(
    transcript,
    /(?:common\s+)?objections?\s+(?:include|are|handling)\s*:?\s*(.+?)(?:\.\s|\n|$)/i,
    /common\s+concerns?\s+(?:include|are)\s*:?\s*(.+?)(?:\.\s|\n|$)/i
  );

  const keySellingPoints = findList(
    transcript,
    /(?:selling\s*points?|strengths?|advantages?|why\s*(?:us|choose\s*us))\s*(?:are|include|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );

  const schedulingPrefs = findValue(
    transcript,
    /(?:scheduling|appointment|booking)\s*(?:preferences?|prefer)\s*(?:is|are|:)?\s*(.+?)(?:\.|\n|$)/i
  );

  const followUp = findValue(
    transcript,
    /follow[\s-]*up\s+(?:procedure|process)\s*:\s*(.+?)(?:\.\s|\n|$)/i,
    /follow[\s-]*up\s*:\s*(.+?)(?:\.\s|\n|$)/i
  );

  // ── Tech Stack ──
  const crm = findValue(
    transcript,
    /(?:use|using)\s+(.+?)\s+as\s+(?:our|their)\s+CRM/i,
    /(?:switched|changed)\s+(?:their\s+)?CRM\s+to\s+(.+?)(?:\.|,|\n|$)/i,
    /(?:switched|changed)\s+(?:from\s+\S+\s+)?to\s+(.+?)\s+as\s+(?:our|their)\s+CRM/i,
    /(?:CRM|customer\s+relationship)\s+(?:is|:)\s+(.+?)(?:\.|,|\n|$)/i
  );

  const schedulingTool = findValue(
    transcript,
    /(?:scheduling\s+(?:tool|software|app|system))\s+(?:is|:)\s*(?:also\s+|now\s+)?(.+?)(?:\.|,|\n|$)/i
  );

  const paymentProcessor = findValue(
    transcript,
    /(?:payment\s+(?:processor|system|gateway))\s+(?:is|:)\s*(?:now\s+)?(.+?)(?:\.|,|\n|$)/i
  );

  const otherTools = findList(
    transcript,
    /(?:other\s*tools?|also\s*use|additionally)\s*(?:is|we\s*use|include|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );

  // ── Notes ──
  const notes = findValue(
    transcript,
    /\bNote\b\s*:\s*(.+)/i,
    /(?:additional\s+info|special\s+instructions?)\s*(?:is|are|:)?\s*(.+?)(?:\.\s|\n|$)/i
  );

  return {
    account_id: accountId,
    company_name: companyName,
    version: 1,
    created_at: now,
    updated_at: now,
    type,
    status: "active",
    business_hours: businessHours,
    office_address: officeAddress,
    services_supported: servicesSupported,
    emergency_definition: emergencyDefinition,
    emergency_routing_rules: emergencyRoutingRules,
    non_emergency_routing_rules:
      nonEmergencyRouting ||
      "Take caller name, phone number, and message. Schedule callback during business hours.",
    routing_rules: {
      emergency: emergencyRoutingRules,
      non_emergency:
        nonEmergencyRouting ||
        "Take caller name, phone number, and message. Schedule callback during business hours.",
    },
    call_transfer_rules: callTransferRules,
    integration_constraints: integrationConstraints,
    after_hours_flow_summary:
      afterHoursFlow ||
      "Greet caller, determine if emergency, if yes collect name/number/address and attempt dispatch, if no take message and assure next-day callback.",
    office_hours_flow_summary:
      officeHoursFlow ||
      "Greet caller, determine purpose, collect name and number, schedule appointment or transfer to team member, confirm next steps, close.",
    owner_name: ownerName,
    phone,
    email,
    website,
    industry,
    years_in_business: yearsInBusiness,
    number_of_employees: numEmployees,
    // If serviceArea is an onboarding expansion fragment, clear it so v1 value persists through merge
    service_area: serviceArea && /^(?:to\s+include|now\s+(?:also\s+)?include|expanded)/i.test(serviceArea)
      ? ""
      : serviceArea,
    pricing_model: pricingModel,
    average_job_value: avgJobValue,
    peak_season: peakSeason,
    tone,
    greeting_style: greetingStyle,
    call_objective: callObjective,
    key_selling_points: keySellingPoints,
    objection_handling: objectionHandling,
    scheduling_preferences: schedulingPrefs,
    follow_up_procedure: followUp,
    crm,
    scheduling_tool: schedulingTool,
    payment_processor: paymentProcessor,
    other_tools: otherTools,
    notes,
    questions_or_unknowns: questions,
  };
}

// ─── Merge Account Data ──────────────────────────────────────────────────────
// Merges onboarding data into existing v1 data.
// Only fields explicitly present in newData override old values.

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
  parentPath: string = ""
): Record<string, unknown> {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourcVal = source[key];
    const targVal = target[key];

    // Skip empty/null values from source – don't overwrite with blanks
    if (
      sourcVal === "" ||
      sourcVal === null ||
      sourcVal === undefined ||
      (Array.isArray(sourcVal) && sourcVal.length === 0)
    ) {
      continue;
    }

    if (
      typeof sourcVal === "object" &&
      !Array.isArray(sourcVal) &&
      sourcVal !== null &&
      typeof targVal === "object" &&
      !Array.isArray(targVal) &&
      targVal !== null
    ) {
      result[key] = deepMerge(
        targVal as Record<string, unknown>,
        sourcVal as Record<string, unknown>,
        parentPath ? `${parentPath}.${key}` : key
      );
    } else {
      result[key] = sourcVal;
    }
  }

  return result;
}

export function mergeAccountData(
  v1: AccountMemo,
  newData: AccountMemo
): AccountMemo {
  const merged = deepMerge(
    v1 as unknown as Record<string, unknown>,
    newData as unknown as Record<string, unknown>
  ) as unknown as AccountMemo;

  // Always bump version
  merged.version = v1.version + 1;
  merged.updated_at = new Date().toISOString();
  merged.type = "onboarding";

  // Combine questions lists (dedup)
  const allQuestions = [
    ...new Set([
      ...(v1.questions_or_unknowns || []),
      ...(newData.questions_or_unknowns || []),
    ]),
  ];
  merged.questions_or_unknowns = allQuestions;

  return merged;
}

// ─── Generate Retell Agent Spec ──────────────────────────────────────────────

export function generateRetellSpec(
  accountData: AccountMemo
): RetellAgentSpec {
  const {
    account_id,
    version,
    company_name,
    services_supported,
    service_area,
    tone,
    call_objective,
    key_selling_points,
    greeting_style,
    business_hours,
    office_address,
    emergency_definition,
    emergency_routing_rules,
    call_transfer_rules,
    scheduling_preferences,
    industry,
  } = accountData;

  const bizName = company_name || account_id;
  const servicesText =
    services_supported.length > 0
      ? services_supported.join(", ")
      : "various services";

  const sellingPointsText =
    key_selling_points.length > 0
      ? `Key advantages: ${key_selling_points.join(", ")}.`
      : "";

  const emergencyTriggers =
    emergency_definition.length > 0
      ? `Emergency triggers: ${emergency_definition.join("; ")}.`
      : "If the caller describes an urgent or dangerous situation, treat it as an emergency.";

  const emergencyContacts =
    emergency_routing_rules.length > 0
      ? emergency_routing_rules
          .map(
            (r) =>
              `${r.order}. ${r.contact_name} (${r.role}) at ${r.phone}. Fallback: ${r.fallback}`
          )
          .join("\n")
      : "Attempt to reach the primary on-call contact. If unavailable, take caller details and assure a callback within 15 minutes.";

  const transferProtocol = `Call Transfer Protocol:
- Attempt to transfer the call to the appropriate team member.
- Wait up to ${call_transfer_rules.timeout_seconds} seconds for the transfer to connect.
- If the transfer fails, retry up to ${call_transfer_rules.max_retries} time(s).
- If all transfer attempts fail, say: "${call_transfer_rules.message_if_fails}"
- Never leave the caller on hold without an update for more than 20 seconds.`;

  const fallbackProtocol = `Fallback Protocol if Transfer Fails:
- Apologize for the inconvenience.
- Collect the caller's name, phone number, and a brief description of their need.
- Assure them someone will return their call within 30 minutes during business hours.
- For emergencies after hours, escalate to the emergency dispatch chain.`;

  const officeHoursFlow = `Office Hours Call Flow (${business_hours.days} ${business_hours.start}-${business_hours.end} ${business_hours.timezone}):
1. Greet the caller: "${greeting_style || `Thank you for calling ${bizName}! How can I help you today?`}"
2. Determine the purpose of the call (service request, question, appointment, etc.)
3. Collect the caller's name and callback number.
4. If scheduling: check preferred time and book the appointment. ${scheduling_preferences ? `Preferences: ${scheduling_preferences}.` : ""}
5. If the caller needs to speak with someone: attempt transfer using the transfer protocol.
6. If transfer fails: follow the fallback protocol.
7. Confirm next steps with the caller.
8. Ask: "Is there anything else I can help you with?"
9. Close the call politely.`;

  const afterHoursFlow = `After Hours Call Flow:
1. Greet the caller and inform them the office is currently closed.
   "Thank you for calling ${bizName}. Our office is currently closed. Our business hours are ${business_hours.days} from ${business_hours.start} to ${business_hours.end} ${business_hours.timezone}."
2. Ask the caller if this is an emergency.
3. IF EMERGENCY:
   a. Collect the caller's name, phone number, and service address immediately.
   b. Briefly assess the situation. ${emergencyTriggers}
   c. Attempt to dispatch/transfer to the emergency contact chain:
${emergencyContacts}
   d. If unable to reach anyone, assure the caller: "I've logged this as urgent. Someone will call you back within 15 minutes."
4. IF NOT EMERGENCY:
   a. Collect the caller's name, phone number, and a brief message.
   b. Let them know someone will return their call the next business day.
   c. Offer to schedule a callback if possible.
5. Ask: "Is there anything else I can help you with?"
6. Close the call politely.`;

  const serviceAreaText = service_area
    ? ` serving ${service_area.replace(/^the\s+/i, "")}`
    : "";

  const systemPrompt = `You are a professional AI phone receptionist for ${bizName}. ${
    industry ? `They are a ${industry} business.` : ""
  } They offer ${servicesText}${serviceAreaText}. ${sellingPointsText}

${tone ? `Tone: Be ${tone} in all interactions.` : "Tone: Be professional, friendly, and helpful."}
${call_objective ? `Primary objective: ${call_objective}.` : "Primary objective: Assist the caller and schedule appointments."}

IMPORTANT RULES:
- Do NOT mention internal tools, functions, or systems to the caller.
- Do NOT ask more than 3 questions in a row without providing value back.
- Only collect information that is needed for routing and dispatch.
- Always confirm details before ending the call.

${officeHoursFlow}

${afterHoursFlow}

${transferProtocol}

${fallbackProtocol}`.trim();

  const tools: RetellAgentTool[] = [
    {
      name: "schedule_appointment",
      description: `Schedule a service appointment. ${scheduling_preferences ? `Preferred: ${scheduling_preferences}` : ""}`,
      parameters: {
        date: "string - preferred date",
        time: "string - preferred time",
        service_type: "string - type of service requested",
        customer_name: "string - customer name",
        phone: "string - customer phone number",
      },
    },
    {
      name: "collect_customer_info",
      description: "Collect and store caller contact information",
      parameters: {
        name: "string - customer full name",
        phone: "string - phone number",
        email: "string - email address (optional)",
        address: "string - service address",
        notes: "string - additional notes",
      },
    },
    {
      name: "transfer_call",
      description: "Transfer the call to a human representative",
      parameters: {
        target: "string - who to transfer to",
        reason: "string - reason for transfer",
      },
    },
    {
      name: "log_emergency",
      description: "Log an emergency dispatch request",
      parameters: {
        caller_name: "string - caller name",
        caller_phone: "string - callback number",
        address: "string - service address",
        description: "string - emergency description",
        priority: "string - high/critical",
      },
    },
  ];

  return {
    agent_name: `${bizName} AI Receptionist`,
    account_id,
    version,
    created_at: new Date().toISOString(),
    voice_style: tone || "professional and friendly",
    system_prompt: systemPrompt,
    key_variables: {
      timezone: business_hours.timezone,
      business_hours: `${business_hours.days} ${business_hours.start}-${business_hours.end}`,
      office_address: office_address || "Not provided",
      emergency_routing: emergencyContacts,
      services: services_supported,
    },
    tool_invocation_placeholders: tools,
    call_transfer_protocol: transferProtocol,
    fallback_protocol: fallbackProtocol,
    conversation_flow: {
      office_hours_flow: officeHoursFlow,
      after_hours_flow: afterHoursFlow,
      opening:
        greeting_style ||
        `Thank you for calling ${bizName}! How can I help you today?`,
      closing: `Thank you for calling ${bizName}. Have a great day!`,
      fallback:
        "I'm sorry, I didn't quite catch that. Could you please repeat that?",
    },
  };
}

// ─── Generate Changelog ──────────────────────────────────────────────────────

function flattenObject(
  obj: Record<string, unknown>,
  prefix: string = ""
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];

    if (
      typeof val === "object" &&
      val !== null &&
      !Array.isArray(val)
    ) {
      Object.assign(
        result,
        flattenObject(val as Record<string, unknown>, fullPath)
      );
    } else {
      result[fullPath] = val;
    }
  }

  return result;
}

export function generateChangelog(
  oldData: AccountMemo,
  newData: AccountMemo
): Changelog {
  const oldFlat = flattenObject(oldData as unknown as Record<string, unknown>);
  const newFlat = flattenObject(newData as unknown as Record<string, unknown>);

  const changes: ChangelogEntry[] = [];

  // Ignore metadata fields
  const ignoreKeys = new Set([
    "version",
    "updated_at",
    "created_at",
    "type",
    "questions_or_unknowns",
  ]);

  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);

  for (const key of allKeys) {
    if (ignoreKeys.has(key)) continue;

    const oldVal = oldFlat[key];
    const newVal = newFlat[key];

    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldStr === newStr) continue;

    if (oldVal === undefined || oldVal === "" || oldVal === null) {
      if (newVal !== undefined && newVal !== "" && newVal !== null) {
        changes.push({
          field: key.split(".").pop() || key,
          path: key,
          old_value: oldVal ?? null,
          new_value: newVal,
          change_type: "added",
        });
      }
    } else if (newVal === undefined || newVal === "" || newVal === null) {
      changes.push({
        field: key.split(".").pop() || key,
        path: key,
        old_value: oldVal,
        new_value: newVal ?? null,
        change_type: "removed",
      });
    } else {
      changes.push({
        field: key.split(".").pop() || key,
        path: key,
        old_value: oldVal,
        new_value: newVal,
        change_type: "updated",
      });
    }
  }

  return {
    account_id: newData.account_id,
    from_version: oldData.version,
    to_version: newData.version,
    created_at: new Date().toISOString(),
    total_changes: changes.length,
    changes,
  };
}
