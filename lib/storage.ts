import { promises as fs } from "fs";
import path from "path";
import type { AccountMemo, RetellAgentSpec, Changelog } from "./types";

const IS_VERCEL = process.env.VERCEL === "1";

// On Vercel the bundled outputs/ is read-only; /tmp is the only writable dir.
// We read from both locations (tmp first, then bundled) so pre-shipped accounts
// are still visible while new accounts written to /tmp work within the request.
const BUNDLED_DIR = path.join(process.cwd(), "outputs", "accounts");
const WRITE_DIR = IS_VERCEL
  ? path.join("/tmp", "accounts")
  : BUNDLED_DIR;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function accountDir(accountId: string, base = WRITE_DIR): string {
  return path.join(base, accountId);
}

function versionDir(accountId: string, version: number, base = WRITE_DIR): string {
  return path.join(accountDir(accountId, base), `v${version}`);
}

function memoPath(accountId: string, version: number, base = WRITE_DIR): string {
  return path.join(versionDir(accountId, version, base), "account_memo.json");
}

function retellPath(accountId: string, version: number, base = WRITE_DIR): string {
  return path.join(versionDir(accountId, version, base), "retell_agent.json");
}

function changelogPath(accountId: string, base = WRITE_DIR): string {
  return path.join(accountDir(accountId, base), "changelog.json");
}

// ─── Directory operations ────────────────────────────────────────────────────

async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
}

/** Check if a path exists */
async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

// ─── Write operations ────────────────────────────────────────────────────────

export async function saveAccountMemo(
  accountId: string,
  version: number,
  data: AccountMemo
): Promise<string> {
  const dir = versionDir(accountId, version, WRITE_DIR);
  await ensureDir(dir);
  const filePath = memoPath(accountId, version, WRITE_DIR);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

export async function saveRetellSpec(
  accountId: string,
  version: number,
  data: RetellAgentSpec
): Promise<string> {
  const dir = versionDir(accountId, version, WRITE_DIR);
  await ensureDir(dir);
  const filePath = retellPath(accountId, version, WRITE_DIR);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

export async function saveChangelog(
  accountId: string,
  data: Changelog
): Promise<string> {
  await ensureDir(accountDir(accountId, WRITE_DIR));
  const filePath = changelogPath(accountId, WRITE_DIR);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
  return filePath;
}

// ─── Read operations ─────────────────────────────────────────────────────────

/** Read a file, checking WRITE_DIR first then BUNDLED_DIR (for Vercel) */
async function readWithFallback(primaryPath: string, bundledPath: string): Promise<string | null> {
  try {
    return await fs.readFile(primaryPath, "utf-8");
  } catch {
    if (IS_VERCEL && primaryPath !== bundledPath) {
      try {
        return await fs.readFile(bundledPath, "utf-8");
      } catch {
        return null;
      }
    }
    return null;
  }
}

export async function loadAccountMemo(
  accountId: string,
  version: number
): Promise<AccountMemo | null> {
  const raw = await readWithFallback(
    memoPath(accountId, version, WRITE_DIR),
    memoPath(accountId, version, BUNDLED_DIR)
  );
  return raw ? (JSON.parse(raw) as AccountMemo) : null;
}

export async function loadRetellSpec(
  accountId: string,
  version: number
): Promise<RetellAgentSpec | null> {
  const raw = await readWithFallback(
    retellPath(accountId, version, WRITE_DIR),
    retellPath(accountId, version, BUNDLED_DIR)
  );
  return raw ? (JSON.parse(raw) as RetellAgentSpec) : null;
}

export async function loadChangelog(
  accountId: string
): Promise<Changelog | null> {
  const raw = await readWithFallback(
    changelogPath(accountId, WRITE_DIR),
    changelogPath(accountId, BUNDLED_DIR)
  );
  return raw ? (JSON.parse(raw) as Changelog) : null;
}

// ─── Query operations ────────────────────────────────────────────────────────

/** List version dirs from a single base, returning numbers */
async function versionsFromDir(base: string, accountId: string): Promise<number[]> {
  try {
    const dir = accountDir(accountId, base);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && /^v\d+$/.test(e.name))
      .map((e) => parseInt(e.name.replace("v", ""), 10));
  } catch {
    return [];
  }
}

export async function getAccountVersions(
  accountId: string
): Promise<number[]> {
  const fromWrite = await versionsFromDir(WRITE_DIR, accountId);
  const fromBundled = IS_VERCEL
    ? await versionsFromDir(BUNDLED_DIR, accountId)
    : [];
  const merged = [...new Set([...fromWrite, ...fromBundled])];
  return merged.sort((a, b) => a - b);
}

/** List account dirs from a single base */
async function accountsFromDir(base: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(base, { withFileTypes: true });
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function listAllAccounts(): Promise<string[]> {
  await ensureDir(WRITE_DIR);
  const fromWrite = await accountsFromDir(WRITE_DIR);
  const fromBundled = IS_VERCEL
    ? await accountsFromDir(BUNDLED_DIR)
    : [];
  return [...new Set([...fromWrite, ...fromBundled])].sort();
}

export async function accountExists(accountId: string): Promise<boolean> {
  if (await pathExists(accountDir(accountId, WRITE_DIR))) return true;
  if (IS_VERCEL && await pathExists(accountDir(accountId, BUNDLED_DIR))) return true;
  return false;
}
