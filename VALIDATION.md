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

## Follow-up log: ZIP download failure

The updated log from `Downloads/download.devtools` reaches ZIP creation and ends
with JSZip's `Bug : can't construct the Blob.` The exact browser allocation error
is hidden by JSZip's obsolete BlobBuilder fallback. Large archives are a plausible
trigger, but the log does not prove the underlying cause.

ZIP downloads now use compressed, streaming Uint8Array chunks as Blob parts,
avoiding JSZip's single concatenated output buffer and its Blob conversion path.
Regression tests unpack the resulting Blob, verify binary and asynchronous inputs,
and exercise stream errors, browser Blob failure, progress cleanup, overlap prevention,
and successful retry. Actual browser memory limits still apply to large exports.
The exporter now shows failure details and clears its progress notice on failure.

The accompanying browser Issues screenshot reports a PF2e stylesheet @property
warning, form accessibility warnings and browser history behavior. These are not
the fatal ZIP exception. Other log messages about unresolved links or tags in macro
source do not establish that ZIP generation failed.

Retest using the newest PR Actions artifact, not the earlier preview ZIP or the
latest stable manifest (the PR has not been released). Start with one compendium,
then repeat the export that failed. Record whether a ZIP is downloaded, opens and
contains the expected documents and assets. If browser allocation still fails,
export smaller folders/compendiums and capture the new, original error details.

## Follow-up log: export remains running without output

The next log contains neither the Blob exception nor a final export failure.
It ends with unresolved tags from macro source, without evidence that a download
was requested. The precise blocking stage cannot be inferred from that capture.

Exports now report compendium loading, document conversion, completed/total asset
downloads, ZIP entry count and compression percentage, and download size to both
the progress notification and console. Asset downloads use a six-request queue,
deduplicate repeated URLs, and time out after 60 seconds including response-body
reads. Missing assets are listed in export-warnings.json inside the archive, with
a visible warning. Compendium reads time out after two minutes with the pack name.
ZIP streams with no output for two minutes fail visibly. Download links are attached
to the page, and Blob URLs are retained for 60 seconds to allow browser consumption.

Retest a single compendium first, then the previous selection. If output is still
absent, capture the last `pf2e-md-exporter |` progress message and check the browser's
Downloads panel for a blocked download. These changes address unbounded asset waits
and expose the blocking stage; they do not establish the cause of the captured stall
or prove live Forge completion.

## User-reported successful export and asset regression

The user reports a successful ZIP download and a quick Markdown spot check with
the files looking as expected. This is user-performed Forge validation, not an
agent-operated live test; it does not establish full content or image correctness.
The supplied export-warnings.json contains 409 failures, all reporting
`Failed to execute 'fetch' on 'Window': Illegal invocation`.

The asset queue stored the native fetch function and invoked it as a queue method,
changing its receiver from Window to the queue. The default fetch callback now
invokes globalThis.fetch on its owning global. A regression test requires that
receiver and verifies downloaded bytes, covering the browser behavior missed by
the earlier injected-fetch tests. Retest image inclusion with the next artifact;
the previous successful archive contains placeholders for these failed assets.

## Creature artwork inclusion

The user supplied a successful HTTP 200 request for Aasimar Redeemer artwork under
the Forge-hosted `modules/pf2e-tokens-bestiaries/portraits/humanoid/aasimar-redeemer.webp`
path. That confirms artwork is available in the user's session; it does not prove
that a bulk-compendium document exposes the same image or that export fetch succeeds.

With Export custom images enabled, the exporter now queues both doc.img and
prototypeToken.texture.src, deduplicates identical paths, and prefers concrete token
artwork in statblocks, falling back to the portrait for placeholder/wildcard tokens.
The broad systems/ and icons/ path exclusions have been removed. System placeholders
can now be included too. Wildcards produce an explicit warning rather than requesting
a literal asterisk path. Existing setting values remain in effect; enable it for retesting.

Remote files now use extractable `zz_asset-files/remote/<host>/<path>` names and
matching Markdown links, avoiding the old https: directory and doubled slash path.
Tests download mocked bytes for system portrait and Forge token URLs, unpack the ZIP,
and verify both files, selected token links, setting-off behavior, duplicate suppression,
placeholder fallback and wildcard warnings. Real Forge creature-image retesting remains
outstanding. Start with Aasimar Redeemer and verify the portrait/token files and the
statblock token link in the extracted archive.

The user subsequently reported aasimar-redeemer.webp still missing. PF2e 8.6.1
source (`src/module/actor/base.ts`, `_initializeSource`) normally merges the registered
`game.pf2e.system.moduleArt.map` entry when constructing compendium actors. Export now
also consults this map explicitly for compendium documents. A regression test covers
mapped artwork replacing a stale default portrait. This is a defensive correction,
not confirmation of the user's exact failure cause.

Every export now includes export-images.json, recording each templated document's UUID,
name, image setting, original portrait/token paths, registered module-art paths and
selected statblock link. For a missing image, supply this report and export-warnings.json
so we can distinguish disabled export, absent art mapping, fetch failure, and a creature
not included in the selection. Aasimar Redeemer's UUID is
Compendium.pf2e.pathfinder-bestiary.Actor.gDMPUL0UiOHrUUd3.

## User-confirmed creature images; reduced export scope

The user confirms creature-image export worked after enabling Export custom images.
They request portraits without separate token artwork and exclusion of these groups:
Active Tile Macros, JB2A Sequencer Macros, Macros, Michael Ghelfi Studios, PF2e Ranged
Combat, PF2e Summons Assistant Actors/Items, PF2e Utility Buttons, PF2e Workbench,
PSFX, Summons Assistant Macros and Tabletop RPG Music.

Include token images now defaults off and creature statblocks use portraits. The
new Excluded compendiums or folders setting defaults to the requested list and matches
exact titles, package/collection IDs and parent folder names, case-insensitively.
Excluded packs are skipped before getDocuments, conversion, and asset collection.
This removes those packs' exported content; references inside retained documents are
not rewritten or recursively pruned. Source art modules stay active and their portrait
maps can still supply retained creatures. Tests verify every requested group, nested
folders, preserved Bestiaries, portrait-only selection and no reads of excluded packs.
Manual verification of the smaller export is still outstanding.
