# Sources

The store compiles and renders the uploaded `.ips` files itself with the bundled Infinite Props runtime
(currently **0.7.1**, source language 0.7). Binaries are never uploaded; buyers get the sources plus the
`.iprop` files the store compiled.

## Layout

```
sources/
  sword/sword.ips          entry
  sword/blade.ips          part (imported by sword.ips)
  axe/axe.ips              entry
  axe/head.ips             part
  weapons_common/haft.ips  part shared via "../weapons_common/haft.ips"
```

- **Entry**: a file no other uploaded file imports. Each entry is one asset with its own seed previews.
- **Part**: any imported file. Parts ship in the download but cannot be selected for previews.
- `type: "asset"` needs exactly one entry, `type: "pack"` two or more. A stray unused file becomes an extra
  entry. Delete it or import it.
- Imports resolve only against the uploaded tree. `../` may go up to a sibling folder inside it but never
  outside, and there is no access to host files.
- Paths in `preview-selection.json` are relative to `sources/` (`sword/sword.ips`).

## Limits

| Rule | Limit |
|---|---|
| Files | 1-64 `.ips` files |
| File size | ≤ 256 KiB each, ≤ 2 MiB in total |
| Folder names | letters, digits, `_`, `-`; first character a letter or digit; ≤ 64 chars; ≤ 8 levels; **no spaces or dots** |
| File names | letters, digits, `.`, `_`, `-`; first character a letter or digit; ≤ 100 chars; must end in `.ips` |
| Skipped folders | `release/`, `out/`, `.git/` are dropped by the panel's folder picker |
| Canvas | ≤ 2048 px per side and ≤ 1,048,576 px in total (for example 1024 × 1024) |
| Compiled binary | ≤ 4 MiB per entry |
| Fuel | the compiler's 5,000,000 budget; sources cannot raise it |
| Smoke test | every entry must render seeds **1-15** without trapping |
| Time | compile + render of the whole listing within 45 s on the shared server (aim for a few seconds locally) |

Compilation errors come back with file, line, column and suggestions. `check-listing.mjs` prints the same
diagnostics locally and reports each entry's canvas, inputs, outputs, binary size and peak fuel.

## Before uploading

- Remove macOS duplicates (`sword 2/`, `blade 2.ips`), editor backups and experiments.
- Keep only what the listing sells, plus its parts. Everything uploaded ships to buyers.
- Make seeds 1-15 look good. They are the store's smoke seeds and, without a selection, the default
  previews.
- Document every declared input and output in the README; buyers need it to drive the asset from code.
- Update an existing listing only by submitting a new version with the full source tree. Sources are
  never patched in place.

## In the panel

- Several folders: use **Add an asset or pack folder** once per top-level folder under `sources/`. Files
  accumulate and the folder names become the path prefix (`sword/…`, `axe/…`), so imports keep working.
- Loose files at the top of `sources/`: use the **Sources (.ips)** file picker (paths are just the file name).
- Do not pick `sources/` itself, or every path gets a `sources/` prefix and your
  `preview-selection.json` paths will not match.
- The right-hand **Compilation** panel shows each file as `asset` or `part`, its imports and errors.
  **Clear sources** starts over.
