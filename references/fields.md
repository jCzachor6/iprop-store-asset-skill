# Listing fields

Everything the creator panel's **Add an asset or pack for sale** form sends, with the server's limits
(`apps/api/src/api/vendor/iprop-packs/validators.ts` in mercur) and where buyers see it.

`listing.json` mirrors the form so the checker can validate it:

```json
{
  "type": "pack",
  "title": "Weapons Pack",
  "description": "Four procedural pixel-art weapon generators: swords, axes, spears and magic staves. Every seed gives a new 96 × 96 design.",
  "category": "Weapons",
  "price_eur": 24,
  "version": "1.0.0",
  "changelog": "First release.",
  "sources": "sources"
}
```

For a new version add `"previous_version": "1.0.0"` and run the checker with `--update`. Title,
description, category and price are ignored for updates.

| Field | Panel label | Rule | Shown to buyers |
|---|---|---|---|
| `type` | What are you selling? | `asset` = exactly 1 entry; `pack` = 2+ entries. Imported parts never count. Fixed after creation. | Pack contents list, catalog counts |
| `title` | Title | 2-120 characters after trimming. Required. Auto-filled from the first file/folder name, so always overwrite it. | Product page heading, catalog card, browser tab, social share title, `Title - Infinite Props` meta description |
| (handle) | not in the form | Generated from the title (`weapons-pack`). It becomes the URL `/products/<handle>`, so choose the title with the URL in mind. | URL |
| `description` | Description | Optional, ≤ 4000 characters, but the product page shows only the first **260 characters** as plain text (HTML/Markdown stripped, cut with "…"). Write one or two sentences: what it generates, the canvas size and what is included. | Beside the thumbnail, title and price at the top of the product page |
| `category` | Category | One of the 40 store categories, or none. The panel offers one category (the API allows up to 5). | Catalog filter, header **All categories** menu |
| `price_eur` | Commercial license (EUR) | > 0 and ≤ 100000; the panel input accepts 1, 1.5, 2 … (steps of 0.5). It is the price buyers pay, **VAT included**. One price per listing. | Price, cart, invoice |
| `version` | Version | `major.minor.patch`, each part 0-99999 without leading zeros. First release defaults to `1.0.0`. Every new submission must be strictly higher than all earlier ones, rejected included. | Product page, library version picker, `VERSION.txt` in the download |
| `changelog` | Release notes | First release: optional, ≤ 4000. New version: required, 5-4000 characters. | Version history in the library and admin review |
| `README.md` | Readme (.md or .txt, optional) | See below. | Collapsed **README** section on the product page, and in the ZIP |
| gallery | Gallery previews | Four fixed slots, see `gallery.md`. | Thumbnail and gallery |
| `preview-selection.json` | Seed previews | 1-15 unique `{entry_path, seed}` pairs; seeds 0-4294967295; only entries, not parts. Omitted: 15 round-robin seeds (pack) or seeds 1-15 (asset). An update without a selection keeps the previous one. | Interactive seeded viewer below the gallery |
| rights | checkbox | Must be ticked; stored as a consent receipt per release. See `review.md`. | — |

## Categories

Characters, Weapons, Nature, Items, Backgrounds, Pixel Art, Top Down, RPG, Space, Zombies, Fantasy,
Sci-Fi, Horror, Medieval, Modern, Cyberpunk, Steampunk, Post-Apocalyptic, Dungeon, Platformer, Isometric,
Side Scroller, Tilesets, Terrain, Buildings, Interiors, UI, Icons, Vehicles, Robots, Creatures, Animals,
NPCs, Bosses, Armor, Food, Tools, Effects, Magic, Water.

Pick what buyers would browse for first: the subject (Weapons, Characters, Nature) usually beats the
style (Pixel Art, Fantasy).

## README

- File name exactly `README.md`, `README.markdown` or `README.txt` (case-insensitive), ≤ 64 KiB UTF-8.
- Markdown is rendered with GitHub-flavoured tables and code blocks. Images, raw HTML, inline styles and
  non-http(s)/mailto links are stripped. `.txt` is shown preformatted.
- It is collapsed by default on the product page and shipped in the download next to the sources, the
  compiled `.iprop` files, `VERSION.txt` and an order-specific `LICENSE.txt`.
- Template: `templates/listing/README.md`.

## Writing the copy

- English only (the whole store is English).
- Title: the thing, not adjectives. "Weapons Pack", "Potion Lab", "Mushroom Grove". Add "Pack" only if it
  really is one.
- Description: lead with what the seed produces, then the size and the count.
  "Procedural pixel-art potions in six liquids and five fill levels. 64 × 64 sprites, one new bottle per seed."
- Do not promise what the README or previews do not show (engines, animation, sizes). The Creator Terms
  require an accurate description: contents, what it generates, runtime version and limits.
