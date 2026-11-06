# P02 — Public Help Center Content Package

This directory is a **documentation-preparation artifact**, not a request to implement the site. It contains 20 editorially approved Markdown articles, an article manifest, implementation requirements, and an editorial provenance report.

## Editorial provenance — important

The project conversation confirms approval of all 20 article topics and final change instructions. However, only the **six newest full text drafts** were available for verbatim recovery when producing this package. They are marked `verbatim_chat_draft_with_approved_changes` in `article-manifest.json`: CD-01, CD-02, CD-03, TR-01, TR-02, TR-03. CD-01 includes the explicitly approved 5 MiB wording change.

The **14 earlier full article drafts could not be retrieved verbatim**. They were reconstructed from the agreed article topics and current repository audit facts, then **explicitly approved by the owner as replacement text** on November 5, 2026. They are marked `owner_accepted_reconstruction` in the manifest; this does not mean verbatim historical recovery.

## Implementation remains separately gated

- All 20 articles have editorial approval; no application implementation, merge or deployment has been authorized.
- A final runtime QA pass is recommended for password-change logout and exact error/UI strings before public release.
- No UI framework, routing, or content pipeline has been selected yet.

## Files

- `article-manifest.json`: canonical inventory/order/IDs/paths/related article IDs/provenance.
- `articles/`: 20 complete Markdown draft articles (seven topic directories).
- `implementation-spec.md`: implementation brief for later planning (not authorization to code).
- `editorial-review.md`: outstanding review checklist and technical caveats.

## GitHub handoff (later)

Commit this directory in a documentation-only PR, then give Claude Code Cloud a prompt to inspect `AGENTS.md`, `CLAUDE.md`, this README, the manifest and implementation spec, proposing a plan before code changes.
