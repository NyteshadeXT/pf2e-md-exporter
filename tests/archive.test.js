import test from 'node:test';
import assert from 'node:assert/strict';
import '../scripts/lib/jszip.min.js';
import { createArchiveBlob } from '../scripts/archive.js';

test('browser download ZIP round trips text, binary files, empty folders, and async assets', async () => {
    const zip = new globalThis.JSZip();
    zip.file('Journal/Note.md', '## Exported journal\n'.repeat(10000));
    zip.file('assets/token.bin', Promise.resolve(new Uint8Array([0, 255, 128, 42])));
    zip.folder('empty');
    // Reproduce a broken JSZip Blob conversion path: this must never be called.
    zip.generateAsync = () => { throw Error("Bug : can't construct the Blob."); };
    let progress = 0;
    const blob = await createArchiveBlob(zip, () => progress++);
    assert.equal(blob.type, 'application/zip');
    assert.ok(progress > 0);
    assert.ok(blob.size < 10000, 'text should be compressed');
    const loaded = await globalThis.JSZip.loadAsync(await blob.arrayBuffer());
    assert.equal(await loaded.file('Journal/Note.md').async('string'), '## Exported journal\n'.repeat(10000));
    assert.deepEqual(await loaded.file('assets/token.bin').async('uint8array'), new Uint8Array([0, 255, 128, 42]));
    assert.ok(loaded.files['empty/'].dir);
});

test('ZIP input rejection reaches the caller', async () => {
    const zip = new globalThis.JSZip();
    zip.file('bad-image', Promise.reject(Error('Asset fetch failed')));
    await assert.rejects(createArchiveBlob(zip), /Asset fetch failed/);
});

test('browser Blob failure retains the cause and suggests a smaller export', async () => {
    const OriginalBlob = globalThis.Blob;
    globalThis.Blob = class { constructor() { throw Error('Browser allocation limit'); } };
    try {
        const zip = new globalThis.JSZip();
        zip.file('note.md', 'text');
        await assert.rejects(createArchiveBlob(zip), error => {
            assert.match(error.message, /smaller folder or compendium/);
            assert.equal(error.cause.message, 'Browser allocation limit');
            return true;
        });
    } finally { globalThis.Blob = OriginalBlob; }
});
