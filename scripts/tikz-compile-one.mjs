#!/usr/bin/env node
/**
 * Compile one TikZ/LaTeX snippet to SVG in an isolated Node process.
 */
import { readFileSync } from "node:fs"

async function main() {
  const data = readFileSync(0, "utf8")
  const payload = JSON.parse(data)

  const mod = await import("node-tikzjax")
  const tex2svg = mod.default?.default ?? mod.default
  if (typeof tex2svg !== "function") {
    throw new Error("node-tikzjax: could not resolve tex2svg export")
  }

  const svg = await tex2svg(payload.source, payload.options ?? {})
  process.stdout.write(svg)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})
