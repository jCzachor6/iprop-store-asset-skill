#!/usr/bin/env node
// Renders real seed previews into gallery slots: a contact sheet of the
// selected pairs and an animation that cycles through them.
// Usage: node render-gallery.mjs <listing-dir> [--sheet preview2.webp] [--gif preview3.gif] [--no-gif] [--force]
import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { GALLERY, importGraph, loadRuntime, loadSharp, mercurDir, readJson, walkSources } from "./lib/store.mjs"

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : fallback
}
const dir = args.find((arg, index) => !arg.startsWith("--") && !args[index - 1]?.match(/^--(sheet|gif)$/))
if (!dir) {
  console.error("Usage: node render-gallery.mjs <listing-dir> [--sheet preview2.webp] [--gif preview3.gif] [--no-gif] [--force]")
  process.exit(2)
}
const root = resolve(dir)
const force = args.includes("--force")
const sheetName = option("--sheet", "preview2.webp")
const gifName = args.includes("--no-gif") ? null : option("--gif", "preview3.gif")
for (const name of [sheetName, gifName].filter(Boolean)) {
  if (!GALLERY.some((slot) => slot.filename === name && slot.width === 1440)) {
    console.error(`${name} is not a 1440 × 960 gallery slot (preview1.webp, preview2.webp or preview3.gif)`)
    process.exit(2)
  }
}
if (gifName && !gifName.endsWith(".gif")) {
  console.error("--gif must name the GIF slot (preview3.gif)")
  process.exit(2)
}

const sharp = loadSharp()
const runtimeModule = await loadRuntime()
if (!sharp || !runtimeModule) {
  console.error(`Needs sharp and the Infinite Props runtime from the mercur checkout (${mercurDir()}). Set MERCUR_DIR.`)
  process.exit(2)
}

const listing = existsSync(join(root, "listing.json")) ? readJson(join(root, "listing.json")) : {}
const { files } = walkSources(join(root, listing.sources ?? "sources"))
const { entries } = importGraph(files)
const selection = existsSync(join(root, "preview-selection.json"))
  ? readJson(join(root, "preview-selection.json"))
  : entries.length === 1
    ? Array.from({ length: 15 }, (_, index) => ({ entry_path: entries[0], seed: index + 1 }))
    : Array.from({ length: 15 }, (_, index) => ({ entry_path: entries[index % entries.length], seed: Math.floor(index / entries.length) + 1 }))

const compiler = await runtimeModule.loadIpropCompiler()
const runtime = await runtimeModule.loadIpropRuntime()
const compiled = compiler.compileSources(Object.fromEntries(files.map((file) => [file.path, file.content])))
const failed = compiled.filter((result) => !result.ok)
if (failed.length) {
  console.error(`Fix the sources first (run check-listing.mjs): ${failed.map((result) => result.path).join(", ")}`)
  process.exit(1)
}

const programs = new Map()
const renders = []
try {
  for (const pair of selection) {
    if (!programs.has(pair.entry_path)) {
      const result = compiled.find((item) => item.path === pair.entry_path)
      if (!result) throw new Error(`${pair.entry_path} is not in the sources`)
      programs.set(pair.entry_path, runtime.load(result.bytes))
    }
    const image = programs.get(pair.entry_path).generate({ seed: pair.seed })
    renders.push({ ...pair, image })
  }
} finally {
  for (const program of programs.values()) program.dispose()
}

// One crop box per entry, shared by all its seeds, keeps their relative size honest.
const boxes = new Map()
for (const { entry_path, image } of renders) {
  const box = boxes.get(entry_path) ?? { left: image.width, top: image.height, right: -1, bottom: -1 }
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      if (image.data[(y * image.width + x) * 4 + 3]) {
        box.left = Math.min(box.left, x)
        box.right = Math.max(box.right, x)
        box.top = Math.min(box.top, y)
        box.bottom = Math.max(box.bottom, y)
      }
    }
  }
  boxes.set(entry_path, box)
}

const sprite = async ({ entry_path, image }, maxWidth, maxHeight) => {
  const box = boxes.get(entry_path)
  if (box.right < box.left) return null
  const width = box.right - box.left + 1
  const height = box.bottom - box.top + 1
  const scale = Math.min(maxWidth / width, maxHeight / height)
  const factor = scale >= 1 ? Math.floor(scale) : scale
  const outWidth = Math.max(1, Math.round(width * factor))
  const outHeight = Math.max(1, Math.round(height * factor))
  const png = await sharp(Buffer.from(image.data), { raw: { width: image.width, height: image.height, channels: 4 } })
    .extract({ left: box.left, top: box.top, width, height })
    .resize(outWidth, outHeight, { kernel: "nearest" })
    .png()
    .toBuffer()
  return { png, width: outWidth, height: outHeight }
}

const escape = (text) => String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const W = 1440
const H = 960
const title = listing.title ?? "Seed previews"
const shortName = (path) => path.split("/").pop().replace(/\.ips$/, "")
const frame = (heading, subtitle, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><radialGradient id="wash" cx="50%" cy="40%" r="75%"><stop stop-color="#262a3f"/><stop offset="1" stop-color="#13161a"/></radialGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#wash)"/>
  <g font-family="Helvetica, Arial, sans-serif">
    <rect x="64" y="50" width="34" height="5" rx="2" fill="#f5d90a"/>
    <text x="111" y="58" fill="#f5d90a" font-size="14" font-weight="700" letter-spacing="3">${escape(title.toUpperCase())}</text>
    <text x="64" y="116" fill="#f6f4ef" font-size="43" font-weight="700">${escape(heading)}</text>
    <text x="65" y="152" fill="#aaaebd" font-size="19">${escape(subtitle)}</text>
    ${body}
    <line x1="64" y1="902" x2="1376" y2="902" stroke="#343845"/>
    <text x="64" y="935" fill="#8b90a1" font-size="14" letter-spacing="2">ACTUAL GENERATED SPRITES</text>
    <text x="1376" y="935" text-anchor="end" fill="#afb3c3" font-size="14">${entries.length} ${entries.length === 1 ? "ASSET" : "ASSETS"} · COMMERCIAL</text>
  </g>
</svg>`)

const writeSlot = async (name, pipeline) => {
  mkdirSync(join(root, "gallery"), { recursive: true })
  const path = join(root, "gallery", name)
  if (existsSync(path) && !force) {
    console.error(`gallery/${name} exists; pass --force to replace it`)
    return
  }
  await pipeline.toFile(path)
  console.log(`wrote gallery/${name} (${(readFileSync(path).length / 1024).toFixed(1)} KiB)`)
}

// Contact sheet: choose the grid that gives each cell the largest square area.
const area = { x: 64, y: 190, width: 1312, height: 690 }
const gap = 16
let best = { columns: 1, rows: renders.length, size: 0 }
for (let columns = 1; columns <= renders.length; columns++) {
  const rows = Math.ceil(renders.length / columns)
  const size = Math.min((area.width - gap * (columns - 1)) / columns, (area.height - gap * (rows - 1)) / rows / 1.15)
  if (size > best.size) best = { columns, rows, size }
}
const cellWidth = Math.floor((area.width - gap * (best.columns - 1)) / best.columns)
const cellHeight = Math.floor((area.height - gap * (best.rows - 1)) / best.rows)
let cards = ""
const composites = []
for (const [index, render] of renders.entries()) {
  const x = area.x + (index % best.columns) * (cellWidth + gap)
  const y = area.y + Math.floor(index / best.columns) * (cellHeight + gap)
  cards += `<rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}" rx="12" fill="#191e29" stroke="#353c4d"/>
    <text x="${x + 14}" y="${y + cellHeight - 14}" fill="#f5d90a" font-size="12" font-weight="700" letter-spacing="1.5">${escape(shortName(render.entry_path).toUpperCase())}</text>
    <text x="${x + cellWidth - 14}" y="${y + cellHeight - 14}" text-anchor="end" fill="#abb3c6" font-size="12">SEED ${render.seed}</text>`
  const image = await sprite(render, cellWidth - 24, cellHeight - 52)
  if (image) composites.push({ input: image.png, left: x + Math.round((cellWidth - image.width) / 2), top: y + 12 + Math.round((cellHeight - 40 - image.height) / 2) })
}
const heading = `${renders.length} seeds${entries.length > 1 ? `, ${new Set(renders.map((render) => render.entry_path)).size} assets` : ""}`
await writeSlot(sheetName, sharp(frame(heading, "Every image is generated from an included .ips file and its seed.", cards)).composite(composites).webp({ lossless: true }))

if (gifName) {
  const frames = []
  for (const render of renders.slice(0, 24)) {
    const image = await sprite(render, 1100, 600)
    const label = `<text x="720" y="870" text-anchor="middle" fill="#d8dbe6" font-size="20" font-weight="700">${escape(render.entry_path)} · seed ${render.seed}</text>`
    const base = sharp(frame(shortName(render.entry_path).replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), "One seed per frame, rendered from the included source.", label))
    const composed = image ? base.composite([{ input: image.png, left: Math.round((W - image.width) / 2), top: 200 + Math.round((640 - image.height) / 2) }]) : base
    frames.push(await sharp(await composed.png().toBuffer()).ensureAlpha().raw().toBuffer())
  }
  await writeSlot(gifName, sharp(Buffer.concat(frames), { raw: { width: W, height: H * frames.length, channels: 4, pageHeight: H } })
    .gif({ delay: frames.map(() => 1000), loop: 0, dither: 0, effort: 7 }))
}
