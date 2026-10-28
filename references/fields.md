# Listing fields

`listing.json` sits at the top of the package. The store validates it on upload
(`RarPackageValidator` in iprop-store) and pre-fills the submission form from it.

```json
{
  "type": "pack",
  "title": "Weapons Pack",
  "description": "Four procedural pixel-art weapon generators: swords, axes, spears and magic staves. Every seed gives a new 96 × 96 design.",
  "category": "Weapons",
  "compiler_version": "0.7.1",
  "changelog": "First release."
}
```

| Field | Rule | Where it goes |
|---|---|---|
| `type` | `asset` = exactly 1 entry, `pack` = 2+ entries; imported parts never count. Optional: without it the store infers the type from the entries. A mismatch is rejected (`TYPE_MISMATCH`). | Package details, moderation |
| `title` | Required, 2-120 characters after trimming. | Pre-fills the form's **Title**: product page heading, catalog tile, browser tab, order e-mails |
| `description` | Optional, ≤ 4000 characters, plain text. Catalog tiles print it in full, so keep it to one or two sentences (about 260 characters): what a seed generates, the canvas size, what is included. | Pre-fills **Description**: catalog tile and product page |
| `category` | One of the 40 categories below, or none. An unknown name is rejected (`CATEGORY`). | Pre-fills **Category**: catalog filter |
| `compiler_version` | **Required**, `x.y.z`, a released Infinite Props version the store accepts: 0.4.0, 0.5.0, 0.6.0, 0.7.0, 0.7.1, 0.7.2, 0.8.0 (usable once its GitHub release is out). Materials need 0.8.0 or newer. Missing or malformed: `COMPILER_VERSION`; unknown or not downloadable: `COMPILER_UNAVAILABLE`. | The server compiles every entry with exactly this release |
| `changelog` | Optional, ≤ 4000 characters. The form has its own **Changelog** field (required, 5-4000 characters, for a new version); paste it there. | Version history on the product page and in moderation |
| `price_eur`, `price`, `version`, `sources` | Not used. `price_eur`/`version` give a warning: the price is entered in the form in USD cents and versions are numbered `v1`, `v2`, … by the store. The tree is always read from `sources/`. | — |

## Set in the submission form, not in the package

| Form field | Rule |
|---|---|
| **Price (USD cents)** | Integer ≥ 0; `0` makes the asset free (buyers add it to the library without checkout). `1200` = $12.00. The creator can change the price of a published asset later in **Products**. |
| **Changelog** | Required for a new version of a published asset (5-4000 characters). |
| **Tags** | After publishing, in **Products → Tags**, from the admin's tag dictionary. Creators cannot create tags or categories. |

## Categories

Characters, Weapons, Nature, Items, Backgrounds, Pixel Art, Top Down, RPG, Space, Zombies, Fantasy,
Sci-Fi, Horror, Medieval, Modern, Cyberpunk, Steampunk, Post-Apocalyptic, Dungeon, Platformer, Isometric,
Side Scroller, Tilesets, Terrain, Buildings, Interiors, UI, Icons, Vehicles, Robots, Creatures, Animals,
NPCs, Bosses, Armor, Food, Tools, Effects, Magic, Water.

Pick what buyers would browse for first: the subject (Weapons, Characters, Nature) usually beats the
style (Pixel Art, Fantasy).

## README

- File name `README.md`, `README.markdown` or `README.txt` (case-insensitive) at the top of the package,
  ≤ 64 KiB. Without one the upload gets a warning.
- It ships in the download next to the sources, the compiled `.iprop` files and the gallery.
- Template: `templates/listing/README.md`.

## Writing the copy

- English only (the whole store is English).
- Title: the thing, not adjectives. "Weapons Pack", "Potion Lab", "Mushroom Grove". Add "Pack" only if it
  really is one.
- Description: lead with what the seed produces, then the size and the count.
  "Procedural pixel-art potions in six liquids and five fill levels. 64 × 64 sprites, one new bottle per seed."
- Do not promise what the README or previews do not show (engines, animation, sizes).
