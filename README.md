# iprop-store-asset

A Claude Code skill for preparing Infinite Props assets and packs for sale on
[iprop.store](https://iprop.store): every listing field, the `.ips` source layout, the README, the four
gallery images, the seed previews, rights and review. It includes two scripts that apply the store's
exact upload rules locally.

## Install

```sh
git clone https://github.com/jCzachor6/iprop-store-asset-skill.git ~/.claude/skills/iprop-store-asset
```

Claude Code picks it up when you ask to list, upload or update an asset on the store, or to make its
previews. Read `SKILL.md` for the workflow.

## Scripts

Both need Node 20+ and a mercur checkout for `sharp` and the Infinite Props runtime
(`MERCUR_DIR`, default `~/Desktop/quants-space/mercur`, with `packages/iprop` built).

```sh
cp -R templates/listing ~/props-store/my-pack        # start a listing folder
node scripts/check-listing.mjs ~/props-store/my-pack # validate it like the store does
node scripts/check-listing.mjs ~/props-store/my-pack --update   # a new version
node scripts/render-gallery.mjs ~/props-store/my-pack           # preview2.webp + preview3.gif from real seeds
```

`check-listing.mjs` exits with 1 when the store would reject the upload.

## Keeping it in sync

The limits in `scripts/lib/store.mjs` and `references/` mirror mercur's
`apps/api/src/api/vendor/iprop-packs/validators.ts` and `apps/api/src/lib/iprop/{pack,media,worker}.ts`,
the vendor form in `apps/vendor/src/routes/infinite-props/` and the categories in
`apps/api/src/scripts/lib/iprop-catalog.ts`. Update them together when the store changes.
