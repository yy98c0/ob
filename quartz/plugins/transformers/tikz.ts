import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { visit } from "unist-util-visit"
import type { Code, Parent, Root } from "mdast"
import type { VFile } from "vfile"
import type { QuartzTransformerPlugin } from "../types"

/** Matches Obsidian ```tikz fences (optional space after backticks). */
const TIKZ_FENCE_RE = /```\s*tikz\n([\s\S]*?)```/g

const COMPILE_SCRIPT = path.join(process.cwd(), "scripts/tikz-compile-one.mjs")

declare module "vfile" {
  interface DataMap {
    quartzTikzBlocks?: string[]
  }
}

/**
 * OFM's micromark tokenizer treats `|` inside $$\\begin{array}{|c|...}` as table syntax
 * and breaks the rest of the document (including ```tikz fences).
 */
export function sanitiseMarkdownForQuartz(src: string): string {
  return src.replace(
    /\$\$\\begin\{array\}\{[^}]*\}([\s\S]*?)\\end\{array\}\$\$/g,
    "$$\n\\begin{matrix}$1\\end{matrix}\n$$",
  )
}

/**
 * Replace ```tikz bodies with lightweight stubs before OFM's micromark extensions run.
 * ObsidianFlavoredMarkdown can swallow multi-line tikz fences during parse.
 */
export function isolateTikzFences(file: VFile): string {
  const blocks: string[] = []
  const value = sanitiseMarkdownForQuartz(file.value.toString())
  const replaced = value.replace(TIKZ_FENCE_RE, (_match, body: string) => {
    const id = blocks.length
    blocks.push(body.trim())
    return `\n\n\`\`\`quartz-tikz\n${id}\n\`\`\`\n\n`
  })
  file.data.quartzTikzBlocks = blocks
  return replaced
}

const CACHE_DIR = path.join(process.cwd(), ".quartz", "tikz-cache")

interface Options {
  enableTikZ: boolean
  texPackages?: Record<string, string>
  tikzLibraries?: string
  addToPreamble?: string
}

interface CompileOptions {
  texPackages: Record<string, string>
  tikzLibraries: string
  addToPreamble: string
  embedFontCss: boolean
  showConsole?: boolean
}

const DEFAULT_TIKZ_LIBRARIES =
  "arrows.meta,calc,decorations.markings,decorations.pathreplacing,positioning"

const DEFAULT_ADD_TO_PREAMBLE = String.raw`\pgfplotsset{compat=1.16}`

function cacheKey(source: string, opts: CompileOptions): string {
  return createHash("sha256").update(source).update(JSON.stringify(opts)).digest("hex")
}

function readCache(key: string): string | null {
  const file = path.join(CACHE_DIR, `${key}.svg`)
  if (!fs.existsSync(file)) return null
  return fs.readFileSync(file, "utf-8")
}

function writeCache(key: string, svg: string) {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  fs.writeFileSync(path.join(CACHE_DIR, `${key}.svg`), svg, "utf-8")
}

/** Align with obsidian-tikzjax: body is usually already wrapped in \\begin{document}...\\end{document}. */
function wrapTikzBody(body: string): string {
  const trimmed = body.trim()
  if (trimmed.includes("\\begin{document}")) return trimmed
  return `\\begin{document}\n${trimmed}\n\\end{document}`
}

function normaliseTikzMath(source: string): string {
  return source
    .replace(/\r\n?/g, "\n")
    // node-tikzjax can fail on `\\boldsymbol` when the bold math font isn't available.
    // `\\mathbf` is much more portable for the TikZ figures in this repo.
    .replace(/\\hat\{\\boldsymbol\{([^{}]+)\}\}/g, "\\\\hat{\\\\mathbf{$1}}")
    .replace(/\\boldsymbol\{([^{}]+)\}/g, "\\\\mathbf{$1}")
    // node-tikzjax + tikz-cd: extra blank lines inside/at the end of a diagram break TeX.
    .replace(/\\begin\{tikzcd\}(\[[^\]]*\])?\s*\n\s*\n/g, "\\begin{tikzcd}$1\n")
    .replace(/\n[ \t]*\n(\\end\{tikzcd\})/g, "\n$1")
    .replace(
      /(\\usepackage(?:\[[^\]]*\])?\{[^}]+\})\s*\n\s*\n(\\begin\{document\})/g,
      "$1\n$2",
    )
    // Remove invisible characters that commonly sneak into copied Markdown/TikZ.
    .replace(/[\u00a0\u200b\u200c\u200d\ufeff]/g, " ")
    // Normalize odd whitespace around TeX tokens so the isolated compile path is stable.
    .replace(/[\t\r]+/g, " ")
}

function packagesAlreadyInSource(source: string, packageName: string): boolean {
  return new RegExp(`\\\\usepackage(?:\\[[^\\]]*\\])?\\{${packageName}\\}`).test(source)
}

/** Load only packages the snippet needs — injecting every node-tikzjax package blows TeX pool memory. */
const PACKAGE_HINTS: ReadonlyArray<readonly [string, RegExp]> = [
  ["tikz-cd", /\\begin\{tikzcd\}/],
  ["chemfig", /\\chemfig\b/],
  ["pgfplots", /\\begin\{axis\}|\\addplot\d*/],
  ["circuitikz", /\\begin\{circuitikz\}/],
  ["tikz-3dplot", /\\tdplot\w+/],
  ["amsmath", /\\begin\{(?:align|equation|gather|multline)\*?\}|\\operatorname\b/],
  ["amssymb", /\\mathbb\b|\\varnothing\b/],
  ["amsfonts", /\\mathfrak\b/],
]

function buildTexPackages(source: string, extra?: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...(extra ?? {}) }
  for (const [pkg, pattern] of PACKAGE_HINTS) {
    if (pattern.test(source) && !packagesAlreadyInSource(source, pkg)) {
      out[pkg] ??= ""
    }
  }
  return out
}

function preambleForPackages(texPackages: Record<string, string>, base: string): string {
  if (!("pgfplots" in texPackages) && !/\\begin\{axis\}|\\addplot\d*/.test(base)) {
    return ""
  }
  return base
}

/** node-tikzjax may return a pseudo-SVG string that embeds the TeX log on failure. */
function svgLooksBroken(svg: string): boolean {
  return /TeX capacity exceeded|! (?:LaTeX Error|Package|Undefined control sequence|Missing \$)/.test(svg)
}

function isTikzCodeBlock(lang: string | null | undefined): boolean {
  const normalized = (lang ?? "").trim().toLowerCase()
  return normalized === "tikz" || normalized === "quartz-tikz"
}

function resolveTikzSource(node: Code, file: VFile): string {
  const lang = (node.lang ?? "").trim().toLowerCase()
  if (lang === "quartz-tikz") {
    const id = Number.parseInt(node.value.trim(), 10)
    const blocks = file.data.quartzTikzBlocks
    if (blocks && Number.isFinite(id) && blocks[id] !== undefined) {
      return blocks[id]
    }
    throw new Error(`Missing TikZ block #${node.value.trim()}`)
  }
  return node.value
}

/** Each diagram in its own process — same idea as Obsidian's isolated TikZJax runs. */
function compileTikzToSvg(source: string, options: CompileOptions): string {
  const payload = JSON.stringify({ source, options })
  const result = spawnSync(process.execPath, [COMPILE_SCRIPT], {
    input: payload,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: 180_000,
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "unknown error").trim()
    throw new Error(detail.slice(0, 2000))
  }
  return result.stdout
}

export const TikZ: QuartzTransformerPlugin<Options> = (opts) => {
  const enableTikZ = opts?.enableTikZ ?? true
  const extraPackages = opts?.texPackages ?? {}
  const tikzLibraries = opts?.tikzLibraries ?? DEFAULT_TIKZ_LIBRARIES
  const addToPreamble = opts?.addToPreamble ?? DEFAULT_ADD_TO_PREAMBLE

  return {
    name: "TikZ",
    markdownPlugins() {
      return [
        () => {
          return async (tree: Root, file: VFile) => {
            if (!enableTikZ) return

            const jobs: { node: Code; index: number; parent: Parent }[] = []

            visit(tree, "code", (node: Code, index, parent) => {
              if (!isTikzCodeBlock(node.lang) || !parent || index === undefined) return
              jobs.push({ node, index, parent })
            })

            for (const { node, index, parent } of jobs) {
              const raw = resolveTikzSource(node, file)
              const source = normaliseTikzMath(wrapTikzBody(raw))
              const texPackages = buildTexPackages(source, extraPackages)
              const compileOpts: CompileOptions = {
                texPackages,
                tikzLibraries,
                addToPreamble: preambleForPackages(texPackages, addToPreamble),
                embedFontCss: true,
                showConsole: process.env.TIKZ_DEBUG === "1",
              }
              const key = cacheKey(source, compileOpts)

              try {
                let svg = readCache(key)
                if (!svg || svgLooksBroken(svg)) {
                  try {
                    svg = compileTikzToSvg(source, compileOpts)
                    if (svgLooksBroken(svg)) {
                      throw new Error("TeX reported errors in SVG output")
                    }
                  } catch (error) {
                    const fallbackSource = source
                      .replace(/\\mathbf\{([^{}]+)\}/g, "$1")
                      .replace(/\\usepackage\{amssymb\}/g, "")
                      .replace(/\\usepackage\{amsfonts\}/g, "")
                    if (fallbackSource !== source) {
                      svg = compileTikzToSvg(fallbackSource, {
                        ...compileOpts,
                        texPackages: {
                          ...compileOpts.texPackages,
                          amssymb: "",
                          amsfonts: "",
                        },
                      })
                      if (svgLooksBroken(svg)) {
                        throw new Error("TeX reported errors in SVG output (math font fallback)")
                      }
                    } else {
                      throw error
                    }
                  }
                  writeCache(key, svg)
                }
                parent.children[index] = {
                  type: "html",
                  value: `<figure class="tikz-output">${svg}</figure>`,
                }
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error)
                const slug = (file.data as { slug?: string }).slug ?? file.path ?? "?"
                console.error(`[TikZ] ${slug} block ${index}: ${msg.split("\n")[0]}`)
                parent.children[index] = {
                  type: "html",
                  value: `<!-- TikZ build error --><pre class="tikz-error">TikZ 渲染失败: ${msg.replace(/</g, "&lt;").slice(0, 500)}</pre>`,
                }
              }
            }
          }
        },
      ]
    },
  }
}
