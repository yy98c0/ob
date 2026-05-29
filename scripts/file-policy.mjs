import path from "node:path"

export const VAULT = process.env.OBSIDIAN_VAULT ?? "/Users/yy/Documents/Obsidian Vault"
export const CONTENT = path.join(process.cwd(), "content")

export const BLOCKED_PREFIXES = [
  "个人博客/",
  "个人博客\\",
  ".obsidian/",
  "templates/",
  "tmp/",
  "drafts/",
]

export const BLOCKED_EXTENSIONS = new Set([
  ".canvas",
  ".exe",
  ".dll",
  ".dylib",
  ".so",
])

export function normalizeForQuartz(text) {
  return text
    .replace(/```\s+tikz\b/g, "```tikz")
    .replace(/\$\$\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}\$\$/g, "$$\n\\begin{matrix}$1\\end{matrix}\n$$")
}

export function relFromArg(arg) {
  const normalized = arg.replace(/\\/g, "/").replace(/^\//, "")
  if (path.isAbsolute(arg)) {
    const rel = path.relative(VAULT, arg).replace(/\\/g, "/")
    if (rel.startsWith("..")) throw new Error(`Path is outside vault: ${arg}`)
    return rel
  }
  return normalized
}

export function assertAllowed(rel) {
  for (const prefix of BLOCKED_PREFIXES) {
    if (rel === prefix.replace(/\/$/, "") || rel.startsWith(prefix)) {
      throw new Error(`Refusing to publish private path: ${rel}`)
    }
  }

  const ext = path.extname(rel).toLowerCase()
  if (BLOCKED_EXTENSIONS.has(ext)) {
    throw new Error(`Refusing to publish unsupported file type: ${rel}`)
  }
}

export function destinationFor(rel) {
  return path.join(CONTENT, rel)
}
