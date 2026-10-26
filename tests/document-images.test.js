import test from 'node:test';
import assert from 'node:assert/strict';
import '../scripts/lib/jszip.min.js';
import { exportDocumentImages, imageArchivePath } from '../scripts/document-images.js';
import { AssetDownloads } from '../scripts/assets.js';
import { createArchiveBlob } from '../scripts/archive.js';

test('registered PF2e module art overrides stale compendium placeholder images', () => {
    const queued = [];
    const portrait = 'modules/pf2e-tokens-bestiaries/portraits/humanoid/aasimar-redeemer.webp';
    const token = 'modules/pf2e-tokens-bestiaries/tokens/aasimar-redeemer.webp';
    const result = exportDocumentImages({img: 'systems/pf2e/icons/default-icons/npc.svg'}, true,
        path => {queued.push(path); return imageArchivePath(path);}, () => {},
        {img: portrait, prototypeToken: {texture: {src: token}}});
    assert.deepEqual(queued, [portrait, token]);
    assert.equal(result, token);
});

test('remote image paths extract on Windows and preserve local icon directories', () => {
    assert.equal(imageArchivePath('https://assets.forge-vtt.com/user/modules/art/icons/aasimar%20redeemer.webp'),
        'remote/assets.forge-vtt.com/user/modules/art/icons/aasimar redeemer.webp');
    assert.equal(imageArchivePath('icons/creatures/aasimar.webp'), 'icons/creatures/aasimar.webp');
});

test('creature portrait and separate token bytes are included even under system and module icons paths', async () => {
    const portrait = 'systems/pf2e/icons/default-icons/npc.svg';
    const token = 'https://assets.forge-vtt.com/674de15e022920851cba797f/modules/pf2e-tokens-bestiaries/portraits/humanoid/aasimar-redeemer.webp';
    const bytes = new Map([[portrait, new Uint8Array([1, 2])], [token, new Uint8Array([3, 4])]]);
    const assets = new AssetDownloads({fetcher: async url => ({ok: true, arrayBuffer: async () => bytes.get(url).buffer})});
    const zip = new globalThis.JSZip();
    const selected = exportDocumentImages({img: portrait, prototypeToken: {texture: {src: token}}}, true, path => {
        zip.folder('zz_asset-files').file(imageArchivePath(path), assets.get(path), {binary: true});
        return `[[${imageArchivePath(path)}]]`;
    });
    assert.equal(selected, `[[${imageArchivePath(token)}]]`);
    await assets.finish();
    const loaded = await globalThis.JSZip.loadAsync(await (await createArchiveBlob(zip)).arrayBuffer());
    for (const [path, expected] of bytes) {
        assert.deepEqual(await loaded.file(`zz_asset-files/${imageArchivePath(path)}`).async('uint8array'), expected);
    }
    assert.deepEqual(assets.failures, []);
});

test('disabled images do not download and identical portrait/token paths are queued once', () => {
    let calls = 0;
    const add = path => {calls++; return path;};
    const doc = {img: 'modules/art/icons/creature.webp', prototypeToken: {texture: {src: 'modules/art/icons/creature.webp'}}};
    assert.equal(exportDocumentImages(doc, false, add), undefined);
    assert.equal(calls, 0);
    assert.equal(exportDocumentImages(doc, true, add), doc.img);
    assert.equal(calls, 1);
});

test('portrait is used for generic or wildcard tokens and wildcard skips are explicit', () => {
    const queued = [], warnings = [];
    const add = path => {queued.push(path); return path;};
    const doc = {img: 'modules/art/aasimar.webp', prototypeToken: {texture: {src: 'icons/svg/mystery-man.svg'}}};
    assert.equal(exportDocumentImages(doc, true, add), doc.img);
    doc.prototypeToken.texture.src = 'modules/art/aasimar-*.webp';
    assert.equal(exportDocumentImages(doc, true, add, message => warnings.push(message)), doc.img);
    assert.equal(warnings.length, 1);
    assert.ok(!queued.includes(doc.prototypeToken.texture.src));
    assert.equal(exportDocumentImages({}, true, add), undefined);
});
