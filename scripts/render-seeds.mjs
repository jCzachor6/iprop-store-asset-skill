#!/usr/bin/env node
// Renders the listing's seed previews with the Infinite Props SDK the listing declares (ipc + ipgen)
// and lays them out as a 1440 × 960 contact sheet. The PNGs are material for the gallery; with
// --sheet and `cwebp` installed the sheet also becomes gallery/preview2.webp (lossless).
// Usage: node render-seeds.mjs <listing-dir> [--out renders] [--sheet] [--force] [--no-fetch]
import { execFileSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { decodePng, encodePng, findSdk, importGraph, readJson, walkSources, writeFile } from "./lib/store.mjs"

const args = process.argv.slice(2)
const option = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null)
const dir = args.find((arg, index) => !arg.startsWith("--") && args[index - 1] !== "--out")
if (!dir) {
  console.error("Usage: node render-seeds.mjs <listing-dir> [--out renders] [--sheet] [--force] [--no-fetch]")
  process.exit(2)
}
const root = resolve(dir)
const out = resolve(root, option("--out") ?? "renders")
const listing = readJson(join(root, "listing.json"))
const sdk = findSdk(listing.compiler_version, { fetch: !args.includes("--no-fetch") })
if (!sdk?.ipgen) {
  console.error(`Infinite Props ${listing.compiler_version} SDK with ipgen not found (set IPROP_SDK or allow the download)`)
  process.exit(2)
}

const { files } = walkSources(join(root, "sources"))
const { entries, unresolved } = importGraph(files)
if (unresolved.length || !entries.length) {
  console.error("Fix the sources first: node scripts/check-listing.mjs " + dir)
  process.exit(1)
}
const selectionPath = join(root, "preview-selection.json")
const selection = existsSync(selectionPath)
  ? readJson(selectionPath).map((pair) => ({ entry: String(pair.entry_path).replace(/^sources\//, ""), seed: pair.seed }))
  : Array.from({ length: 15 }, (_, index) => ({ entry: entries[index % entries.length], seed: Math.floor(index / entries.length) + 1 }))

const work = mkdtempSync(join(tmpdir(), "iprop-render-"))
const renders = []
try {
  const binaries = new Map()
  for (const { entry, seed } of selection) {
    if (!binaries.has(entry)) {
      const source = join(root, "sources", ...entry.split("/"))
      const binary = join(work, `${binaries.size}.iprop`)
      execFileSync(sdk.ipc, [source, "-o", binary], { cwd: dirname(source), stdio: "pipe" })
      binaries.set(entry, binary)
    }
    const png = join(out, `${entry.replace(/\.ips$/, "").replaceAll("/", "-")}-seed${seed}.png`)
    mkdirSync(out, { recursive: true })
    execFileSync(sdk.ipgen, [binaries.get(entry), "--seed", String(seed), "-o", png], { stdio: "pipe" })
    renders.push({ entry, seed, png, image: decodePng(readFileSync(png)) })
    console.log(`rendered ${entry} seed ${seed} -> ${png}`)
  }
} finally {
  rmSync(work, { recursive: true, force: true })
}

// Contact sheet: dark store background, integer nearest-neighbour scale, one scale per entry so
// sizes stay honest. No labels (no font here); add them in your own composition if you need them.
const [W, H, GAP] = [1440, 960, 24]
const cells = renders.filter((render) => render.image)
const cols = Math.ceil(Math.sqrt((cells.length * W) / H))
const rows = Math.ceil(cells.length / cols)
const [cellW, cellH] = [Math.floor((W - GAP * (cols + 1)) / cols), Math.floor((H - GAP * (rows + 1)) / rows)]
const scale = new Map()
for (const { entry, image } of cells) {
  const fit = Math.max(1, Math.floor(Math.min(cellW / image.width, cellH / image.height)))
  scale.set(entry, Math.min(scale.get(entry) ?? fit, fit))
}
const sheet = { width: W, height: H, rgba: Buffer.alloc(W * H * 4) }
for (let i = 0; i < W * H; i++) sheet.rgba.set([0x16, 0x1a, 0x1f, 0xff], i * 4)
cells.forEach(({ entry, image }, index) => {
  const s = scale.get(entry)
  const [cx, cy] = [GAP + (index % cols) * (cellW + GAP), GAP + Math.floor(index / cols) * (cellH + GAP)]
  const [ox, oy] = [cx + Math.floor((cellW - image.width * s) / 2), cy + Math.floor((cellH - image.height * s) / 2)]
  for (let y = 0; y < image.height * s; y++) {
    for (let x = 0; x < image.width * s; x++) {
      const from = (Math.floor(y / s) * image.width + Math.floor(x / s)) * 4
      const alpha = image.rgba[from + 3] / 255
      if (!alpha) continue
      const to = ((oy + y) * W + ox + x) * 4
      for (let c = 0; c < 3; c++) sheet.rgba[to + c] = Math.round(image.rgba[from + c] * alpha + sheet.rgba[to + c] * (1 - alpha))
    }
  }
})
const sheetPath = join(out, "contact-sheet.png")
writeFile(sheetPath, encodePng(sheet))
console.log(`contact sheet (${cells.length} seeds, ${cols} × ${rows}) -> ${sheetPath}`)

if (args.includes("--sheet")) {
  const target = join(root, "gallery", "preview2.webp")
  if (existsSync(target) && !args.includes("--force")) {
    console.error(`${target} exists; add --force to replace it`)
    process.exit(1)
  }
  try {
    mkdirSync(dirname(target), { recursive: true })
    execFileSync("cwebp", ["-quiet", "-lossless", "-exact", sheetPath, "-o", target], { stdio: "pipe" })
    console.log(`gallery/preview2.webp written (lossless WebP)`)
  } catch {
    console.error("cwebp not found (brew install webp); convert contact-sheet.png to a lossless 1440 × 960 WebP yourself")
    process.exit(1)
  }
}
