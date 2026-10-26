/** Limit concurrent downloads, reuse repeated URLs, and bound both headers and body waits. */
export class AssetDownloads {
    constructor({ concurrency = 6, timeoutMs = 60000, fetcher = globalThis.fetch, onProgress = () => {} } = {}) {
        Object.assign(this, { concurrency, timeoutMs, fetcher, onProgress });
        this.cache = new Map();
        this.queue = [];
        this.active = 0;
        this.completed = 0;
        this.failures = [];
    }

    get(url) {
        if (!this.cache.has(url)) {
            const promise = new Promise(resolve => this.queue.push({ url, resolve }));
            this.cache.set(url, promise);
            this.pump();
        }
        return this.cache.get(url);
    }

    pump() {
        while (this.active < this.concurrency && this.queue.length) {
            const task = this.queue.shift();
            this.active++;
            this.download(task.url).then(task.resolve).finally(() => {
                this.active--;
                this.completed++;
                this.onProgress(this);
                this.pump();
            });
        }
    }

    async download(url) {
        const controller = new AbortController();
        let timer;
        try {
            return await Promise.race([
                (async () => {
                    const response = await this.fetcher(url, { signal: controller.signal });
                    if (!response.ok) throw Error(`HTTP ${response.status}`);
                    return new Uint8Array(await response.arrayBuffer());
                })(),
                new Promise((_, reject) => {
                    timer = setTimeout(() => {
                        reject(Error(`Download timed out after ${this.timeoutMs / 1000}s`));
                        controller.abort();
                    }, this.timeoutMs);
                })
            ]);
        } catch (error) {
            this.failures.push({ url, error: error.message });
            console.warn(`pf2e-md-exporter | Asset skipped: ${url}`, error.message);
            return new Uint8Array();
        } finally {
            clearTimeout(timer);
        }
    }

    async finish() {
        await Promise.all(this.cache.values());
    }
}

export async function withTimeout(promise, label, timeoutMs = 120000) {
    let timer;
    try {
        return await Promise.race([promise, new Promise((_, reject) => {
            timer = setTimeout(() => reject(Error(`${label} timed out after ${timeoutMs / 1000}s`)), timeoutMs);
        })]);
    } finally { clearTimeout(timer); }
}
