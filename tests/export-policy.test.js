import test from 'node:test';
import assert from 'node:assert/strict';
import { excludedPack, DEFAULT_EXCLUSIONS } from '../scripts/export-policy.js';
import { exportDocumentImages } from '../scripts/document-images.js';

test('every requested compendium group is excluded, including nested folder contents', () => {
    for (const title of DEFAULT_EXCLUSIONS.split('\n')) {
        assert.equal(excludedPack({title}), true, title);
        assert.equal(excludedPack({title: 'Nested pack', folder: {name: 'Subfolder', folder: {name: title}}}), true, title);
    }
    for (const title of ['Bestiaries', 'Character Building', 'Effects', 'Journals', 'Homebrew']) {
        assert.equal(excludedPack({title}), false, title);
    }
});

test('exclusions support exact package IDs and user overrides without substring matches', () => {
    assert.equal(excludedPack({title: 'Tools', metadata: {packageName: 'pf2e-workbench'}}, 'pf2e-workbench'), true);
    assert.equal(excludedPack({title: 'Macros'}, ''), false);
    assert.equal(excludedPack({title: 'Macros for kept adventure'}), false);
    assert.equal(excludedPack({title: '  PSFX '}), true);
});

test('portrait-only default never queues separate token artwork or links to it', () => {
    const queued = [];
    const portrait = 'modules/pf2e-tokens-bestiaries/portraits/humanoid/aasimar-redeemer.webp';
    const token = 'modules/pf2e-tokens-bestiaries/tokens/aasimar-redeemer.webp';
    const link = exportDocumentImages({img: portrait, prototypeToken: {texture: {src: token}}}, true,
        path => {queued.push(path); return path;});
    assert.deepEqual(queued, [portrait]);
    assert.equal(link, portrait);
});
