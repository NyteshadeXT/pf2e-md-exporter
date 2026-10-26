Title: Fix exporter crashes and prepare Foundry 14 / PF2e 8 compatibility

The supplied Foundry console log shows formula parsing failures, null numeric
formatting in hazard exports, and a playlist export crash. This patch preserves
complex dice formulas without truncating nested parentheses, skips absent hazard
statistics while keeping zero saves, and uses Playlist.playbackOrder.

It also reports template HTTP errors explicitly, allows Foundry 14 in the manifest,
fixes the boolean library field and fork installation URL, and adds tested release
packaging plus PR checks and downloadable preview artifacts.

Target versions researched: Foundry 14.369 and PF2e 8.6.1. Fork and upstream main
matched at d6b0623. Manifest verified fields remain unset pending live acceptance.

Validation performed locally:
- `node --test`: 5 passing tests, including actual PF2e tag conversion and ZIP inspection.
- JavaScript syntax checks for scripts, tools, and tests: passed.
- `node tools/package.mjs v0.10.10-preview`: passed.
- `git diff --check`: passed.

Not yet performed:
- GitHub Actions execution (branch publication currently blocked by GitHub credentials).
- Live Foundry/Forge installation or gameplay tests.
- More Handlebars Helpers runtime compatibility and Obsidian rendering checks.

See VALIDATION.md for source references, log findings, packaging details, and the
manual Forge acceptance checklist. In particular verify context/sidebar controls,
hazards, Vital Beacon, embedded journals, playlists, links, and Forge-hosted images.
Dice expressions remain readable formulas; they are not rolled. Existing export
conventions for actor level and item badge defaults remain in place.

Keep this PR in draft until manual acceptance. Do not merge or publish a release yet.
