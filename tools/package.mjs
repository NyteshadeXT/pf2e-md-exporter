import { readFile, readdir, mkdir, writeFile, access } from 'node:fs/promises';
import '../scripts/lib/jszip.min.js';

export async function build(version, repository = 'NyteshadeXT/pf2e-md-exporter', output = 'dist') {
    const tag = version;
    version = version?.replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version ?? '')) throw Error('Supply a semantic version');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repository)) throw Error('Invalid repository');
    const manifest = JSON.parse(await readFile('module.json', 'utf8'));
    Object.assign(manifest, {
        version, url: `https://github.com/${repository}`,
        manifest: `https://github.com/${repository}/releases/latest/download/module.json`,
        download: `https://github.com/${repository}/releases/download/${tag}/module.zip`
    });
    for (const path of [...manifest.esmodules, ...manifest.scripts, ...manifest.styles,
        ...manifest.languages.map(l => l.path), manifest.license, manifest.readme]) await access(path);
    if (typeof manifest.library !== 'boolean') throw Error('library must be boolean');
    const zip = new globalThis.JSZip();
    const manifestText = JSON.stringify(manifest, null, 2) + '\n';
    zip.file('module.json', manifestText);
    async function add(path) {
        const entries = await readdir(path, { withFileTypes: true });
        for (const entry of entries) {
            const child = `${path}/${entry.name}`;
            if (entry.isDirectory()) await add(child);
            else zip.file(child, await readFile(child));
        }
    }
    for (const path of ['scripts', 'styles', 'handlebars', 'languages', 'Screenshots']) await add(path);
    for (const path of ['README.md', 'LICENSE', 'pf2e-spell.css']) zip.file(path, await readFile(path));
    await mkdir(output, { recursive: true });
    await writeFile(`${output}/module.json`, manifestText);
    await writeFile(`${output}/module.zip`, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
    return manifest;
}

if (process.argv[1]?.endsWith('package.mjs')) {
    await build(process.argv[2], process.env.GITHUB_REPOSITORY);
}
