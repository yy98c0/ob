#!/usr/bin/env node
/**
 * Publish selected notes from an Obsidian Vault into Quartz content/.
 * This is a local helper for the first automated publishing workflow.
 * It intentionally refuses private paths and can run in dry-run mode.
 *
 * Usage:
 *   node scripts/publish-from-obsidian.mjs 测试-渲染.md
 *   node scripts/publish-from-obsidian.mjs --dry-run "知识/力学/*.md"
 *   node scripts/publish-from-obsidian.mjs --list ./publish-list.txt
 */
import fs from "node:fs"
import path from "node:path"
import { CONTENT, VAULT, assertAllowed, destinationFor, normalizeForQuartz, relFromArg } from "./file-policy.mjs"

const LOG_DIR = path.join(process.cwd(), ".quartz")
const LOG_FILE = path.join(LOG_DIR, "publish-log.json")

function loadList(file) {
  const body = fs.readFileSync(file, "utf8")
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

const args = process.argv.slice(2)
const dryRun = args.includes("--dry-run")
const listIndex = args.indexOf("--list")

if (args.length === 0) {
  console.error("Usage: node scripts/publish-from-obsidian.mjs [--dry-run] [--list file] <note.md> [more.md ...]")
  process.exit(1)
}

let inputs = args.filter((arg) => !["--dry-run", "--list"].includes(arg))
if (listIndex !== -1) {
  const listFile = args[listIndex + 1]
  if (!listFile) {
    console.error("Missing list file after --list")
    process.exit(1)
  }
  inputs = loadList(listFile)
}

const results = []
for (const arg of inputs) {
  const rel = relFromArg(arg)
  assertAllowed(rel)
  const src = path.join(VAULT, rel)
  if (!fs.existsSync(src)) {
    console.error(`Not found: ${src}`)
    process.exit(1)
  }
  const dest = destinationFor(rel)
  const body = normalizeForQuartz(fs.readFileSync(src, "utf8"))
  results.push({ rel, src, dest, bytes: Buffer.byteLength(body, "utf8") })

  if (!dryRun) {
    fs.mkdirSync(path.dirname(dest), { recursive: true })
    fs.writeFileSync(dest, body, "utf8")
    console.log(`✓ content/${rel}`)
  } else {
    console.log(`↗ dry-run content/${rel}`)
  }
}

if (!dryRun) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
  fs.writeFileSync(
    LOG_FILE,
    JSON.stringify(
      {
        at: new Date().toISOString(),
        vault: VAULT,
        content: CONTENT,
        files: results,
      },
      null,
      2,
    ),
    "utf8",
  )
}

console.log(dryRun ? "Dry run complete." : "Publish copy complete.")
