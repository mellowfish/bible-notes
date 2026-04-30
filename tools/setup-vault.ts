// Idempotent vault scaffolding. Per D12: copy the tracked starter
// `vault/_templates/CLAUDE.md` to `vault/CLAUDE.md` (gitignored, per-user),
// and ship `tools/snippets/bible-flow.css` into `vault/.obsidian/snippets/`
// so the chapter-rendering CSS is available without manual copy.
//
// Designed to be safe to re-run: never overwrites an existing destination.

import { mkdir, copyFile, access } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = dirname(HERE);

type Copy = { from: string; to: string; label: string };

function defaultCopies(vaultRoot: string): Copy[] {
  return [
    {
      from: join(REPO_ROOT, "vault", "_templates", "CLAUDE.md"),
      to: join(vaultRoot, "CLAUDE.md"),
      label: "vault/CLAUDE.md (per-user operating manual)",
    },
    {
      from: join(REPO_ROOT, "tools", "snippets", "bible-flow.css"),
      to: join(vaultRoot, ".obsidian", "snippets", "bible-flow.css"),
      label: "vault/.obsidian/snippets/bible-flow.css",
    },
  ];
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function runSetup(vaultRoot: string): Promise<{ copied: string[]; skipped: string[] }> {
  const copied: string[] = [];
  const skipped: string[] = [];
  for (const c of defaultCopies(vaultRoot)) {
    if (await exists(c.to)) {
      skipped.push(c.label);
      continue;
    }
    await mkdir(dirname(c.to), { recursive: true });
    await copyFile(c.from, c.to);
    copied.push(c.label);
  }
  return { copied, skipped };
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { vault: { type: "string" } },
  });
  const vault = values.vault ?? join(REPO_ROOT, "vault");
  const { copied, skipped } = await runSetup(vault);
  for (const c of copied) console.log(`+ created ${c}`);
  for (const s of skipped) console.log(`= already present: ${s}`);
  if (copied.length === 0) console.log("Vault scaffolding already in place.");
}

// Run only if invoked directly (not when imported by import-usfm.ts).
const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
