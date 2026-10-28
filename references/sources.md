# Sources

The store compiles the uploaded `.ips` files itself, with the Infinite Props release named in
`listing.json` → `compiler_version`. Binaries are never uploaded (`IPROP_UPLOADED`); buyers get the sources
plus the `.iprop` files the store compiled, each next to its entry.

## Layout

```
sources/
  sword/sword.ips          entry
  sword/blade.ips          part (imported by sword.ips)
  axe/axe.ips              entry
  axe/head.ips             part
  weapons_common/haft.ips  part shared via "../weapons_common/haft.ips"
```

- **Entry**: a file no other `.ips` in the package imports. Each entry is compiled to its own `.iprop`.
- **Part**: any imported file. Parts ship in the download but are not compiled on their own.
- `type: "asset"` needs exactly one entry, `type: "pack"` two or more. A stray unused file becomes an extra
  entry. Delete it or import it.
- Imports are resolved inside the package (`import name from "relative/path.ips"`). An import that points
  at a file not in the package is rejected (`UNRESOLVED_IMPORT`).
- Paths in `preview-selection.json` are relative to `sources/` (`sword/sword.ips`).

## Material libraries (0.8.0 and newer)

Infinite Props 0.8.0 adds reusable materials: a `.ips` file with one or more `material Name { ... }`
definitions and no `asset`. An asset imports it like any other file and qualifies the materials by the
import alias:

```
sources/
  tree/tree.ips              entry: import forest from "materials/forest.ips"; bark = forest.Bark()
  tree/materials/forest.ips  material library (imported, so not an entry)
```

- Needs `"compiler_version": "0.8.0"` or newer; with an older version the package is rejected
  (`MATERIALS`) before compiling.
- A library must be imported by an asset. One that nothing imports would be an entry with nothing to
  compile and is rejected (`UNUSED_MATERIAL`).
- Libraries ship to buyers like parts and are never compiled on their own. Seed previews can only point at
  asset entries.
- `ipc <library>.ips --check` checks a library on its own; `check-listing.mjs` compiles the assets that
  import it.

## How the store compiles

For every entry the worker runs `ipc <entry>.ips -o <entry>.iprop` from the entry's folder with the exact
declared release (downloaded from github.com/jCzachor6/infinite-props and checked against the release
SHA-256 sums), then `ipval` on the result. Any compiler error rejects the package with the compiler
message, for example `COMPILATION_FAILED: sources/potion/potion.ips: ipc exited 1: ipc: vessel.ips:419:23:
error: unexpected character '@'`.

## Limits

| Rule | Limit |
|---|---|
| `.ips` files | 1-64, only under `sources/` |
| `.ips` size | ≤ 256 KiB each, ≤ 2 MiB in total |
| Compiled binary | ≤ 4 MiB per entry, must pass `ipval` |
| Compile time | 20 s per entry; the whole validation runs in a worker with a 30 s limit |
| Names | every folder and file: letters, digits, `.`, `_`, `-`, starting with a letter or digit; **no spaces** |
| Depth | at most 8 nested folders |
| Paths | unique ignoring letter case; no links, no absolute paths, no `..` |
| Whole package | ≤ 200 files, ≤ 5 MiB unpacked (gallery included), `.rar` ≤ 10 MiB, RAR4, not encrypted |

The store does not render seeds. `check-listing.mjs` still renders seeds 1-15 and every selected seed with
`ipgen`, because buyers run every seed: a trap or an empty preview is a broken product even when the
upload passes.

## Before packing

- Remove macOS duplicates (`sword 2/`, `blade 2.ips`), editor backups and experiments. Everything under
  `sources/` that ends in `.ips` ships to buyers.
- Make seeds 1-15 look good; they are what buyers try first.
- Document every declared input and output in the README; buyers need it to drive the asset from code.
- Update a published listing only by uploading a complete new package as a new version. Sources are never
  patched in place.
