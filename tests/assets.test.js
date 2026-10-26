import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetDownloads, withTimeout } from '../scripts/assets.js';
import { createArchiveBlob } from '../scripts/archive.js';

test('asset queue limits concurrency, deduplicates URLs and preserves bytes', async () => {
    let active = 0, max = 0, calls = 0;
    const assets = new AssetDownloads({concurrency: 2, fetcher: async () => {
        calls++;
        max = Math.max(max, ++active);
        await new Promise(resolve => setTimeout(resolve, 5));
        active--;
        return {ok: true, arrayBuffer: async () => new Uint8Array([1, 255]).buffer};
    }});
    const a = assets.get('same');
    assert.equal(assets.get('same'), a);
    assets.get('second'); assets.get('third');
    await assets.finish();
    assert.equal(calls, 3);
    assert.equal(max, 2);
    assert.deepEqual(await a, new Uint8Array([1, 255]));
});

test('stalled headers and bodies time out, abort, and allow queued assets to finish', async () => {
    const signals = [];
    const assets = new AssetDownloads({concurrency: 1, timeoutMs: 10, fetcher: async (url, {signal}) => {
        signals.push(signal);
        if (url === 'headers') return new Promise(() => {});
        return {ok: true, arrayBuffer: () => new Promise(() => {})};
    }});
    assets.get('headers'); assets.get('body');
    await assets.finish();
    assert.equal(assets.failures.length, 2);
    assert.ok(signals.every(signal => signal.aborted));
    assert.ok(assets.failures.every(failure => failure.error.includes('timed out')));
});

test('HTTP failures are recorded and bounded compendium reads name the blocked operation', async () => {
    const assets = new AssetDownloads({fetcher: async () => ({ok: false, status: 403})});
    assert.equal((await assets.get('protected')).length, 0);
    assert.match(assets.failures[0].error, /403/);
    await assert.rejects(withTimeout(new Promise(() => {}), 'Loading compendium Example', 5), /compendium Example timed out/);
});

test('ZIP stream that never emits data fails visibly instead of waiting indefinitely', async () => {
    let paused = false;
    const stream = {on() {return this;}, resume() {}, pause() {paused = true;}};
    await assert.rejects(createArchiveBlob({generateInternalStream: () => stream}, () => {}, 5), /ZIP creation made no progress/);
    assert.equal(paused, true);
});
