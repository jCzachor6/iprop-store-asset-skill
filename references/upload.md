# Uploading to iprop.store

## Before the first upload

Sign in at https://iprop.store with Google and open the **Creator panel** (`/creator`). Uploading needs an
ACTIVE creator: save the **Business details** (legal name, business type, country, public registration
number), then **Connect Stripe** and finish onboarding until the status is ACTIVE.

## First release

1. `node scripts/pack-listing.mjs my-pack` → `my-pack.rar` (RAR4, only the files that ship).
2. **Creator panel → Assets** (`/creator/assets`): pick `my-pack.rar`, **Upload and validate**. The server
   validates and compiles in a worker; this takes a few seconds. You get either "Package '…' uploaded and
   validated." or "Package rejected: CODE: details" (table below).
3. Open the package to see its files, the compiled `.iprop` files, the entries and the warnings.
4. **Submissions → New** (`/creator/submissions/new`), choose the package. Title, description and category
   are pre-filled from `listing.json`; check them, set **Price (USD cents)** (`1200` = $12.00, `0` = free)
   and the **Changelog**, then **Create draft**.
5. **Submit for review.** The submission waits in the moderation queue.
6. An admin reviews it in **Admin → Moderation** (`/admin/moderation`): the package files, compiled
   binaries, compiler version and SHA-256. **Approve** publishes it as `v1`; **Request changes** or
   **Reject** need a reason. The creator gets an e-mail either way.
7. After **Request changes**: upload a fixed package, **Revise** the submission (pick the new package) and
   submit again. Each submission keeps its attempt history.
8. Check the live page from the catalog (`/catalog`) and add tags in **Products → Tags**.

## New version

Pack and upload the **complete** new package (all sources, README, gallery, selection). In **Products**
choose **New version** on the asset, pick the package, write a changelog (5-4000 characters) and submit.
It is reviewed like the first release. After approval it becomes `v2`, `v3`, …; owners get an e-mail and
the new version appears in their library. Published versions never change.

## Rejections on upload

| Message | Fix |
|---|---|
| `NOT_RAR: only .rar archives are accepted` / `signature check failed` | Pack with `pack-listing.mjs`; ZIP and renamed files are refused. |
| `CORRUPT: archive cannot be read (UnsupportedRarV5Exception)` | The archive is RAR5 (WinRAR/`rar` default). Pack with `pack-listing.mjs` (RAR4). |
| `MISSING_LISTING` / `TITLE` / `CATEGORY` / `TYPE` | Fix `listing.json` (`references/fields.md`). |
| `COMPILER_VERSION` / `COMPILER_UNAVAILABLE` | Add `compiler_version` with a released version (0.7.1 …). For 0.8.0, wait until its GitHub release is published. |
| `MATERIALS` / `UNUSED_MATERIAL` | Materials need `compiler_version` 0.8.0+; import every material library from an asset (`references/sources.md`). |
| `MISSING_IPS` / `UNRESOLVED_IMPORT` / `TYPE_MISMATCH` | Fix `sources/` (`references/sources.md`). |
| `IPROP_UPLOADED` | Remove `.iprop` files; the server compiles. |
| `COMPILATION_FAILED: … ipc exited 1: …` | Fix the reported file and line; `check-listing.mjs` shows the same message. |
| `BAD_NAME` / `TOO_DEEP` / `DUPLICATE_PATH` | Rename: no spaces, ≤ 8 folders deep, unique ignoring case. |
| `LIMIT_UNPACKED` / `TOO_MANY_FILES` | Stay within 5 MiB unpacked and 200 files; shrink the gallery first. |
| `GALLERY` / `GALLERY_TOO_LARGE` | Exact size and format per slot, ≤ 3 MiB (`references/gallery.md`). |
| `SELECTION` | Fix `preview-selection.json`: 1-15 unique entry/seed pairs. |
| `Only an ACTIVE creator may upload asset packages` | Finish business details and Stripe onboarding. |
| `Too many requests. Try again in a minute.` (HTTP 429) | Uploads and submission actions share a limit of 10 per minute; wait a minute. |
