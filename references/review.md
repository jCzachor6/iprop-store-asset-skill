# Rights, content rules and review

## The rights checkbox

Every new listing and version requires ticking:

> I own or am licensed to all rights in these source files, README and preview images, selling them here
> does not infringe anyone else's rights, and I grant the store the license described in the Creator Terms
> to store, compile, render previews of, display and sell them.

It is stored as a consent receipt per release. Do not tick it for anything you cannot vouch for: fonts,
textures, palettes or reference art copied from others, or AI output whose tool terms forbid resale.

## What buyers get (Terms of Service §10, Commercial license)

Perpetual, worldwide, non-exclusive use in any number of their own projects (commercial included). They
may modify the sources and ship generated images and compiled `.iprop` files inside their products. They
may **not** resell or publish the sources or binaries on their own, or as part of another asset pack,
generator or template. Write the README so it fits this license: no extra license text, no conflicting
"free to redistribute" lines.

## Creator Terms rules reviewers enforce

- Accurate description: contents, what it generates, runtime version and limits.
- Preview images must be renders of the pack. An illustration (for example the cover) must be labelled as
  such, for example in the README's Previews section.
- Price in EUR, VAT included.
- Not allowed: infringing content or close imitations of other creators' work, unlawful, hateful or sexual
  content, content harmful to minors, malicious files, misleading listings or catalogue manipulation.
- Published versions are immutable. Fixes go out as new versions.

## Review flow

1. **Submit for review** in the creator panel → the listing shows **In review**.
2. Admin opens https://admin.iprop.store → **Products** → the listing. The **Infinite Props release
   review** widget at the bottom shows the files, the seed previews and the release notes.
   - **Approve vX.Y.Z** publishes it (or the update).
   - **Reject release** needs a note of at least 5 characters, which the creator sees next to the listing.
     Fix the problem and submit a **higher** version; a rejected label cannot be reused.
3. Approved listings appear in the catalog newest-first. **Unlist** hides a listing but keeps buyers'
   downloads. **Resubmit for review** puts it back after another approval.

## Reviewer checklist

- [ ] Title, description and category match what the sources generate.
- [ ] Cover reads at thumbnail size; illustration labelled in the README if not a render.
- [ ] `preview1`-`preview3` are real renders; sizes in labels are true.
- [ ] Seed previews cover every entry, none empty or near-duplicate.
- [ ] README explains entries, canvas, inputs, outputs and usage; no images, no conflicting license.
- [ ] No third-party trademarks, logos, characters or copied art.
- [ ] Price sensible for the content; VAT is included in it.
- [ ] Version and changelog make sense for an update.
