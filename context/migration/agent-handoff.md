# Agent handoff

- Current/incoming agent: OpenAI Codex, M04, 2026-11-01.
- Last completed agent: Google Antigravity, S02 and M03. Historical reports preserved.
- Active milestone: M04 — Theme, shared UI and app shell. READY implementation plan approved by the human with explicit conditions; branch creation and implementation authorized.
- Current branch: `feature/react-app-shell`, created from clean `main` at `9e297f8b034575785cd4d6323464d34e6e8c8058`. Local and live remote main verified synchronized before branching.
- Completed/merged: M01 `19f3053`; S01 `39ceddf`, `6fd6f47`; M02 `3b2b718`; S02 `cb74890`, `6e0ba0d`; M03 `eb7948b`, `9e297f8`.
- Active step: M04 implemented and verified; human approved implementation/results and two commits after final scope/evidence checks. React source commit: `9440d2160f74b43314dfa9519179290d709254dd`; this documentation commit records the handoff. Final checks: typecheck/lint/build exit 0; npm run test and test -- --run: 32/32; E2E full: 34/34 including 8 visual comparisons; production audit 0 findings; full audit exit 1 with 16 deferred dev-tree findings. Opposite-OS theme/nested focused browser follow-up: 3/3. Evidence in `verification/m04-report.md`.
- Scope: shared theme/UI/shell, labelled canonical placeholders, development-only generic UI preview. No API client/auth guards/business data. Root M03 smoke view/tests preserved. Report placeholder is outside shell.
- Breakpoint: approved correction — mobile ≤768 px, desktop >768 px; global Tailwind md unchanged. Sidebar 272/88 px, header/controls in sidebar, account menu in footer; main scrolls independently.
- Theme: single `uptrack-theme`, inline pre-paint script; stylesheet enters from index.html so CSS is available before React. No Flowbite mode hook or second theme storage key.
- Dependencies: no installs or manifest/lockfile changes; Zod 4 and Flowbite deepmerge-ts 8.0.2 override retained. M03 historical dev audit: 16 (14 moderate/2 critical). Current audit findings must remain in M04 report.
- **Mandatory before M06 forms:** verify valid/invalid async RHF resolver behavior with Zod 4. Installed @hookform/resolvers 3.10.0 rejects invalid Zod 4.6.7 input with ZodError, rather than returning field errors (expects errors; error has issues). Reproduction in M04 report. Any dependency change needs separate approval. No custom resolver workaround was added.
- Version inventory: committed lockfile is authoritative; some M03 report versions differ. Do not rewrite that historical report.
- Known historical limitation: successful Cloudinary upload remains NOT RUN; M04 does not require the backend or test accounts.
- Hosted backend remains suspended: no contact, restart, deployment or probes authorized.
- Environment: local servers launched only for verification and stopped afterward; retained isolated DB/role unchanged. Backend needs JDK 21 if a later milestone runs it. Angular has no lint/e2e scripts; React does have both.
- Two specified commits authorized after final scope/evidence checks. Any additional commit, push, merge, branch deletion, deployment, backend contact or dependency change needs separate authorization. No push or merge performed; no M05 work started.
- Next action: stop after the two approved commits and report exact hashes/clean tree. Await separate authorization before push or merge; do not advance to M05 until merge/tracker gates are satisfied.
