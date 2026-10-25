#!/usr/bin/env node
// Checks a listing folder against the store's upload rules before it goes
// into the creator panel. Usage: node check-listing.mjs <listing-dir> [--update] [--no-compile]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join, resolve } from "node:path"
import {
  CATEGORIES, GALLERY, README_NAME, RULES, SOURCE_PATH, VERSION,
  imageInfo, importGraph, loadRuntime, loadSharp, mercurDir, readJson, walkSources,
} from "./lib/store.mjs"

const args = process.argv.slice(2)
const dir = args.find((arg) => !arg.startsWith("--"))
const update = args.includes("--update")
const compile = !args.includes("--no-compile")
if (!dir) {
  console.error("Usage: node check-listing.mjs <listing-dir> [--update] [--no-compile]")
  process.exit(2)
}
const root = resolve(dir)

const errors = []
const warnings = []
const notes = []
const error = (message) => errors.push(message)
const warn = (message) => warnings.push(message)
const note = (message) => notes.push(message)
const bytes = (n) => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MiB` : `${(n / 1024).toFixed(1)} KiB`

// listing.json
let listing = {}
const listingPath = join(root, "listing.json")
if (!existsSync(listingPath)) {
  error("listing.json is missing (copy templates/listing/listing.json)")
} else {
  try {
    listing = readJson(listingPath)
  } catch (cause) {
    error(`listing.json is not valid JSON: ${cause.message}`)
  }
}

const type = listing.type
if (type !== "asset" && type !== "pack") error(`type must be "asset" or "pack" (got ${JSON.stringify(type)})`)

const title = typeof listing.title === "string" ? listing.title : ""
if (!update) {
  if (title.trim().length < RULES.titleMin || title.trim().length > RULES.titleMax) {
    error(`title must be ${RULES.titleMin}-${RULES.titleMax} characters (got ${title.trim().length})`)
  }
  if (title !== title.trim()) warn("title has leading or trailing spaces; the store trims them")

  const description = typeof listing.description === "string" ? listing.description : ""
  if (!description) warn("description is empty; the product page shows nothing beside the title")
  if (description.length > RULES.descriptionMax) error(`description exceeds ${RULES.descriptionMax} characters`)
  else if (description.length > RULES.descriptionExcerpt) {
    warn(`description is ${description.length} characters; the product page cuts it to ${RULES.descriptionExcerpt} with "…". Move details to the README`)
  }
  if (/<[a-z][^>]*>|^\s*#|\*\*|!\[|\[[^\]]+\]\(/im.test(description)) {
    warn("description contains HTML or Markdown; it is shown as plain text, so the markup appears literally or is stripped")
  }

  if (listing.category == null || listing.category === "") {
    warn("no category; the listing will not appear under any category filter")
  } else if (!CATEGORIES.includes(listing.category)) {
    error(`category "${listing.category}" does not exist. Choose one of: ${CATEGORIES.join(", ")}`)
  }

  const price = listing.price_eur
  if (typeof price !== "number" || !(price > 0) || price > RULES.priceMax) {
    error(`price_eur must be a number above 0 and at most ${RULES.priceMax}`)
  } else if (price < 1 || !Number.isInteger(price * 2)) {
    error(`price_eur ${price} cannot be entered in the panel: it accepts 1, 1.5, 2 … (steps of 0.5)`)
  }
}

const version = listing.version ?? "1.0.0"
if (!VERSION.test(version)) error(`version "${version}" must look like 1.0.0 (no leading zeros, each part ≤ 99999)`)
if (update && listing.previous_version) {
  const parse = (value) => value.split(".").map(Number)
  const [a, b] = [parse(version), parse(listing.previous_version)]
  const newer = a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
  if (!(newer > 0)) error(`version ${version} must be newer than ${listing.previous_version}, including rejected submissions`)
}
const changelog = typeof listing.changelog === "string" ? listing.changelog.trim() : ""
if (update && changelog.length < RULES.changelogMin) error(`changelog is required for a new version (at least ${RULES.changelogMin} characters)`)
if (changelog.length > RULES.changelogMax) error(`changelog exceeds ${RULES.changelogMax} characters`)
if (!update && !changelog) note("changelog is optional for the first release; \"First release.\" is a good default")

// sources
const sourcesDir = join(root, listing.sources ?? "sources")
let files = []
let entries = []
let unresolvedImports = false
if (!existsSync(sourcesDir)) {
  error(`sources folder not found: ${sourcesDir}`)
} else {
  const walked = walkSources(sourcesDir)
  files = walked.files
  for (const skipped of walked.skipped) warn(`${skipped} is skipped by the panel's folder picker (release/, out/ and .git/ never upload)`)
  if (!files.length) error("no .ips files in sources")
  if (files.length > RULES.maxSourceFiles) error(`${files.length} source files; the limit is ${RULES.maxSourceFiles}`)
  let total = 0
  for (const file of files) {
    const size = Buffer.byteLength(file.content, "utf8")
    total += size
    if (!SOURCE_PATH.test(file.path)) {
      error(`${file.path}: invalid path. Folders: letters, digits, _ and - (no spaces or dots, max 8 levels). Files: letters, digits, ., _ and -`)
    }
    if (size > RULES.maxSourceBytes) error(`${file.path}: ${bytes(size)} exceeds ${bytes(RULES.maxSourceBytes)}`)
  }
  if (total > RULES.maxPackBytes) error(`sources total ${bytes(total)}, above ${bytes(RULES.maxPackBytes)}`)
  const graph = importGraph(files)
  unresolvedImports = graph.unresolved.length > 0
  for (const missing of graph.unresolved) error(`${missing.from}: import "${missing.import}" is not inside the uploaded sources`)
  entries = graph.entries
  const tops = [...new Set(files.map((file) => file.path.includes("/") ? file.path.split("/")[0] + "/" : file.path))]
  if (files.length) note(`${files.length} source files (${bytes(total)}), ${entries.length} asset ${entries.length === 1 ? "entry" : "entries"}: ${entries.join(", ")}`)
  if (files.length) note(`In the panel add, one by one: ${tops.join(", ")} (folders with "Add an asset or pack folder", loose files with the file picker)`)
}

// README
const readmes = existsSync(root) ? readdirSync(root).filter((name) => README_NAME.test(name)) : []
if (!readmes.length) {
  warn("no README.md; buyers get no documentation in the download or on the product page")
} else {
  if (readmes.length > 1) warn(`several READMEs (${readmes.join(", ")}); only one can be uploaded`)
  const readme = readFileSync(join(root, readmes[0]), "utf8")
  const size = Buffer.byteLength(readme, "utf8")
  if (size > RULES.maxReadmeBytes) error(`${readmes[0]} is ${bytes(size)}; the limit is ${bytes(RULES.maxReadmeBytes)}`)
  if (/!\[[^\]]*\]\(/.test(readme)) warn(`${readmes[0]} has Markdown images; the store strips them`)
  if (/<(img|div|span|style|script|iframe)\b/i.test(readme)) warn(`${readmes[0]} has raw HTML; the store strips it`)
  if (/\]\((?!https?:|mailto:|#)[^)]+\)/.test(readme)) warn(`${readmes[0]} has relative links; only http(s) and mailto links survive`)
  if (!/licen[cs]e/i.test(readme)) note(`${readmes[0]} does not mention the license; a one-line "Commercial" section helps buyers`)
}

// preview-selection.json
let selection = null
const selectionPath = join(root, "preview-selection.json")
if (!existsSync(selectionPath)) {
  note(`no preview-selection.json; the panel defaults to ${type === "pack" ? "15 seeds round-robin across the entries" : "seeds 1-15"}`)
} else {
  try {
    selection = readJson(selectionPath)
  } catch (cause) {
    error(`preview-selection.json is not valid JSON: ${cause.message}`)
  }
  if (selection) {
    if (!Array.isArray(selection) || selection.length < 1 || selection.length > RULES.maxSelection) {
      error(`preview-selection.json must list 1-${RULES.maxSelection} pairs`)
    } else {
      const seen = new Set()
      for (const [index, pair] of selection.entries()) {
        const label = `preview-selection.json #${index + 1}`
        if (!files.some((file) => file.path === pair.entry_path)) error(`${label}: "${pair.entry_path}" is not in sources (paths are relative to the sources folder)`)
        else if (!entries.includes(pair.entry_path)) error(`${label}: "${pair.entry_path}" is not an asset entry (imported parts cannot be selected)`)
        if (!Number.isInteger(pair.seed) || pair.seed < 0 || pair.seed > RULES.maxSeed) error(`${label}: seed must be an integer 0-${RULES.maxSeed}`)
        const key = `${pair.entry_path}:${pair.seed}`
        if (seen.has(key)) error(`${label}: ${key} is listed twice`)
        seen.add(key)
      }
      const unshown = entries.filter((entry) => !selection.some((pair) => pair.entry_path === entry))
      if (unshown.length) warn(`no seed preview for: ${unshown.join(", ")}`)
      if (selection.length < RULES.maxSelection) note(`${selection.length} of ${RULES.maxSelection} seed previews used`)
    }
  }
}

// gallery
const galleryDir = join(root, "gallery")
const sharp = loadSharp()
if (!existsSync(galleryDir)) {
  warn("no gallery folder; the thumbnail falls back to the first generated seed preview")
} else {
  const known = new Set(GALLERY.map((slot) => slot.filename))
  for (const name of readdirSync(galleryDir)) {
    if (!known.has(name) && !name.startsWith(".")) note(`gallery/${name} is not a gallery slot and is not uploaded`)
  }
  let total = 0
  for (const slot of GALLERY) {
    const path = join(galleryDir, slot.filename)
    if (!existsSync(path)) {
      if (slot.filename === "preview.webp") warn("gallery/preview.webp is missing; it is the listing thumbnail and the first image buyers see")
      else if (slot.format === "webp") note(`gallery/${slot.filename} is empty (optional)`)
      continue
    }
    const data = readFileSync(path)
    total += data.length
    const info = imageInfo(data)
    const label = `gallery/${slot.filename}`
    if (info.format !== slot.format) {
      error(`${label} is ${info.format.toUpperCase()}, must be ${slot.format.toUpperCase()} (renaming does not convert it)`)
      continue
    }
    if (info.width !== slot.width || info.height !== slot.height) {
      error(`${label} is ${info.width} × ${info.height}px, must be exactly ${slot.width} × ${slot.height}px`)
    }
    if (slot.format === "webp" && info.frames !== 1) error(`${label} is animated; this slot takes a static WebP`)
    if (slot.format === "gif") {
      if (info.frames > RULES.maxGifFrames) error(`${label} has ${info.frames} frames; the limit is ${RULES.maxGifFrames}`)
      const decoded = info.width * info.height * info.frames
      if (decoded > RULES.maxDecodedPixels) {
        error(`${label}: ${info.frames} frames decode to ${(decoded / 1e6).toFixed(1)} MP, above 33.5 MP. At 1440 × 960 use at most ${Math.floor(RULES.maxDecodedPixels / (slot.width * slot.height))} frames`)
      }
      if (info.frames < 2) warn(`${label} has a single frame; use the WebP slots for still images`)
    }
    if (data.length > RULES.maxMediaBytes) error(`${label} is ${bytes(data.length)}; the limit is 3 MiB`)
    if (sharp && !errors.some((message) => message.startsWith(label))) {
      try {
        const image = sharp(data, { animated: true, limitInputPixels: RULES.maxDecodedPixels, failOn: "warning" })
        const meta = await image.metadata()
        const encoder = meta.format === "gif" ? image.gif({ effort: 3 }) : image.webp({ lossless: true })
        const encoded = await encoder.timeout({ seconds: 10 }).toBuffer()
        if (encoded.length > RULES.maxMediaBytes) {
          error(`${label}: the store re-encodes it ${slot.format === "gif" ? "as GIF" : "as lossless WebP"} to ${bytes(encoded.length)}, above 3 MiB. ${slot.format === "gif" ? "Use fewer frames or flatter colours" : "Use flatter areas or less noise/gradients"}`)
        } else {
          note(`${label}: ${info.width} × ${info.height}${info.frames > 1 ? `, ${info.frames} frames` : ""}, ${bytes(data.length)} (${bytes(encoded.length)} after the store re-encodes it)`)
        }
      } catch (cause) {
        error(`${label}: the store cannot decode it safely (${cause.message})`)
      }
    }
  }
  if (total > RULES.maxGalleryBytes) error(`gallery totals ${bytes(total)}, above 12 MiB`)
  if (!sharp) note(`sharp not found under ${mercurDir()}/apps/api; skipped the store's re-encode check (set MERCUR_DIR)`)
}

// compile and render, like the store's worker
if (compile && files.length && !unresolvedImports) {
  const runtimeModule = await loadRuntime()
  if (!runtimeModule) {
    note(`Infinite Props runtime not found at ${mercurDir()}/packages/iprop/dist; skipped compiling (set MERCUR_DIR or build it)`)
  } else {
    const compiler = await runtimeModule.loadIpropCompiler()
    const runtime = await runtimeModule.loadIpropRuntime()
    const started = Date.now()
    const results = compiler.compileSources(Object.fromEntries(files.map((file) => [file.path, file.content])))
    const imported = new Set(results.flatMap((result) => result.imports))
    const compiledEntries = []
    for (const result of results) {
      for (const diagnostic of result.diagnostics.filter((d) => d.severity === "error")) {
        error(`${diagnostic.path}${diagnostic.line ? `:${diagnostic.line}:${diagnostic.column}` : ""} ${diagnostic.message}${diagnostic.suggestions.length ? ` (did you mean ${diagnostic.suggestions.join(", ")}?)` : ""}`)
      }
      for (const diagnostic of result.diagnostics.filter((d) => d.severity === "warning")) warn(`${diagnostic.path}: ${diagnostic.message}`)
    }
    if (results.every((result) => result.ok)) {
      for (const result of results.filter((result) => !imported.has(result.path))) {
        let program
        try {
          program = runtime.load(result.bytes)
          const { meta } = program
          if (meta.width > RULES.maxCanvasSide || meta.height > RULES.maxCanvasSide || meta.width * meta.height > RULES.maxCanvasPixels) {
            throw new Error(`canvas ${meta.width} × ${meta.height} exceeds 2048px per side or 1,048,576 pixels`)
          }
          if (meta.byteLength > RULES.maxBinaryBytes) throw new Error(`compiled binary ${bytes(meta.byteLength)} exceeds 4 MiB`)
          if (meta.fuel > RULES.maxFuel) throw new Error(`fuel budget ${meta.fuel} exceeds ${RULES.maxFuel}`)
          let peak = 0
          for (let seed = 1; seed <= RULES.smokeSeeds; seed++) {
            try {
              peak = Math.max(peak, program.generate({ seed }).fuelUsed)
            } catch (cause) {
              throw new Error(`seed ${seed} failed to render: ${cause.message}`)
            }
          }
          for (const pair of (selection ?? []).filter((pair) => pair.entry_path === result.path)) {
            try {
              const image = program.generate({ seed: pair.seed })
              let opaque = false
              for (let i = 3; i < image.data.length && !opaque; i += 4) opaque = image.data[i] > 0
              if (!opaque) warn(`${result.path} seed ${pair.seed} renders an empty (fully transparent) image`)
            } catch (cause) {
              error(`${result.path} seed ${pair.seed} (selected preview) failed to render: ${cause.message}`)
            }
          }
          compiledEntries.push(result.path)
          note(`${result.path}: ${meta.width} × ${meta.height}px, ${meta.inputs.length} inputs, ${meta.outputs.length} outputs, ${bytes(meta.byteLength)}, peak fuel ${peak.toLocaleString("en")} of ${RULES.maxFuel.toLocaleString("en")}`)
        } catch (cause) {
          error(`${result.path}: ${cause.message}`)
        } finally {
          program?.dispose()
        }
      }
      const elapsed = (Date.now() - started) / 1000
      note(`compiled and rendered locally in ${elapsed.toFixed(1)}s (the store allows 45s on a shared server; stay well below)`)
      if (elapsed > 20) warn(`compiling and rendering took ${elapsed.toFixed(1)}s locally; the store may time out at 45s`)
      entries = compiledEntries.length ? [...new Set([...entries, ...compiledEntries])] : entries
    }
    note(`runtime ${runtimeModule.IPROP_RUNTIME.version} (${runtimeModule.IPROP_RUNTIME.commit.slice(0, 9)})`)
  }
}

if (type === "asset" && entries.length !== 1) error(`a single asset must have exactly 1 entry (found ${entries.length}); choose "pack" or move shared files so they are imported`)
if (type === "pack" && entries.length > 0 && entries.length < 2) error("a pack needs at least 2 asset entries; imported parts do not count")

const print = (label, items) => items.length && console.log(`\n${label}\n${items.map((item) => `  - ${item}`).join("\n")}`)
console.log(`Listing: ${root}${update ? " (new version)" : ""}`)
print("ERRORS", errors)
print("WARNINGS", warnings)
print("INFO", notes)
console.log(errors.length ? `\n✗ ${errors.length} error(s): the store would reject this upload.` : `\n✓ Ready to upload${warnings.length ? ` (${warnings.length} warning(s) worth a look)` : ""}.`)
process.exit(errors.length ? 1 : 0)
