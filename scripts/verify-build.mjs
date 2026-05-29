#!/usr/bin/env node
/**
 * Post-build checks for publish readiness (run after npm run build).
 */
import fs from "node:fs"
import path from "node:path"

const publicDir = path.join(process.cwd(), "public")
const pages = [
  { file: "测试-渲染.html", minTikz: 1, label: "基础 TikZ 验收" },
  { file: "测试.html", minTikz: 6, minCallouts: 5, label: "完整 Obsidian 测试页" },
]

function countMatches(html, pattern) {
  return (html.match(pattern) ?? []).length
}

let failed = false

for (const { file, minTikz, minCallouts = 0, label } of pages) {
  const fp = path.join(publicDir, file)
  if (!fs.existsSync(fp)) {
    console.error(`✗ ${label}: missing ${file}`)
    failed = true
    continue
  }
  const html = fs.readFileSync(fp, "utf8")
  const ok = countMatches(html, /class="tikz-output"/g)
  const err = countMatches(html, /class="tikz-error"/g)
  const callouts = countMatches(html, /data-callout=/g)
  if (ok < minTikz) {
    console.error(`✗ ${label}: expected ≥${minTikz} tikz-output, got ${ok}`)
    failed = true
  } else if (callouts < minCallouts) {
    console.error(`✗ ${label}: expected ≥${minCallouts} callouts, got ${callouts}`)
    failed = true
  } else {
    console.log(`✓ ${label}: ${ok} TikZ SVG, ${err} TikZ errors, ${callouts} callouts`)
  }
}

const indexHtml = path.join(publicDir, "index.html")
if (fs.existsSync(indexHtml)) {
  console.log("✓ index.html present")
} else {
  console.error("✗ index.html missing")
  failed = true
}

process.exit(failed ? 1 : 0)
