/** Stream ZIP output into Blob parts rather than allocating one giant output buffer.
 * JSZip's blob output concatenates the whole archive before constructing a Blob
 * and hides the browser's original error behind a generic BlobBuilder error.
 */
export function createArchiveBlob(zip, onProgress = () => {}, idleTimeoutMs = 120000) {
    return new Promise((resolve, reject) => {
        const parts = [];
        let timer;
        let settled = false;
        const fail = error => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            parts.length = 0;
            reject(error);
        };
        const stream = zip.generateInternalStream({
            type: 'uint8array',
            streamFiles: true,
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }).on('data', (chunk, metadata) => {
            if (settled) return;
            resetTimer();
            parts.push(chunk);
            onProgress(metadata);
        }).on('error', error => {
            fail(error);
        }).on('end', () => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                resolve(new Blob(parts, { type: 'application/zip' }));
            } catch (error) {
                reject(new Error(`Unable to create ZIP download: ${error.message}. Try exporting a smaller folder or compendium.`, { cause: error }));
            } finally {
                parts.length = 0;
            }
        });
        function resetTimer() {
            clearTimeout(timer);
            timer = setTimeout(() => {
                stream.pause();
                fail(Error('ZIP creation made no progress for two minutes. Try exporting a smaller folder or compendium.'));
            }, idleTimeoutMs);
        }
        resetTimer();
        stream.resume();
    });
}
