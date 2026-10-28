---
name: iprop-store-asset
description: Prepare an Infinite Props asset or pack for sale on iprop.store - the listing folder (listing.json with compiler_version, README, .ips sources, the four gallery images, seed previews), the checks the store runs, packing it into the RAR4 .rar the upload form takes, the submission form (price in USD) and review. Use when someone wants to list, publish, upload, sell or update a prop, asset or pack on iprop.store / the Infinite Props store, pack a listing into a .rar, make store previews, or check whether a package will pass the store's upload validation.
---

# Prepare an asset for iprop.store

iprop.store sells Infinite Props `.ips` recipes as a **single asset** or a **pack**. A creator uploads
**one `.rar` package** in the creator panel (https://iprop.store/creator/assets). The server validates it,
compiles every entry with the Infinite Props release the package declares (`compiler_version`) and keeps
the compiled `.iprop` files next to the sources. The creator then fills the submission form (title,
description, category, price in USD, changelog) and sends it to review. An admin approves it in
https://iprop.store/admin/moderation and it goes on sale as `v1`.

This skill builds a listing folder that passes the upload on the first try and packs it into that `.rar`.

## The listing folder

Copy `templates/listing/` and fill it in:

```
my-pack/
  listing.json             type, title, description, category, compiler_version, changelog
  README.md                buyer documentation (ships in the download)
  preview-selection.json   optional: 1-15 {entry_path, seed} pairs
  sources/                 the .ips tree: one folder per asset plus shared folders
  gallery/                 preview.webp, preview1.webp, preview2.webp, preview3.gif
  cover-prompt.md          optional notes; never packed
```

The packer puts exactly `listing.json`, `README.md`, `preview-selection.json`, `sources/**/*.ips` and the
four gallery slots into the archive. Everything else stays out, because every packed file ships to buyers.

## Workflow

1. **Sources.** Gather every `.ips` entry and everything it imports under `sources/`, keeping relative
   import paths. An *entry* is a file no other file imports; a *part* is imported. Asset = exactly 1 entry,
   pack = 2 or more. Material libraries (0.8.0+) are imported like parts. Rules and limits:
   `references/sources.md`.
2. **listing.json.** Fill every field, including `compiler_version` (the release the store must compile
   with, e.g. `0.7.1`). Limits and where buyers see each field: `references/fields.md`.
3. **README.** Start from `templates/listing/README.md`: entries, canvas size, inputs, outputs, usage, the
   compiler version and the license line.
4. **Seed previews (optional).** Up to 15 `{entry_path, seed}` pairs in `preview-selection.json`, spread
   across the entries. `node scripts/render-seeds.mjs <folder>` renders them with the SDK. The store renders
   the same pairs at upload (without the file: seeds 1-15 across the entries) and shows them in the seed
   preview on the asset page; without a cover the first render is the catalog thumbnail.
5. **Gallery.** Four images at exact sizes: `references/gallery.md`. `render-seeds.mjs --sheet` turns the
   selected seeds into `preview2.webp`. The cover is usually an illustration; say so in the README.
6. **Check.** `node scripts/check-listing.mjs <folder>` (add `--update` for a new version) applies the
   store's rules and compiles every entry with the declared release (`ipc` + `ipval`), then renders seeds
   1-15 and the selected seeds with `ipgen`. Fix every error, read the warnings.
7. **Pack.** `node scripts/pack-listing.mjs <folder>` runs the same check and writes `<folder>.rar`
   (RAR4, stored). Do not make the archive with WinRAR or `rar`: they write RAR5, which the store cannot read.
8. **Upload and submit.** Follow `references/upload.md`: upload the `.rar`, create the submission (price in
   USD cents), submit for review, approve in moderation. Review rules: `references/review.md`.

The scripts need Node 20+ and the Infinite Props SDK of the declared version. They use `IPROP_SDK` (an
unpacked SDK folder) when it is set, then `~/.cache/iprop-store-asset/compilers/<version>`, and otherwise
download the release from github.com/jCzachor6/infinite-props into that cache and verify its SHA-256, the
same way the store does.

## Things that bite

- **RAR4 only.** The store reads RAR4 archives; a RAR5 file (the WinRAR/`rar` default) is rejected as
  `CORRUPT`. ZIP and other formats are rejected as `NOT_RAR`. Use `pack-listing.mjs`.
- **`compiler_version` is required** and must be a released version the store accepts (0.4.0, 0.5.0,
  0.6.0, 0.7.0, 0.7.1, 0.7.2, 0.8.0). The store compiles exactly that version; it never picks one for you.
  0.8.0 is accepted as soon as its GitHub release is published; until then the download fails
  (`COMPILER_UNAVAILABLE`).
- **Materials need 0.8.0.** A `material` definition with an older `compiler_version` is rejected
  (`MATERIALS`), and a material library no asset imports is rejected (`UNUSED_MATERIAL`).
- **No `.iprop` in the package.** Uploaded binaries are rejected (`IPROP_UPLOADED`); the server compiles.
- **5 MiB unpacked for the whole package**, gallery included, and 10 MiB for the `.rar`. Large GIFs eat the
  budget fast.
- Names: every folder and file in the archive uses letters, digits, `.`, `_`, `-` and starts with a letter
  or digit. **No spaces**, so macOS copies like `sword 2/` or `blade 2.ips` break the upload.
- Gallery images must be **exactly** 720 × 480 / 1440 × 960 in the format the slot names (WebP or GIF),
  ≤ 3 MiB each, the GIF ≤ 60 frames. Renaming a PNG does not convert it.
- `price_eur`, `price` and `version` in `listing.json` are ignored with a warning: the price is set in the
  submission form in **USD cents** (0 = free), and the store numbers versions `v1`, `v2`, … itself.
- A new version needs a changelog of 5-4000 characters in the form, and is reviewed again like the first.
- Only an ACTIVE creator (business details saved, Stripe connected) can upload. Previews must show what the
  pack generates; an illustration must be labelled. No third-party art, logos or trademarks.
