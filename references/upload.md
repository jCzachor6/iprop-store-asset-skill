# Uploading in the creator panel

1. Sign in at https://creators.iprop.store (the same email and password as the admin account work). Open
   **Infinite Props** in the sidebar.
2. **What are you selling?** Single asset or Pack. It changes to Pack on its own when the sources contain
   several entries.
3. **Sources**: add each top-level folder of `sources/` with **Add an asset or pack folder**, and loose
   files with the file picker. Wait for the **Compilation** panel: every file must show `compiled`, entries
   as `asset`, imports as `part`.
4. **Readme**: pick `README.md`.
5. **Gallery previews**: one file per slot. The panel rejects wrong sizes or formats immediately.
6. **Version** (1.0.0) and **Release notes**.
7. **Title** (replace the auto-filled one), **Description**, **Category**, **Commercial license (EUR)**.
8. **Seed previews**: enter the pairs from `preview-selection.json` in order, then **Render selected
   previews** and look at them.
9. Tick the rights checkbox and **Submit for review**.
10. Approve it in https://admin.iprop.store (Products → listing → Infinite Props release review → Approve).
    Check the live page at `https://iprop.store/products/<handle>`.

## New version

In the listing row click **New version**. Upload the **complete** source tree again, plus the README.
Leave the gallery slots empty to keep the current gallery; uploading any slot replaces the whole gallery, so
upload all four again. The selection is kept unless you change it. Set a higher version and a changelog
(≥ 5 characters), tick the rights box and submit. Title, description, category and price cannot change
there; ask the admin.

## Common rejections from the form

| Message | Fix |
|---|---|
| `'x' is not a valid .ips file name` | Rename folders and files: no spaces or dots in folder names. |
| `A pack must contain at least two assets` / `A single asset listing must contain exactly one asset` | Switch the type, or import or remove the extra entry. |
| `N of M files failed to compile` | Open the Compilation panel and fix the reported line. |
| `Seed N failed to render` | The entry traps on a smoke seed; fix the recipe for seeds 1-15. |
| `Asset canvas exceeds the preview limit` | Canvas ≤ 2048 px per side and ≤ 1 MP. |
| `'preview.webp' must be 720 × 480px static WebP` | Export at the exact size and format. |
| `Cannot decode 'preview3.gif' as a safe preview` | Too many frames (≤ 24 at 1440 × 960) or > 3 MiB after re-encoding. |
| `Use a version such as 1.0.0` / version not newer | Bump `major.minor.patch` above every earlier submission. |
| `Confirm that you have the rights to sell these files` | Tick the rights checkbox. |
