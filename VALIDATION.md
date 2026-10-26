# Compatibility and Forge validation

Target as of 2026-10-26: Foundry **14.369**, PF2e **8.6.1**.
No live Foundry or Forge session has been tested. The manifest deliberately omits
`verified` until that testing is complete. Foundry 13 support remains declared,
but also needs a runtime regression check.

## Evidence

- [Foundry stable releases](https://foundryvtt.com/releases/): 14.369, October 8.
- [PF2e stable release](https://github.com/foundryvtt/pf2e/releases/tag/pf2e-8.6.1):
  checked source at `28d9d156f252d084371d994dc359509b49eadf18`.
- [Public playlist playbackOrder](https://foundryvtt.com/api/classes/foundry.documents.Playlist.html):
  replaces the private `_playbackOrder` field which crashes in the supplied log.
- [Document context hooks](https://foundryvtt.com/api/functions/hookEvents.getDocumentContextOptions.html):
  existing getActorContextOptions and related hooks remain documented in v14.
- PF2e `src/module/actor/hazard/document.ts` explicitly sets missing stealth
  value, DC and totalModifier to null. The hazard template now skips these values
  and retains zero-valued saves.
- Fork and upstream main both had commit
  `d6b0623ed1fb79ac9644f2e4d22b184faa8b6f0c` when inspected.

## Supplied download.devtools findings

The attachment was recovered through the referenced chat's local attachment path
(the original `/mnt/data` path is not present on this Windows host).

- Repeated null `numberFormat` warnings while rendering hazards.
- Formula parser exceptions in inline rolls and damage tags, including Spell
  Effect: Vital Beacon and embedded journal content. The old implementation split
  expressions at every letter d and stripped parentheses without checking nesting.
  Export now preserves dice expressions and unsupported arithmetic as readable
  text, substitutes the existing level conventions, and evaluates only supported
  deterministic expressions. It never rolls dice. Unknown references stay visible.
- Fatal playlist export: `playlist._playbackOrder is not iterable`.
- FilePicker warnings originate in Forge integration code; the loadTemplates
  warning is in another module's module.js. They are not exporter API calls.
  Other modules' warnings are outside this patch.

## Automated checks

With Node 22 or newer, run `node --test` (or `npm test`). No dependency installation
is needed. Tests use Foundry stubs, not a running Foundry server. They exercise the
real tag converter, formula handling, public playlist order, template fetch/retry,
and unpack the generated release ZIP to check runtime assets and matching manifests.

Build with `node tools/package.mjs v0.10.10-preview`. Output is `dist/module.json`
and `dist/module.zip`, with the manifest at the archive root. The release workflow
uses the actual repository and tag, runs tests before upload, and replaces all
source manifest placeholders. The PR workflow publishes preview artifacts.
Preview download URLs will not exist until matching release assets are published;
do not install the source module.json containing placeholders.

## Manual Forge acceptance checklist

1. Back up the world and use a separate test world. Record exact Foundry, PF2e,
   Forge integration, browser, and More Handlebars Helpers versions. Confirm the
   helper dependency can be installed and enabled on the target versions.
2. For a pre-release test, download the Actions artifact and import its module.zip
   through Forge's Import Wizard. For a published release, install through Bazaar's
   manifest URL option using
   `https://github.com/NyteshadeXT/pf2e-md-exporter/releases/latest/download/module.json`.
   Check that the installed version and fork download URL match the intended release.
   See [Forge import instructions](https://forums.forge-vtt.com/t/importing-worlds-modules-and-systems-to-the-forge/454).
3. Enable PF2E Exporter and More Handlebars Helpers. Leave Markdown Exporter disabled.
   Check startup and settings for exporter errors.
4. As GM, export individual actors/items, a world folder, a compendium folder,
   and a whole compendium using both context menus and sidebar buttons. As a player,
   confirm the export controls are unavailable.
5. Include NPC, simple/complex hazard with null stealth and a zero save, vehicle,
   army, loot, spell, weapon, feat, and effect. Compare numbers and descriptions to
   their sheets. Include Vital Beacon, nested formulas and multiple dice terms.
   Confirm no descriptions disappear and unresolved formulas remain readable.
6. Export journals containing @Embed, @UUID, tables and images. Check extracted
   Markdown links, folders, and YAML statblocks in Obsidian with the documented plugins.
7. Export empty and populated playlists (sequential, shuffled, simultaneous).
   Confirm no crash, expected sound order, and valid downloaded audio.
8. Test custom images from Forge Assets Library, ordinary module assets, and a
   protected or unavailable image. Check ZIP files and browser CORS/network errors.
   Asset fetch failures still produce empty blobs; verify important images explicitly.
9. Save the console output and results. Only after acceptance set manifest verified
   fields to the versions actually tested, then review/merge and publish a release.

Do not treat CI success or a valid ZIP as proof of live Forge compatibility.
