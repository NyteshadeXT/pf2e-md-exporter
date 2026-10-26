/** Stream ZIP output into Blob parts rather than allocating one giant output buffer.
 * JSZip's blob output concatenates the whole archive before constructing a Blob
 * and hides the browser's original error behind a generic BlobBuilder error.
 */
export function createArchiveBlob(zip, onProgress = () => {}) {
    return new Promise((resolve, reject) => {
        const parts = [];
        zip.generateInternalStream({
            type: 'uint8array',
            streamFiles: true,
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        }).on('data', (chunk, metadata) => {
            parts.push(chunk);
            onProgress(metadata);
        }).on('error', error => {
            parts.length = 0;
            reject(error);
        }).on('end', () => {
            try {
                resolve(new Blob(parts, { type: 'application/zip' }));
            } catch (error) {
                reject(new Error(`Unable to create ZIP download: ${error.message}. Try exporting a smaller folder or compendium.`, { cause: error }));
            } finally {
                parts.length = 0;
            }
        }).resume();
    });
}
