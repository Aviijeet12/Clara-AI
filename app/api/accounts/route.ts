import { NextResponse } from "next/server";
import {
  listAllAccounts,
  getAccountVersions,
  loadAccountMemo,
} from "@/lib/storage";
import type { AccountListItem } from "@/lib/types";

export async function GET() {
  try {
    const accountIds = await listAllAccounts();

    const accounts: AccountListItem[] = [];

    for (const accountId of accountIds) {
      const versions = await getAccountVersions(accountId);
      const latestVersion = versions.length > 0 ? Math.max(...versions) : 0;
      const memo = latestVersion > 0 ? await loadAccountMemo(accountId, latestVersion) : null;

      accounts.push({
        accountId,
        versions,
        latestType: memo?.type || "unknown",
        updatedAt: memo?.updated_at || new Date().toISOString(),
      });
    }

    // Sort by most recently updated
    accounts.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({ success: true, accounts });
  } catch (error) {
    console.error("Accounts list API error:", error);
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
