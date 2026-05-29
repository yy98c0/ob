#!/usr/bin/env node
/**
 * Pre-publish validation for Obsidian → content/ (local dry-run layer).
 * Use before Syncer Publish or with publish-from-obsidian.mjs.
 *
 * Usage:
 *   node scripts/pre-publish-check.mjs 测试-渲染.md
 *   node scripts/pre-publish-check.mjs --list publish-list.txt
 */
import fs from "node:fs"
import path from "node:path"
import { VAULT, assertAllowed, destinationFor, normalizeForQuartz, relFromArg } from "./file-policy.mjs"

function loadList(file) {
  const body = fs.readFileSync(file, "utf8")
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
}

const args = process.argv.slice(2)
const listIndex = args.indexOf("--list")

if (args.length === 0) {
  console.error("Usage: node scripts/pre-publish-check.mjs [--list file] <note.md> [more.md ...]")
  process.exit(1)
}

let inputs = args.filter((arg) => arg !== "--list")
if (listIndex !== -1) {
  const listFile = args[listIndex + 1]
  if (!listFile) {
    console.error("Missing list file after --list")
    process.exit(1)
  }
  inputs = loadList(listFile)
}

let failed = false

for (const arg of inputs) {
  try {
    const rel = relFromArg(arg)
    assertAllowed(rel)
    const src = path.join(VAULT, rel)
    if (!fs.existsSync(src)) {
      console.error(`✗ not found in vault: ${rel}`)
      failed = true
      continue
    }
    const dest = destinationFor(rel)
    const raw = fs.readFileSync(src, "utf8")
    const normalized = normalizeForQuartz(raw)
    const changed = raw !== normalized
    const hasTikz = /```\s*tikz/i.test(raw)
    const hasPrivateTag = /个人博客/.test(rel)

    console.log(`✓ ${rel}`)
    console.log(`  vault:  ${src}`)
    console.log(`  target: content/${rel}`)
    if (changed) console.log("  note:   content will be normalized (tikz/array fixes)")
    if (hasTikz) console.log("  note:   contains TikZ — run npm run check:publish after copy")
    if (hasPrivateTag) {
      console.error(`✗ path looks private: ${rel}`)
      failed = true
    }
    if (fs.existsSync(dest)) {
      const srcStat = fs.statSync(src)
      const destStat = fs.statSync(dest)
      if (srcStat.mtimeMs > destStat.mtimeMs) {
        console.log("  note:   vault copy is newer than content/")
      }
    }
  } catch (err) {
    console.error(`✗ ${arg}: ${err.message}`)
    failed = true
  }
}

console.log("")
if (failed) {
  console.error("Pre-publish check failed — do not Mark/Publish these paths.")
  process.exit(1)
}
console.log("Pre-publish check passed. Safe to Mark → Publish in Obsidian Syncer.")
