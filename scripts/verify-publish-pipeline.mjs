#!/usr/bin/env node
/**
 * Verify Obsidian Syncer → GitHub → Actions → Pages pipeline readiness.
 * Run before first Mark/Publish or after changing repo/Pages settings.
 */
import fs from "node:fs"
import path from "node:path"
import { execSync } from "node:child_process"
import { parse as parseYaml } from "yaml"
import { BLOCKED_PREFIXES, VAULT } from "./file-policy.mjs"

const ROOT = process.cwd()
const PLACEHOLDER_BASE_URLS = new Set([
  "quartz.jzhao.xyz",
  "YOUR_USERNAME.github.io/3b1b-blog",
  "your-username.github.io/your-repo",
])

let failed = false
let warned = false

function ok(msg) {
  console.log(`✓ ${msg}`)
}

function warn(msg) {
  console.warn(`⚠ ${msg}`)
  warned = true
}

function fail(msg) {
  console.error(`✗ ${msg}`)
  failed = true
}

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8")
}

function git(cmd) {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: "utf8" }).trim()
  } catch {
    return null
  }
}

// --- quartz.config.yaml ---
const configPath = path.join(ROOT, "quartz.config.yaml")
if (!fs.existsSync(configPath)) {
  fail("quartz.config.yaml missing")
} else {
  const config = parseYaml(readText("quartz.config.yaml"))
  const baseUrl = config?.configuration?.baseUrl ?? ""
  const ignorePatterns = config?.configuration?.ignorePatterns ?? []
  const explicitPublish = config?.plugins?.find(
    (p) => typeof p === "object" && p.source?.includes("explicit-publish"),
  )

  if (!baseUrl) {
    fail("configuration.baseUrl is empty")
  } else if (PLACEHOLDER_BASE_URLS.has(baseUrl)) {
    fail(`configuration.baseUrl still placeholder: ${baseUrl}`)
  } else {
    ok(`baseUrl: ${baseUrl}`)
  }

  if (ignorePatterns.some((p) => String(p).includes("个人博客"))) {
    ok("ignorePatterns includes 个人博客")
  } else {
    fail("ignorePatterns must include 个人博客 as build-time safety net")
  }

  if (explicitPublish?.enabled === false) {
    ok("explicit-publish disabled (Syncer mark-only strategy)")
  } else if (explicitPublish?.enabled === true) {
    warn("explicit-publish enabled — publish filtering differs from Syncer-only plan")
  }
}

// --- GitHub Actions workflow ---
const workflowPath = ".github/workflows/deploy-github-pages.yml"
if (!fs.existsSync(path.join(ROOT, workflowPath))) {
  fail(`${workflowPath} missing`)
} else {
  const workflow = readText(workflowPath)
  if (/branches:\s*\n\s*-\s*main/m.test(workflow) || /-\s*master/.test(workflow)) {
    ok("Pages deploy workflow triggers on main/master push")
  } else {
    fail("Pages deploy workflow must trigger on main/master push")
  }
  if (workflow.includes("npx quartz build")) {
    ok("workflow runs quartz build")
  } else {
    fail("workflow missing quartz build step")
  }
}

// --- file policy ---
if (BLOCKED_PREFIXES.some((p) => p.startsWith("个人博客"))) {
  ok("file-policy blocks 个人博客/")
} else {
  fail("file-policy must block 个人博客/")
}

// --- Obsidian vault ---
if (fs.existsSync(VAULT)) {
  ok(`Obsidian vault: ${VAULT}`)
} else {
  warn(`Obsidian vault not found: ${VAULT}`)
}

// --- git remote ---
const remote = git("remote get-url origin")
if (remote) {
  ok(`git remote origin: ${remote}`)
  const branch = git("branch --show-current")
  if (branch === "main" || branch === "master") {
    ok(`current branch: ${branch}`)
  } else if (branch) {
    warn(`current branch is ${branch}; Pages workflow expects main or master`)
  }
  const commitCount = git("rev-list --count HEAD 2>/dev/null")
  if (commitCount === "0" || commitCount === null) {
    warn("no commits yet — push to GitHub before Syncer Publish can trigger Actions")
  }
} else {
  warn("git remote origin not configured — add GitHub repo before Syncer Publish")
}

// --- content smoke pages ---
for (const note of ["测试-渲染.md", "index.md"]) {
  const fp = path.join(ROOT, "content", note)
  if (fs.existsSync(fp)) {
    ok(`content/${note} present`)
  } else {
    warn(`content/${note} missing (smoke test page)`)
  }
}

// --- CNAME vs baseUrl hint ---
const cnamePath = path.join(ROOT, "public/CNAME")
if (fs.existsSync(cnamePath)) {
  const cname = readText("public/CNAME").trim()
  const baseUrl = parseYaml(readText("quartz.config.yaml"))?.configuration?.baseUrl ?? ""
  if (cname && baseUrl && !baseUrl.startsWith(cname) && cname !== baseUrl) {
    warn(`public/CNAME (${cname}) may not match baseUrl (${baseUrl}) — confirm Pages URL`)
  }
}

console.log("")
if (failed) {
  console.error("Pipeline verification failed. Fix items above before Syncer Publish.")
  process.exit(1)
}
if (warned) {
  console.log("Pipeline mostly ready — resolve warnings before production publish.")
  process.exit(0)
}
console.log("Pipeline verification passed.")
