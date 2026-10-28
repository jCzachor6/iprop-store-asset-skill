# Rights, content rules and review

## Rights

Only sell what you can vouch for: your own sources, README and preview images, or material you are
licensed to resell. No fonts, textures, palettes or reference art copied from others, and no AI output whose
tool terms forbid resale. Anyone can report a listing or file an IP claim from its product page; a
confirmed infringement blocks the asset and its owners are notified.

## What buyers get (standard commercial license)

Use of the `.ips` sources and compiled `.iprop` files in any number of their own projects, commercial
included. They may **not** resell or publish the sources or binaries on their own or as part of another
asset pack. Write the README so it fits this license: no extra license text, no conflicting "free to
redistribute" lines.

## Rules reviewers enforce

- Accurate title, description and category: contents, what it generates, canvas size, compiler version.
- Preview images are renders of the package; an illustration (for example the cover) is labelled as such
  in the README.
- Not allowed: infringing content or close imitations of other creators' work, registered trademarks and
  logos, unlawful, hateful or sexual content, content harmful to minors, malicious files, misleading
  listings.
- Published versions are immutable. Fixes go out as new versions.

## Review flow

1. **Submit for review** in the creator panel → the submission is `PENDING_REVIEW`.
2. The admin opens https://iprop.store/admin/moderation → **Review**: proposed title, description,
   category and changelog, the current published version (for an update), the package files with the
   compiled binaries, the compiler version and SHA-256, and earlier attempts.
   - **Approve** publishes it as the next version (`v1` for a new asset).
   - **Request changes** (reason required) sends it back; the creator revises and submits again.
   - **Reject** (reason required) closes the submission.
   The creator gets an e-mail with the decision and the reason.
3. Approved assets appear in the catalog newest first. The creator can hide, unhide or change the price in
   **Products**; an admin can block an asset with a reason.

## Reviewer checklist

- [ ] Title, description and category match what the sources generate.
- [ ] `compiler_version` is right and every entry compiled.
- [ ] Cover reads at thumbnail size; illustration labelled in the README if not a render.
- [ ] `preview1`-`preview3` are real renders; sizes in labels are true.
- [ ] README explains entries, canvas, inputs, outputs and usage; no conflicting license.
- [ ] No third-party trademarks, logos, characters or copied art.
- [ ] Price sensible for the content (USD).
- [ ] Changelog makes sense for an update.
