#!/usr/bin/env node
/**
 * Copy one or more notes from Obsidian Vault into content/ for local Quartz preview.
 * Does not push to GitHub — use Quartz Syncer for publishing.
 *
 * Usage:
 *   node scripts/pull-from-obsidian.mjs 测试.md
 *   node scripts/pull-from-obsidian.mjs "个人博客/foo.md"   # blocked by default
 */
import fs from "node:fs"
import path from "node:path"
import { VAULT, assertAllowed, destinationFor, normalizeForQuartz, relFromArg } from "./file-policy.mjs"

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error(`Usage: node scripts/pull-from-obsidian.mjs <note.md> [more.md ...]`)
  console.error(`Vault: ${VAULT}`)
  process.exit(1)
}

for (const arg of args) {
  const rel = relFromArg(arg)
  assertAllowed(rel)
  const src = path.join(VAULT, rel)
  if (!fs.existsSync(src)) {
    console.error(`Not found: ${src}`)
    process.exit(1)
  }
  const dest = destinationFor(rel)
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  const body = normalizeForQuartz(fs.readFileSync(src, "utf8"))
  fs.writeFileSync(dest, body, "utf8")
  console.log(`→ content/${rel}`)
}

console.log("Done. Run: npm run build && npm run dev")
