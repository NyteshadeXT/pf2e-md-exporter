import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFormula, orderedSounds } from '../scripts/export-utils.js';
import { myRenderTemplate, clearTemplateCache } from '../scripts/render-template.js';
import { build } from '../tools/package.mjs';
import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('PF2e damage and inline roll conversion keeps nested and multiple dice intact', async () => {
    globalThis.window = {}; // No DOM conversion is used by tag conversion.
    globalThis.Hooks = { on() {} };
    const { convertPF2ETags } = await import('../scripts/export-markdown.js');
    assert.equal(convertPF2ETags({ level: 4 }, '@Damage[(ceil(@item.level/2))d6[fire]]'), '(ceil(4/2))d6 fire');
    assert.equal(convertPF2ETags({}, '@Damage[2d6+1d4[cold]]'), '2d6+1d4 cold');
    assert.equal(convertPF2ETags({}, '[[/r 1d4 #minutes]]'), '1d4');
});

test('damage formulas preserve dice, unresolved references, and malformed source', () => {
    globalThis.Roll = { safeEval: value => {
        if (value === '2+3') return 5;
        throw new Error('unsupported expression');
    }};
    assert.equal(formatFormula({}, '2+3'), 5);
    for (const formula of ['2d6+1d4', '(ceil(4/2))d6', '@actor.abilities.dex.mod', '(2d6+', 'floor(']) {
        assert.equal(formatFormula({}, formula), formula);
    }
    assert.equal(formatFormula({ level: 4 }, '(@item.rank+1)d10[vitality]'), '(4+1)d10[vitality]');
    assert.equal(formatFormula({}, '1d4 #minutes'), '1d4');
    assert.equal(formatFormula({}, '@item.level'), '@item.level');
});

test('playlist uses public playbackOrder and skips missing sounds', () => {
    const sounds = new Map([['a', { name: 'A' }], ['b', { name: 'B' }]]);
    const playlist = { sounds, playbackOrder: ['b', 'missing', 'a'], get _playbackOrder() { throw Error('private'); } };
    assert.deepEqual(orderedSounds(playlist).map(s => s.name), ['B', 'A']);
    // Foundry Collections iterate values, unlike a native Map.
    assert.deepEqual(orderedSounds({ sounds: [sounds.get('a')], playbackOrder: [] }), [{ name: 'A' }]);
});

test('template fetch failures are explicit and can be retried', async () => {
    const original = globalThis.fetch;
    globalThis.Handlebars = { compile: text => () => text };
    try {
        clearTemplateCache();
        globalThis.fetch = async () => ({ ok: false, status: 404 });
        await assert.rejects(myRenderTemplate('missing.hbs', {}), /404/);
        globalThis.fetch = async () => ({ ok: true, text: async () => 'rendered' });
        assert.equal(await myRenderTemplate('missing.hbs', {}), 'rendered');
    } finally { globalThis.fetch = original; }
});

test('release archive has matching manifest, templates, libraries and no development files', async () => {
    const output = await mkdtemp(join(tmpdir(), 'pf2e-package-'));
    await build('v0.10.10-test', 'NyteshadeXT/pf2e-md-exporter', output);
    const zip = await globalThis.JSZip.loadAsync(await readFile(`${output}/module.zip`));
    const manifest = JSON.parse(await zip.file('module.json').async('string'));
    assert.deepEqual(manifest, JSON.parse(await readFile(`${output}/module.json`, 'utf8')));
    assert.ok(manifest.download.endsWith('/v0.10.10-test/module.zip'));
    assert.ok(!JSON.stringify(manifest).includes('#{'));
    for (const path of [...manifest.esmodules, ...manifest.scripts, ...manifest.styles,
        'handlebars/hazard_handlebar.hbs', 'scripts/lib/js-yaml.min.js', 'pf2e-spell.css']) assert.ok(zip.file(path), path);
    assert.ok(!Object.keys(zip.files).some(p => /^(tests|tools|\.git)/.test(p)));
});
