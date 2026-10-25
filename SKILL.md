---
name: iprop-store-asset
description: Prepare an Infinite Props asset or pack for sale on the iprop.store asset store - listing fields (title, description, category, price, version, changelog), .ips source folders, README, the four gallery previews (exact sizes and formats), the 15 seed previews, rights and review. Use when someone wants to list, publish, upload, sell or update a prop, asset or pack on iprop.store / Infinite Props store, make store previews, thumbnails or covers for it, or check whether a pack will pass the creator-panel upload.
---

# Prepare an asset for the Infinite Props store

The store (https://iprop.store, creator panel https://creators.iprop.store) sells `.ips` recipes as a
**single asset** or a **pack**, always under one **Commercial** license and one EUR price. A creator fills
one form in the panel's **Infinite Props** page; the server compiles the sources, renders seeds, checks the
images and sends the release to admin review. This skill builds a listing folder that passes that form on
the first try.

## The listing folder

Prepare everything in one folder (copy `templates/listing/`):

```
my-pack/
  listing.json             title, type, description, category, price_eur, version, changelog
  README.md                buyer documentation (shipped in the ZIP and shown on the product page)
  preview-selection.json   1-15 {entry_path, seed} pairs shown as interactive previews
  sources/                 the .ips tree: one folder per asset plus shared folders
  gallery/                 preview.webp, preview1.webp, preview2.webp, preview3.gif
  cover-prompt.md          optional: prompt used for an illustrated cover
```

## Workflow

1. **Sources.** Gather every `.ips` entry and everything it imports under `sources/`, keeping relative
   import paths. An *entry* is a file no other file imports; a *part* is imported. Asset = exactly 1 entry,
   pack = 2 or more. Rules and limits: `references/sources.md`.
2. **Listing fields.** Fill `listing.json`. Every field, its limit and where buyers see it:
   `references/fields.md`. Keep the description at most 260 characters, plain text.
3. **README.** Start from `templates/listing/README.md`. Describe the entries, canvas size, inputs,
   outputs, usage and the license line. No images (they are stripped).
4. **Seed previews.** Choose up to 15 `{entry_path, seed}` pairs in `preview-selection.json`, spread
   across the entries and showing the range of designs. The panel needs them entered by hand; the file is
   the plan and the checker validates it.
5. **Gallery.** Make the four images at the exact sizes: `references/gallery.md`.
   `node scripts/render-gallery.mjs <folder>` renders real sprites into `preview2.webp` (contact sheet) and
   `preview3.gif` (animation). The cover `preview.webp` (720 × 480) is usually an illustration. Label it as
   promotional artwork in the README; the Creator Terms require that.
6. **Check.** Run `node scripts/check-listing.mjs <folder>` (add `--update` for a new version). It applies
   the store's exact rules: field limits, path names, import graph, compile with the store's runtime,
   canvas, fuel and binary limits, seeds 1-15, selected seeds, image format, size, frames and the server's
   re-encode size. Fix every error. Read the warnings.
7. **Upload.** Follow `references/upload.md`: the panel steps, the rights checkbox, then approval in
   https://admin.iprop.store (Products → the listing → **Infinite Props release review** → Approve).

The scripts load `sharp` and the Infinite Props runtime from the mercur checkout
(`MERCUR_DIR`, default `~/Desktop/quants-space/mercur`; build `packages/iprop` there first if `dist` is
missing). Without it the checker still runs every check except compiling and re-encoding.

## Things that bite

- Gallery images must be **exactly** 720 × 480 / 1440 × 960, **WebP** (static) or **GIF** by slot. Renaming
  a PNG does not work. A 1440 × 960 GIF can have at most **24 frames** (32 MP decode limit), and every file
  must stay ≤ 3 MiB **after** the server re-encodes it (lossless WebP / GIF).
- Folder and file names: letters, digits, `_`, `-` (files may also use `.`). **No spaces.** macOS copies
  such as `sword 2/` break the upload. `release/`, `out/` and `.git/` are silently skipped.
- Title, description, category and price are set **once** when the listing is created. A new version can
  change only sources, README, gallery, seed selection, version and changelog. Get them right first.
- A new version needs a strictly higher `x.y.z` than every earlier submission, rejected ones included, and a
  changelog of at least 5 characters. Uploading any gallery image in an update **replaces the whole
  gallery**, so re-upload all slots you want to keep.
- Previews must show what the pack generates; an illustration must be labelled as such. No third-party
  art, logos or trademarks. Rules for what reviewers reject: `references/review.md`.
- The price is in EUR, VAT included, entered in steps of 0.5 (min 1). Creator sign-up is closed for now,
  so only the store's own account (Infinite Props) lists packs.
