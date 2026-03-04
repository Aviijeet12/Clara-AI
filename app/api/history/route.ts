import { NextResponse } from "next/server";
import {
  listAllAccounts,
  getAccountVersions,
  loadAccountMemo,
  loadChangelog,
} from "@/lib/storage";
import type { HistoryEntry } from "@/lib/types";

export async function GET() {
  try {
    const accountIds = await listAllAccounts();
    const history: HistoryEntry[] = [];

    for (const accountId of accountIds) {
      const versions = await getAccountVersions(accountId);
      const changelog = await loadChangelog(accountId);

      for (const version of versions) {
        const memo = await loadAccountMemo(accountId, version);
        if (!memo) continue;

        history.push({
          id: `${accountId}-v${version}`,
          accountId,
          version,
          type: memo.type,
          createdAt: memo.created_at,
          changesCount:
            version > 1 && changelog ? changelog.total_changes : 0,
          changelog: version > 1 ? changelog : null,
        });
      }
    }

    // Sort newest first
    history.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("History API error:", error);
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
