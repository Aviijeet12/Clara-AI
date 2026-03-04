import { NextRequest, NextResponse } from "next/server";
import {
  loadAccountMemo,
  loadRetellSpec,
  loadChangelog,
  getAccountVersions,
} from "@/lib/storage";
import type { AccountDataResponse } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { accountId } = await params;

    if (!accountId) {
      return NextResponse.json(
        { success: false, message: "accountId is required" },
        { status: 400 }
      );
    }

    const versions = await getAccountVersions(accountId);

    if (versions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: `No data found for account "${accountId}"`,
        },
        { status: 404 }
      );
    }

    // Get optional version query param
    const url = new URL(request.url);
    const requestedVersion = url.searchParams.get("version");
    const currentVersion = requestedVersion
      ? parseInt(requestedVersion, 10)
      : Math.max(...versions);

    // Load data for the requested version
    const memo = await loadAccountMemo(accountId, currentVersion);
    const retellSpec = await loadRetellSpec(accountId, currentVersion);
    const changelog = await loadChangelog(accountId);

    if (!memo) {
      return NextResponse.json(
        {
          success: false,
          message: `Version ${currentVersion} not found for account "${accountId}"`,
        },
        { status: 404 }
      );
    }

    // Load all versions for the full picture
    const allMemos: Record<number, any> = {};
    const allRetellSpecs: Record<number, any> = {};

    for (const v of versions) {
      const m = await loadAccountMemo(accountId, v);
      const r = await loadRetellSpec(accountId, v);
      if (m) allMemos[v] = m;
      if (r) allRetellSpecs[v] = r;
    }

    const response: AccountDataResponse = {
      accountId,
      versions,
      currentVersion,
      memo,
      retellSpec: retellSpec!,
      changelog,
      allMemos,
      allRetellSpecs,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Account API error:", error);
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
