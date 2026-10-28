# iprop-store-asset

A Claude Code skill for preparing Infinite Props assets and packs for sale on
[iprop.store](https://iprop.store): the listing folder (`listing.json` with `compiler_version`, README,
`.ips` sources, gallery, seed previews), the store's upload checks, and packing it into the RAR4 `.rar`
the creator panel takes.

## Install

```sh
git clone https://github.com/jCzachor6/iprop-store-asset-skill.git ~/.claude/skills/iprop-store-asset
```

Claude Code picks it up when you ask to list, upload or update an asset on the store, pack a listing or
make its previews. Read `SKILL.md` for the workflow.

## Scripts

Node 20+. They compile and render with the Infinite Props SDK of the listing's `compiler_version`
(`IPROP_SDK`, else `~/.cache/iprop-store-asset/compilers`, filled from the GitHub release and SHA-256-checked).

```sh
cp -R templates/listing ~/props-store/my-pack            # start a listing folder
node scripts/check-listing.mjs ~/props-store/my-pack     # validate it like the store does
node scripts/check-listing.mjs ~/props-store/my-pack --update   # a new version (changelog required)
node scripts/render-seeds.mjs ~/props-store/my-pack --sheet     # seed renders + gallery/preview2.webp
node scripts/pack-listing.mjs ~/props-store/my-pack      # check, then write ~/props-store/my-pack.rar
```

`check-listing.mjs` and `pack-listing.mjs` exit with 1 when the store would reject the package.

## Keeping it in sync

The rules in `scripts/lib/store.mjs` and `references/` mirror iprop-store
(github.com/jCzachor6/iprop-store): `asset/validation/RarPackageValidator.java` (package rules),
`asset/validation/CompileMain.java` (compilation), `asset/ListingCategories.java` (categories),
`asset/compiler/CompilerRuntimeManager.java` (SDK download) and `app.assets` / `app.compiler` in
`src/main/resources/application.yml` (limits, released compiler versions). Update them together when the
store changes.
