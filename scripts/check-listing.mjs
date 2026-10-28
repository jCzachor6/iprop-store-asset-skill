#!/usr/bin/env node
// Checks a listing folder against iprop.store's upload rules before it is packed and uploaded.
// Usage: node check-listing.mjs <listing-dir> [--update] [--no-compile] [--no-fetch]
import { resolve } from "node:path"
import { checkListing, printReport } from "./lib/check.mjs"

const args = process.argv.slice(2)
const dir = args.find((arg) => !arg.startsWith("--"))
if (!dir) {
  console.error("Usage: node check-listing.mjs <listing-dir> [--update] [--no-compile] [--no-fetch]")
  process.exit(2)
}
const update = args.includes("--update")
const root = resolve(dir)
const report = checkListing(root, { update, compile: !args.includes("--no-compile"), fetch: !args.includes("--no-fetch") })
printReport(report, `Listing: ${root}${update ? " (new version)" : ""}`)
const { errors, warnings } = report
console.log(errors.length
  ? `\n✗ ${errors.length} error(s): the store would reject this package.`
  : `\n✓ Ready to pack${warnings.length ? ` (${warnings.length} warning(s) worth a look)` : ""}: node scripts/pack-listing.mjs ${dir}`)
process.exit(errors.length ? 1 : 0)
