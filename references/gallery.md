# Gallery and seed previews

## Gallery slots

Four optional images in `gallery/`. The store checks the real bytes, not the extension.

| Slot | File | Size | Format | Role |
|---|---|---|---|---|
| 1 | `preview.webp` | **720 × 480** | static WebP | Cover and listing thumbnail |
| 2 | `preview1.webp` | **1440 × 960** | static WebP | Overview of real renders |
| 3 | `preview2.webp` | **1440 × 960** | static WebP | Range: a contact sheet of real seeds |
| 4 | `preview3.gif` | **1440 × 960** | GIF | Optional animation |

Hard limits (`RarPackageValidator` in iprop-store):

- Exact pixel size and the format the slot names. A renamed PNG is rejected (`GALLERY`).
- ≤ 3 MiB per file (`GALLERY_TOO_LARGE`); the GIF ≤ 60 frames.
- The whole package is ≤ 5 MiB unpacked, **gallery included**. Four images of 1 MiB leave 1 MiB for
  everything else; keep the GIF flat-coloured and short (10-24 frames).
- The gallery ships in the buyer's download together with the sources.

Note: the current product page does not show the gallery yet (checklist item UI-05 is open). The images
are validated, stored and shipped now, so make them right; they appear once the page shows them.

## What to put in each slot

**`preview.webp`: the cover (720 × 480).** It must read at thumbnail size.
- One strong composition: the pack's subjects, large, with a generous safe margin (≥ 40 px).
- Optional title text, large and short ("WEAPONS PACK"). No prices, badges, ratings or fake UI.
- Store look: graphite background (`#161a1f` / `#13161a`), light text, yellow accent `#f5d90a`. Pixel art
  stays pixel-crisp: integer, nearest-neighbour scaling only.
- An illustrated or AI-generated cover is allowed if it shows the real subjects and the README says it is
  promotional artwork. Keep the prompt in `cover-prompt.md` (never packed).

**`preview1.webp`: overview (1440 × 960).** Real renders: one card per entry (pack) or the main variations
(asset), with the entry name, canvas size and what the inputs control.

**`preview2.webp`: range (1440 × 960).** A contact sheet of real seeds.

**`preview3.gif`: motion (1440 × 960, optional).** A seed cycle, an input sweep or an animation the asset
really has. Infinite loop, 500-1500 ms per frame, flat backgrounds without dithering.

All renders: transparent sprites on the dark background, integer nearest-neighbour upscale, the same
scale for every seed of one entry so sizes stay honest.

## Rendering with the SDK

```sh
node scripts/render-seeds.mjs my-pack            # renders/<entry>-seed<N>.png + renders/contact-sheet.png
node scripts/render-seeds.mjs my-pack --sheet    # also gallery/preview2.webp (needs cwebp: brew install webp)
```

It compiles with the declared `compiler_version` (`ipc`), renders the pairs from `preview-selection.json`
(or seeds 1-15 spread over the entries) with `ipgen`, and lays them out at an integer scale per entry on the
store background. `renders/` is never packed. For a custom layout (cards per entry, labels, input sweeps,
the GIF), compose the PNGs in your own tool; `ipgen <file.iprop> --seed N --uniform name=value -o out.png`
renders any variant.

## Seed previews (`preview-selection.json`)

```json
[
  { "entry_path": "sword/sword.ips", "seed": 7 },
  { "entry_path": "axe/axe.ips", "seed": 37 }
]
```

- Optional. When present: 1-15 unique pairs, entries only (not imported parts), seed 0-4294967295; paths
  relative to `sources/` (a `sources/` prefix is accepted too). Anything else rejects the package
  (`SELECTION`).
- Spread them across all entries and show the range: plain, rare, extreme. Skip seeds that render empty
  or nearly identical; the checker warns about empty ones.
