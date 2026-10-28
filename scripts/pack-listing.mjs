#!/usr/bin/env node
// Packs a listing folder into the .rar the store's upload form takes: RAR4, stored, with exactly
// listing.json, README, preview-selection.json, sources/**/*.ips and the gallery slots. Runs the
// checker first and refuses to pack a folder the store would reject.
// Usage: node pack-listing.mjs <listing-dir> [-o out.rar] [--update] [--no-compile] [--no-fetch] [--force]
import { readFileSync, statSync } from "node:fs"
import { basename, resolve } from "node:path"
import { bytes, checkListing, printReport } from "./lib/check.mjs"
import { RULES, rar4, writeFile } from "./lib/store.mjs"

const args = process.argv.slice(2)
const outIndex = args.findIndex((arg) => arg === "-o" || arg === "--out")
const out = outIndex >= 0 ? args[outIndex + 1] : null
const dir = args.find((arg, index) => !arg.startsWith("-") && (outIndex < 0 || index !== outIndex + 1))
if (!dir) {
  console.error("Usage: node pack-listing.mjs <listing-dir> [-o out.rar] [--update] [--no-compile] [--no-fetch] [--force]")
  process.exit(2)
}
const root = resolve(dir)
const report = checkListing(root, {
  update: args.includes("--update"),
  compile: !args.includes("--no-compile"),
  fetch: !args.includes("--no-fetch"),
})
printReport(report, `Listing: ${root}`)
if (report.errors.length && !args.includes("--force")) {
  console.log(`\n✗ ${report.errors.length} error(s): not packed. Fix them first (or --force to pack anyway).`)
  process.exit(1)
}

const target = resolve(out ?? `${root}.rar`)
// listing.json first, so the archive reads top-down like the folder.
const entries = report.included
  .sort((a, b) => (a.archivePath === "listing.json" ? -1 : b.archivePath === "listing.json" ? 1 : 0))
  .map((file) => ({ name: file.archivePath, data: readFileSync(file.path) }))
writeFile(target, rar4(entries))
const size = statSync(target).size
console.log(`\n✓ Packed ${entries.length} files into ${target} (${bytes(size)}, RAR4)`)
if (size > RULES.maxArchiveBytes) console.log(`✗ The archive is above the upload limit of ${bytes(RULES.maxArchiveBytes)}`)
console.log(`Upload ${basename(target)} at https://iprop.store/creator/assets (references/upload.md).`)
