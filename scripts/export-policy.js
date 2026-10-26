export const DEFAULT_EXCLUSIONS = [
    'Active Tile Macros', 'JB2A Sequencer Macros', 'Macros', 'Michael Ghelfi Studios',
    'PF2e Ranged Combat', 'PF2e Summons Assistant Actors', 'PF2e Summons Assistant Items',
    'PF2e Utility Buttons', 'PF2e Workbench', 'PSFX', 'Summons Assistant Macros',
    'Tabletop RPG Music'
].join('\n');

const normalize = value => String(value ?? '').trim().toLowerCase();

export function excludedPack(pack, configured = DEFAULT_EXCLUSIONS) {
    const excluded = new Set(String(configured).split(/[\n,]/).map(normalize).filter(Boolean));
    const candidates = [pack.title, pack.metadata?.label, pack.collection, pack.metadata?.packageName];
    const visited = new Set();
    for (let folder = pack.folder; folder && !visited.has(folder); folder = folder.folder) {
        visited.add(folder);
        candidates.push(folder.name);
    }
    return candidates.some(value => excluded.has(normalize(value)));
}
