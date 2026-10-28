// The store's upload checks applied to a listing folder, plus local compile and render checks
// with the exact Infinite Props release the listing declares. Used by check-listing.mjs and
// pack-listing.mjs.
import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import {
  CATEGORIES, COMPILER_VERSION, DEFAULT_COMPILER, GALLERY, MATERIALS_SINCE, README_NAME, RELEASED_COMPILERS, RULES,
  SEGMENT, compareVersions, definesMaterials, findSdk, imageInfo, importGraph, isMaterialLibrary, packageFiles,
  pngIsEmpty, readJson, walkSources,
} from "./store.mjs"

export const bytes = (n) => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MiB` : `${(n / 1024).toFixed(1)} KiB`

export const checkListing = (root, { update = false, compile = true, fetch = true } = {}) => {
  const errors = []
  const warnings = []
  const notes = []
  const error = (message) => errors.push(message)
  const warn = (message) => warnings.push(message)
  const note = (message) => notes.push(message)

  // listing.json
  let listing = {}
  const listingPath = join(root, "listing.json")
  if (!existsSync(listingPath)) {
    error("listing.json is missing at the top of the folder (copy templates/listing/listing.json)")
  } else {
    try {
      listing = readJson(listingPath)
    } catch (cause) {
      error(`listing.json is not valid JSON: ${cause.message}`)
    }
  }

  const title = typeof listing.title === "string" ? listing.title : ""
  if (title.trim().length < RULES.titleMin || title.trim().length > RULES.titleMax) {
    error(`title must be ${RULES.titleMin}-${RULES.titleMax} characters (got ${title.trim().length})`)
  }
  const description = typeof listing.description === "string" ? listing.description : ""
  if (!description) warn("description is empty; the catalog tile and product page show nothing under the title")
  if (description.length > RULES.descriptionMax) error(`description exceeds ${RULES.descriptionMax} characters`)
  else if (description.length > RULES.descriptionTile) {
    warn(`description is ${description.length} characters; catalog tiles print it in full, so keep it to about ${RULES.descriptionTile} and move details to the README`)
  }
  if (/<[a-z][^>]*>|^\s*#|\*\*|!\[|\[[^\]]+\]\(/im.test(description)) {
    warn("description contains HTML or Markdown; the store shows it as plain text, so the markup appears literally")
  }

  if (listing.category == null || listing.category === "") {
    warn("no category; the listing will not appear under any category filter")
  } else if (!CATEGORIES.includes(listing.category)) {
    error(`category "${listing.category}" does not exist. Choose one of: ${CATEGORIES.join(", ")}`)
  }

  const type = listing.type
  if (type == null) warn(`no type; the store infers it from the entries ("asset" for 1, "pack" for 2+)`)
  else if (type !== "asset" && type !== "pack") error(`type must be "asset" or "pack" (got ${JSON.stringify(type)})`)

  const compiler = listing.compiler_version
  let compilerOk = false
  if (typeof compiler !== "string" || !COMPILER_VERSION.test(compiler)) {
    error(`compiler_version is required as x.y.z: the Infinite Props release the store compiles with (for example "${DEFAULT_COMPILER}")`)
  } else if (!RELEASED_COMPILERS.includes(compiler)) {
    error(`compiler_version ${compiler} is not a released Infinite Props version the store accepts (${RELEASED_COMPILERS.join(", ")})`)
  } else {
    compilerOk = true
  }

  if ("price_eur" in listing || "price" in listing) {
    warn("price in listing.json is ignored: you set the price in USD in the submission form")
  }
  if ("version" in listing) warn("version in listing.json is ignored: the store numbers versions itself (v1, v2, …)")
  if (listing.sources != null && listing.sources !== "sources") {
    error(`"sources": "${listing.sources}" is not supported; the store reads the .ips tree from sources/ only`)
  }
  const changelog = typeof listing.changelog === "string" ? listing.changelog.trim() : ""
  if (changelog.length > RULES.changelogMax) error(`changelog exceeds ${RULES.changelogMax} characters`)
  if (update && changelog.length < RULES.changelogMin) {
    error(`a new version needs a changelog of ${RULES.changelogMin}-${RULES.changelogMax} characters (paste it into the form)`)
  }

  // what goes into the archive
  const { included, excluded } = packageFiles(root)
  for (const path of excluded) {
    if (path.endsWith(".iprop")) note(`${path} is left out: the store compiles the sources itself and rejects uploaded .iprop files`)
    else note(`${path} is not packed (only listing.json, README, preview-selection.json, sources/**/*.ips and the gallery slots ship)`)
  }
  const seen = new Set()
  let unpacked = 0
  for (const file of included) {
    const segments = file.archivePath.split("/")
    if (segments.some((segment) => !SEGMENT.test(segment))) {
      error(`${file.archivePath}: invalid name. Use letters, digits, '.', '_' and '-' and start with a letter or digit (no spaces: delete macOS copies like "blade 2.ips")`)
    }
    if (segments.length > RULES.maxDepth + 1) error(`${file.archivePath}: nested deeper than ${RULES.maxDepth} folders`)
    const key = file.archivePath.toLowerCase()
    if (seen.has(key)) error(`${file.archivePath}: the same path differs only in letter case`)
    seen.add(key)
    unpacked += statSync(file.path).size
  }
  if (included.length > RULES.maxFiles) error(`${included.length} files; the store accepts at most ${RULES.maxFiles}`)
  if (unpacked > RULES.maxUnpackedBytes) {
    error(`the package is ${bytes(unpacked)} unpacked, above ${bytes(RULES.maxUnpackedBytes)} (gallery images count too)`)
  } else {
    note(`package: ${included.length} files, ${bytes(unpacked)} of ${bytes(RULES.maxUnpackedBytes)} unpacked`)
  }

  // sources
  const { files } = walkSources(join(root, "sources"))
  if (!files.length) error("no .ips files under sources/")
  if (files.length > RULES.maxIpsFiles) error(`${files.length} .ips files; the limit is ${RULES.maxIpsFiles}`)
  let ipsTotal = 0
  for (const file of files) {
    const size = Buffer.byteLength(file.content, "utf8")
    ipsTotal += size
    if (size > RULES.maxIpsBytes) error(`sources/${file.path}: ${bytes(size)} exceeds ${bytes(RULES.maxIpsBytes)}`)
  }
  if (ipsTotal > RULES.maxIpsTotal) error(`.ips sources total ${bytes(ipsTotal)}, above ${bytes(RULES.maxIpsTotal)}`)
  const graph = importGraph(files)
  for (const missing of graph.unresolved) error(`sources/${missing.from}: import "${missing.import}" is not in the package`)
  const entries = graph.entries
  const materialFiles = files.filter((file) => definesMaterials(file.content))
  if (materialFiles.length && compilerOk && compareVersions(compiler, MATERIALS_SINCE) < 0) {
    compilerOk = false
    error(`${materialFiles.map((file) => `sources/${file.path}`).join(", ")} ${materialFiles.length === 1 ? "defines" : "define"} materials, which need compiler_version ${MATERIALS_SINCE} or newer (declared ${compiler})`)
  }
  for (const file of files) {
    if (entries.includes(file.path) && isMaterialLibrary(file.content)) {
      error(`sources/${file.path} is a material library that no asset imports; import it from an asset or delete it`)
    }
  }
  if (files.length) note(`${files.length} .ips files (${bytes(ipsTotal)}), ${entries.length} ${entries.length === 1 ? "entry" : "entries"}: ${entries.join(", ")}`)
  if (type === "asset" && entries.length !== 1) error(`a single asset needs exactly 1 entry, found ${entries.length}; set "type": "pack" or import the extra files`)
  if (type === "pack" && entries.length < 2) error(`a pack needs at least 2 entries, found ${entries.length}; imported parts do not count`)

  // README
  const readmes = included.filter((file) => README_NAME.test(file.archivePath))
  if (!readmes.length) warn("no README.md; buyers get no documentation in the download")
  if (readmes.length > 1) warn(`several READMEs (${readmes.map((file) => file.archivePath).join(", ")}); all of them ship, keep one`)
  for (const readme of readmes) {
    const size = statSync(readme.path).size
    if (size > RULES.maxReadmeBytes) error(`${readme.archivePath} is ${bytes(size)}; the limit is ${bytes(RULES.maxReadmeBytes)}`)
  }

  // preview-selection.json
  let selection = null
  const selectionPath = join(root, "preview-selection.json")
  if (existsSync(selectionPath)) {
    try {
      selection = readJson(selectionPath)
    } catch (cause) {
      error(`preview-selection.json is not valid JSON: ${cause.message}`)
    }
  } else {
    note("no preview-selection.json (optional)")
  }
  if (selection) {
    if (!Array.isArray(selection) || selection.length < 1 || selection.length > RULES.maxSelection) {
      error(`preview-selection.json must list 1-${RULES.maxSelection} pairs`)
      selection = null
    } else {
      const pairs = new Set()
      for (const [index, pair] of selection.entries()) {
        const label = `preview-selection.json #${index + 1}`
        const path = String(pair.entry_path ?? "").replace(/^sources\//, "")
        if (!entries.includes(path)) error(`${label}: "${pair.entry_path}" is not an entry (paths are relative to sources/; imported parts cannot be selected)`)
        if (!Number.isInteger(pair.seed) || pair.seed < 0 || pair.seed > RULES.maxSeed) error(`${label}: seed must be an integer 0-${RULES.maxSeed}`)
        if (pairs.has(`${path}#${pair.seed}`)) error(`${label}: ${path} seed ${pair.seed} is listed twice`)
        pairs.add(`${path}#${pair.seed}`)
      }
      const unshown = entries.filter((entry) => !selection.some((pair) => String(pair.entry_path).replace(/^sources\//, "") === entry))
      if (unshown.length) warn(`no seed preview for: ${unshown.join(", ")}`)
    }
  }

  // gallery
  if (!existsSync(join(root, "gallery"))) warn("no gallery/ folder")
  for (const slot of GALLERY) {
    const path = join(root, "gallery", slot.filename)
    const label = `gallery/${slot.filename}`
    if (!existsSync(path)) {
      if (slot.filename === "preview.webp") warn(`${label} is missing; it is the listing cover`)
      continue
    }
    const data = readFileSync(path)
    const info = imageInfo(data)
    if (data.length > RULES.maxMediaBytes) {
      error(`${label} is ${bytes(data.length)}; the limit is 3 MiB`)
      continue
    }
    if (info.format !== slot.format || info.width !== slot.width || info.height !== slot.height) {
      error(`${label} must be ${slot.width} × ${slot.height} ${slot.format.toUpperCase()}, found ${info.width} × ${info.height} ${info.format.toUpperCase()} (renaming does not convert it)`)
      continue
    }
    if (slot.format === "webp" && info.frames > 1) warn(`${label} is animated; use a static WebP (the animation belongs in preview3.gif)`)
    if (slot.format === "gif") {
      if (info.frames > RULES.maxGifFrames) error(`${label} has ${info.frames} frames; the limit is ${RULES.maxGifFrames}`)
      if (info.frames < 2) warn(`${label} has a single frame; use the WebP slots for still images`)
    }
    note(`${label}: ${info.width} × ${info.height}${info.frames > 1 ? `, ${info.frames} frames` : ""}, ${bytes(data.length)}`)
  }

  // compile with the declared release, the way the store's worker does
  if (compile && compilerOk && files.length && !graph.unresolved.length) {
    let sdk = null
    try {
      sdk = findSdk(compiler, { fetch })
    } catch (cause) {
      warn(`${cause.message}; skipped compiling`)
    }
    if (!sdk) {
      if (!warnings.some((message) => message.includes("skipped compiling"))) {
        warn(`Infinite Props ${compiler} SDK not found; skipped compiling (set IPROP_SDK to an unpacked release, or allow the download)`)
      }
    } else {
      if (sdk.version !== compiler) warn(`IPROP_SDK is ${sdk.version}, but the listing declares ${compiler}; the store compiles with ${compiler}`)
      compileEntries({ root, entries, selection, sdk, error, warn, note })
    }
  }

  return { errors, warnings, notes, listing, included, entries }
}

const run = (command, args, cwd) => {
  try {
    execFileSync(command, args, { cwd, encoding: "utf8", stdio: "pipe", timeout: RULES.compileTimeoutSeconds * 1000 })
    return null
  } catch (cause) {
    const output = `${cause.stdout ?? ""}${cause.stderr ?? ""}`.trim()
    return cause.signal === "SIGTERM" ? `timed out after ${RULES.compileTimeoutSeconds}s` : output.slice(0, 600) || cause.message
  }
}

const compileEntries = ({ root, entries, selection, sdk, error, warn, note }) => {
  const out = mkdtempSync(join(tmpdir(), "iprop-check-"))
  const started = Date.now()
  try {
    for (const [index, entry] of entries.entries()) {
      const source = join(root, "sources", ...entry.split("/"))
      const binary = join(out, `${index}.iprop`)
      const failure = run(sdk.ipc, [source, "-o", binary], dirname(source))
      if (failure) {
        error(`sources/${entry}: does not compile with Infinite Props ${sdk.version}: ${failure}`)
        continue
      }
      if (sdk.ipval) {
        const invalid = run(sdk.ipval, [binary])
        if (invalid) error(`sources/${entry}: ipval rejects the compiled binary: ${invalid}`)
      }
      const size = statSync(binary).size
      if (size > RULES.maxIpropBytes) error(`sources/${entry}: compiled binary is ${bytes(size)}, above 4 MiB`)
      if (!sdk.ipgen) {
        note(`sources/${entry}: compiled, ${bytes(size)}`)
        continue
      }
      // Not checked by the store, but buyers run every seed: a trap here is a broken product.
      const seeds = [...Array.from({ length: RULES.smokeSeeds }, (_, seed) => seed + 1),
        ...(selection ?? []).filter((pair) => String(pair.entry_path).replace(/^sources\//, "") === entry).map((pair) => pair.seed)]
      const selected = new Set((selection ?? []).filter((pair) => String(pair.entry_path).replace(/^sources\//, "") === entry).map((pair) => pair.seed))
      let rendered = 0
      for (const seed of [...new Set(seeds)]) {
        const png = join(out, `${index}-${seed}.png`)
        const failed = run(sdk.ipgen, [binary, "--seed", String(seed), "-o", png])
        if (failed) {
          warn(`sources/${entry} seed ${seed} fails to render: ${failed.split("\n")[0]}`)
          continue
        }
        rendered++
        if (selected.has(seed) && pngIsEmpty(readFileSync(png))) warn(`sources/${entry} seed ${seed} (seed preview) renders an empty image`)
      }
      note(`sources/${entry}: compiled, ${bytes(size)}, ${rendered} seeds rendered`)
    }
    note(`compiled with Infinite Props ${sdk.version} (${sdk.dir}) in ${((Date.now() - started) / 1000).toFixed(1)}s`)
  } finally {
    rmSync(out, { recursive: true, force: true })
  }
}

export const printReport = ({ errors, warnings, notes }, heading) => {
  const print = (label, items) => items.length && console.log(`\n${label}\n${items.map((item) => `  - ${item}`).join("\n")}`)
  console.log(heading)
  print("ERRORS", errors)
  print("WARNINGS", warnings)
  print("INFO", notes)
}
