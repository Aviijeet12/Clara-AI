/**
 * batch-process.ts
 * ────────────────
 * Processes all 5 demo + 5 onboarding transcript pairs in order.
 *
 * Usage:
 *   npx tsx scripts/batch-process.ts
 *
 * Requirements:
 *   - Dev server must be running on http://localhost:3000
 *   - Transcript files must exist in sample-transcripts/
 */

const BASE_URL = process.env.API_URL || "http://localhost:3000";

interface TranscriptPair {
  accountId: string;
  demoFile: string;
  onboardingFile: string;
}

const PAIRS: TranscriptPair[] = [
  {
    accountId: "smith-plumbing",
    demoFile: "demo-smith-plumbing.txt",
    onboardingFile: "onboarding-smith-plumbing.txt",
  },
  {
    accountId: "bright-spark-electric",
    demoFile: "demo-bright-spark.txt",
    onboardingFile: "onboarding-bright-spark.txt",
  },
  {
    accountId: "comfort-zone-hvac",
    demoFile: "demo-comfort-zone.txt",
    onboardingFile: "onboarding-comfort-zone.txt",
  },
  {
    accountId: "greenscape-lawn",
    demoFile: "demo-greenscape.txt",
    onboardingFile: "onboarding-greenscape.txt",
  },
  {
    accountId: "clearview-windows",
    demoFile: "demo-clearview.txt",
    onboardingFile: "onboarding-clearview.txt",
  },
];

async function readTranscript(
  filename: string,
  subfolder: "demo_calls" | "onboarding_calls"
): Promise<string> {
  const fs = await import("fs/promises");
  const path = await import("path");
  // Prefer data/<subfolder>; fall back to sample-transcripts/
  let filePath = path.join(process.cwd(), "data", subfolder, filename);
  try {
    await fs.access(filePath);
  } catch {
    filePath = path.join(process.cwd(), "sample-transcripts", filename);
  }
  const content = await fs.readFile(filePath, "utf-8");
  // Strip comment lines (lines starting with #)
  return content
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .join("\n")
    .trim();
}

async function processTranscript(
  accountId: string,
  transcript: string,
  type: "demo" | "onboarding"
): Promise<{ success: boolean; message: string; version?: number; alreadyExists?: boolean }> {
  const res = await fetch(`${BASE_URL}/api/process`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accountId, transcript, type }),
  });
  const data = await res.json();
  // 409 = idempotency check (demo already exists) — treat as "already done"
  if (res.status === 409) {
    return { ...data, success: false, alreadyExists: true };
  }
  return data;
}

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Batch Processing: 5 Demo + 5 Onboarding Transcripts");
  console.log("═══════════════════════════════════════════════════════\n");

  const results: {
    accountId: string;
    demoResult: string;
    onboardingResult: string;
  }[] = [];

  // Phase 1: Process all demo transcripts
  console.log("── Phase 1: Processing Demo Transcripts ──\n");
  for (const pair of PAIRS) {
    process.stdout.write(`  [DEMO] ${pair.accountId}... `);
    try {
      const transcript = await readTranscript(pair.demoFile, "demo_calls");
      const result = await processTranscript(
        pair.accountId,
        transcript,
        "demo"
      );
      if (result.success) {
        console.log(`✓ v${result.version} created`);
        results.push({
          accountId: pair.accountId,
          demoResult: `✓ v${result.version}`,
          onboardingResult: "pending",
        });
      } else if (result.alreadyExists) {
        console.log(`⊘ already exists (v1) — skipping`);
        results.push({
          accountId: pair.accountId,
          demoResult: `⊘ exists`,
          onboardingResult: "pending",
        });
      } else {
        console.log(`✗ ${result.message}`);
        results.push({
          accountId: pair.accountId,
          demoResult: `✗ ${result.message}`,
          onboardingResult: "skipped",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ERROR: ${msg}`);
      results.push({
        accountId: pair.accountId,
        demoResult: `✗ ${msg}`,
        onboardingResult: "skipped",
      });
    }
  }

  console.log("\n── Phase 2: Processing Onboarding Transcripts ──\n");
  for (let i = 0; i < PAIRS.length; i++) {
    const pair = PAIRS[i];
    if (results[i].onboardingResult === "skipped") {
      console.log(`  [ONBOARDING] ${pair.accountId}... skipped (demo failed)`);
      continue;
    }
    process.stdout.write(`  [ONBOARDING] ${pair.accountId}... `);
    try {
      const transcript = await readTranscript(pair.onboardingFile, "onboarding_calls");
      const result = await processTranscript(
        pair.accountId,
        transcript,
        "onboarding"
      );
      if (result.success) {
        console.log(`✓ v${result.version} created`);
        results[i].onboardingResult = `✓ v${result.version}`;
      } else {
        console.log(`✗ ${result.message}`);
        results[i].onboardingResult = `✗ ${result.message}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`✗ ERROR: ${msg}`);
      results[i].onboardingResult = `✗ ${msg}`;
    }
  }

  // Summary
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  SUMMARY");
  console.log("═══════════════════════════════════════════════════════\n");
  console.log(
    `  ${"Account ID".padEnd(25)} ${"Demo".padEnd(15)} Onboarding`
  );
  console.log(`  ${"─".repeat(25)} ${"─".repeat(15)} ${"─".repeat(15)}`);
  for (const r of results) {
    console.log(
      `  ${r.accountId.padEnd(25)} ${r.demoResult.padEnd(15)} ${r.onboardingResult}`
    );
  }

  const demoSuccess = results.filter((r) => r.demoResult.startsWith("✓")).length;
  const onboardSuccess = results.filter((r) =>
    r.onboardingResult.startsWith("✓")
  ).length;

  console.log(`\n  Total: ${demoSuccess}/5 demos, ${onboardSuccess}/5 onboardings processed`);
  console.log(`  Output directory: outputs/accounts/\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
