import { NextRequest, NextResponse } from "next/server";
import type { ProcessRequest, ProcessResponse } from "@/lib/types";
import {
  extractStructuredData,
  mergeAccountData,
  generateRetellSpec,
  generateChangelog,
} from "@/lib/engine";
import {
  saveAccountMemo,
  saveRetellSpec,
  saveChangelog,
  loadAccountMemo,
  getAccountVersions,
} from "@/lib/storage";

const IS_VERCEL = process.env.VERCEL === "1";

export async function POST(request: NextRequest) {
  try {
    // On Vercel, writes are ephemeral — warn but still process
    const vercelWarning = IS_VERCEL
      ? " (Note: Running on Vercel — data is processed but will not persist across requests. Use Docker for persistent storage.)"
      : "";

    let body: ProcessRequest;
    try {
      body = (await request.json()) as ProcessRequest;
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // ── Validate input ──
    if (!body.accountId || typeof body.accountId !== "string") {
      return NextResponse.json(
        { success: false, message: "accountId is required" },
        { status: 400 }
      );
    }
    if (!body.transcript || typeof body.transcript !== "string") {
      return NextResponse.json(
        { success: false, message: "transcript is required" },
        { status: 400 }
      );
    }
    if (!["demo", "onboarding"].includes(body.type)) {
      return NextResponse.json(
        { success: false, message: 'type must be "demo" or "onboarding"' },
        { status: 400 }
      );
    }

    const { accountId, transcript, type } = body;

    // ── DEMO flow ──
    if (type === "demo") {
      // Idempotency: check if account already has demo data
      const existingVersions = await getAccountVersions(accountId);
      if (existingVersions.length > 0) {
        const existingMemo = await loadAccountMemo(accountId, 1);
        if (existingMemo && existingMemo.type === "demo") {
          return NextResponse.json(
            {
              success: false,
              message: `Account "${accountId}" already has demo data (v1). Use type "onboarding" to update, or choose a different account ID.`,
            },
            { status: 409 }
          );
        }
      }

      const extracted = extractStructuredData(transcript, accountId, "demo");
      extracted.version = 1;

      const retell = generateRetellSpec(extracted);

      // Save to disk (non-fatal on Vercel where filesystem is read-only/ephemeral)
      try {
        await saveAccountMemo(accountId, 1, extracted);
        await saveRetellSpec(accountId, 1, retell);
      } catch (saveErr) {
        console.warn("File save failed (expected on Vercel):", saveErr);
      }

      const response: ProcessResponse = {
        success: true,
        message: `Demo transcript processed successfully. v1 files created.${vercelWarning}`,
        accountId,
        version: 1,
        files: ["v1/account_memo.json", "v1/retell_agent.json"],
        data: { memo: extracted, retellSpec: retell },
      };
      return NextResponse.json(response, { status: 201 });
    }

    // ── ONBOARDING flow ──
    if (type === "onboarding") {
      // Must have existing v1
      const versions = await getAccountVersions(accountId);
      if (versions.length === 0) {
        return NextResponse.json(
          {
            success: false,
            message: `No existing data found for account "${accountId}". Please process a demo transcript first.`,
          },
          { status: 400 }
        );
      }

      const latestVersion = Math.max(...versions);
      const existingMemo = await loadAccountMemo(accountId, latestVersion);
      if (!existingMemo) {
        return NextResponse.json(
          { success: false, message: "Failed to load existing account memo." },
          { status: 500 }
        );
      }

      // Extract new structured data from onboarding transcript
      const newExtracted = extractStructuredData(
        transcript,
        accountId,
        "onboarding"
      );

      // Merge: onboarding overrides demo
      const merged = mergeAccountData(existingMemo, newExtracted);
      const newVersion = merged.version;

      // Generate retell spec for new version
      const retell = generateRetellSpec(merged);

      // Generate changelog
      const changelog = generateChangelog(existingMemo, merged);

      // Save to disk (non-fatal on Vercel where filesystem is read-only/ephemeral)
      try {
        await saveAccountMemo(accountId, newVersion, merged);
        await saveRetellSpec(accountId, newVersion, retell);
        await saveChangelog(accountId, changelog);
      } catch (saveErr) {
        console.warn("File save failed (expected on Vercel):", saveErr);
      }

      const response: ProcessResponse = {
        success: true,
        message: `Onboarding transcript processed. v${newVersion} files created.${vercelWarning}`,
        accountId,
        version: newVersion,
        files: [
          `v${newVersion}/account_memo.json`,
          `v${newVersion}/retell_agent.json`,
          "changelog.json",
        ],
        data: { memo: merged, retellSpec: retell, changelog },
      };
      return NextResponse.json(response, { status: 201 });
    }

    return NextResponse.json(
      { success: false, message: "Invalid type" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Process API error:", error);
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
