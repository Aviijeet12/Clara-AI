import { promises as fs } from "fs";
import path from "path";
import type { AccountMemo, RetellAgentSpec, Changelog } from "./types";

const DATA_DIR = path.join(process.cwd(), "outputs", "accounts");

const IS_READ_ONLY = process.env.VERCEL === "1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accountDir(accountId: string): string {
  return path.join(DATA_DIR, accountId);
}

function versionDir(accountId: string, version: number): string {
  return path.join(accountDir(accountId), `v${version}`);
}

function memoPath(accountId: string, version: number): string {
  return path.join(versionDir(accountId, version), "account_memo.json");
}

function retellPath(accountId: string, version: number): string {
  return path.join(versionDir(accountId, version), "retell_agent.json");
}

function changelogPath(accountId: string): string {
  return path.join(accountDir(accountId), "changelog.json");
}

// ─── Directory operations ────────────────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  if (IS_READ_ONLY) return; // Skip on read-only filesystems (Vercel)
  await fs.mkdir(dir, { recursive: true });
}

// ─── Write operations ────────────────────────────────────────────────────────

export async function saveAccountMemo(
  accountId: string,
  version: number,
  data: AccountMemo
): Promise<string> {
  await ensureDir(versionDir(accountId, version));
  const filePath = memoPath(accountId, version);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

export async function saveRetellSpec(
  accountId: string,
  version: number,
  data: RetellAgentSpec
): Promise<string> {
  await ensureDir(versionDir(accountId, version));
  const filePath = retellPath(accountId, version);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

export async function saveChangelog(
  accountId: string,
  data: Changelog
): Promise<string> {
  await ensureDir(accountDir(accountId));
  const filePath = changelogPath(accountId);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

// ─── Read operations ─────────────────────────────────────────────────────────

export async function loadAccountMemo(
  accountId: string,
  version: number
): Promise<AccountMemo | null> {
  try {
    const raw = await fs.readFile(memoPath(accountId, version), "utf-8");
    return JSON.parse(raw) as AccountMemo;
  } catch {
    return null;
  }
}

export async function loadRetellSpec(
  accountId: string,
  version: number
): Promise<RetellAgentSpec | null> {
  try {
    const raw = await fs.readFile(retellPath(accountId, version), "utf-8");
    return JSON.parse(raw) as RetellAgentSpec;
  } catch {
    return null;
  }
}

export async function loadChangelog(
  accountId: string
): Promise<Changelog | null> {
  try {
    const raw = await fs.readFile(changelogPath(accountId), "utf-8");
    return JSON.parse(raw) as Changelog;
  } catch {
    return null;
  }
}

// ─── Query operations ────────────────────────────────────────────────────────

export async function getAccountVersions(
  accountId: string
): Promise<number[]> {
  try {
    const dir = accountDir(accountId);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const versions = entries
      .filter((e) => e.isDirectory() && /^v\d+$/.test(e.name))
      .map((e) => parseInt(e.name.replace("v", ""), 10))
      .sort((a, b) => a - b);
    return versions;
  } catch {
    return [];
  }
}

export async function listAllAccounts(): Promise<string[]> {
  try {
    await ensureDir(DATA_DIR);
    const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function accountExists(accountId: string): Promise<boolean> {
  try {
    await fs.access(accountDir(accountId));
    return true;
  } catch {
    return false;
  }
}
