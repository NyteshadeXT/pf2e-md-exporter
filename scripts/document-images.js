/** Queue portrait and concrete prototype-token images. Folder names are not
 * evidence that an image is a placeholder: custom modules also use icons/.
 * Return the token link used by the creature statblock, falling back to portrait.
 */
export function exportDocumentImages(doc, enabled, addImage, warn = console.warn, mappedArt) {
    if (!enabled) return undefined;
    const portraitSource = mappedArt?.img ?? doc.img;
    const tokenSource = mappedArt?.prototypeToken?.texture?.src ?? doc.prototypeToken?.texture?.src;
    const portrait = typeof portraitSource === 'string' ? portraitSource : '';
    const token = typeof tokenSource === 'string' ? tokenSource : '';
    const links = new Map();
    for (const path of new Set([portrait, token].filter(Boolean))) {
        if (path.includes('*')) {
            warn(`Wildcard image requires a concrete file and was skipped: ${path}`);
            continue;
        }
        links.set(path, addImage(path));
    }
    const placeholder = path => /(?:\/default-icons\/npc\.svg|(?:^|\/)icons\/svg\/mystery-man\.svg)(?:[?#].*)?$/.test(path);
    if (links.has(token) && !placeholder(token)) return links.get(token);
    return links.get(portrait) ?? links.get(token);
}

/** Keep download URLs separate from extractable filenames and Markdown links. */
export function imageArchivePath(source) {
    let path = source;
    if (/^https?:\/\//i.test(source)) {
        const url = new URL(source);
        path = `remote/${url.host}${url.pathname}`;
    }
    return path.split('/').filter(Boolean).map(part => {
        try { part = decodeURIComponent(part); } catch { /* Preserve malformed escapes. */ }
        return part === '.' || part === '..' ? '_' : part.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    }).join('/');
}
