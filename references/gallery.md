# Gallery and previews

A listing has two kinds of pictures:

1. **Author gallery**: four images you make (`gallery/`).
2. **Seed previews**: rendered by the store from your sources for the 1-15 pairs in
   `preview-selection.json`. You choose them; you do not make them.

## Author gallery slots

| Slot | File | Size | Format | Role |
|---|---|---|---|---|
| 1 | `preview.webp` | **720 × 480** | static WebP | Listing thumbnail (catalog cards, cart, creator panel, social share image) and the image beside the title at the top of the product page |
| 2 | `preview1.webp` | **1440 × 960** | static WebP | First full-width image below the top section |
| 3 | `preview2.webp` | **1440 × 960** | static WebP | Second full-width image |
| 4 | `preview3.gif` | **1440 × 960** | animated GIF | Optional animation, last in the stack |

All slots are 3:2. Every slot is optional, but a listing without `preview.webp` falls back to a raw seed
render as its thumbnail. Always make the cover.

Hard limits (checked by the panel and again by the server, `apps/api/src/lib/iprop/media.ts`):

- Exact pixel size and the format the slot names. The server reads the real bytes; renaming a PNG to
  `.webp` is rejected.
- WebP slots must be single-frame. The GIF may be animated.
- ≤ 3 MiB per file, ≤ 12 MiB for all four, ≤ 2048 px per side.
- GIF: ≤ 60 frames **and** ≤ 32 MP decoded in total, so a 1440 × 960 GIF can have at most **24 frames**.
- The server strips metadata and **re-encodes**: WebP as *lossless* WebP, GIF with effort 3. The result
  must still be ≤ 3 MiB. Noisy, photographic or gradient-heavy 1440 × 960 images can grow past 3 MiB as
  lossless. `check-listing.mjs` runs the same re-encode and reports the final size.
- The images keep their proportions and are never cropped. Native GIF animation is kept.

Export WebP as lossless. The server stores lossless anyway, so lossy compression only adds artifacts.

## What to put in each slot

**`preview.webp`: the cover (720 × 480).** It must read at thumbnail size (~300 px wide in the catalog).
- One strong composition: the pack's subjects, large, with a generous safe margin (≥ 40 px) on all sides.
- Optional title text, large and short ("WEAPONS PACK"). No prices, badges, ratings or fake UI.
- Store look: graphite background (`#161a1f` / `#13161a`), light text, yellow accent `#f5d90a`, optional
  blue-purple glow. Pixel art stays pixel-crisp: integer, nearest-neighbour scaling only.
- An illustrated or AI-generated cover is allowed if it shows the real subjects and the README says it is
  promotional artwork. Keep the prompt in `cover-prompt.md` (template in `templates/listing/`). Render at
  1536 × 1024 or larger, then downscale to exactly 720 × 480.

**`preview1.webp`: overview (1440 × 960).** Real renders: one card per entry (pack) or the main variations
(asset), with the entry name, canvas size and what the inputs control.

**`preview2.webp`: range (1440 × 960).** A contact sheet of real seeds. `render-gallery.mjs` makes it from
`preview-selection.json`.

**`preview3.gif`: motion (1440 × 960, optional).** A seed cycle, a fill/state input sweep, or a
`renderPass` colour/emission toggle. 4-24 frames, 800-1500 ms each, infinite loop, flat backgrounds
without dithering. `render-gallery.mjs` makes a seed cycle.

All renders: transparent sprites on the dark background, integer nearest-neighbour upscale, the same
scale for every seed of one entry so the sizes stay honest, and labels like `sword/sword.ips · seed 37`.

## Generating the real-render slots

```sh
node scripts/render-gallery.mjs my-pack                    # preview2.webp + preview3.gif
node scripts/render-gallery.mjs my-pack --sheet preview1.webp --no-gif
node scripts/render-gallery.mjs my-pack --force            # replace existing files
```

It compiles `sources/` with the store's runtime, renders the selected pairs (or the store's default
selection) and writes into `gallery/`. For a custom layout (cards per entry, input sweeps), write a script
modelled on `deploy/demo/weapons-pack/prepare-gallery.mjs` in mercur. It uses `loadIpropCompiler`,
`loadIpropRuntime` and `program.generate({ seed, uniforms })` from `packages/iprop`, composited with `sharp`.

## Seed previews (`preview-selection.json`)

```json
[
  { "entry_path": "sword/sword.ips", "seed": 7 },
  { "entry_path": "axe/axe.ips", "seed": 37 }
]
```

- 1-15 pairs, unique, entries only (not imported parts), seed 0-4294967295. Different entries may share a
  seed.
- Order matters: the viewer plays them in this order, and the first pair is the fallback thumbnail when
  there is no `preview.webp`.
- Spread them across all entries (a pack's viewer has **All** and per-file filters), and show the range:
  plain, rare, extreme. Skip seeds that render empty or nearly identical.
- The store renders each pair at native proportions: hero longest side 512 px, each seed 256 px, nearest
  neighbour. Buyers can zoom 1×-8× on checkerboard, light, dark, green and purple backgrounds, so the
  transparency edges must be clean.
- In the panel, enter the pairs in **Seed previews** (Add preview → pick file → seed), then **Render
  selected previews** before submitting.
