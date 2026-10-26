/** Resolve the exporter's existing level conventions without rolling dice.
 * Complex or unsupported expressions remain readable instead of aborting a document.
 */
export function formatFormula(doc, input) {
    const level = doc?.level ?? doc?.system?.level?.value;
    let formula = String(input).split('#')[0].split('|')[0].trim();
    formula = formula.replace(/@item\.(?:level|rank)\b/g, () => level ?? '@item.level')
        .replace(/@item\.badge\.value\b/g, '1')
        .replace(/@actor\.level\b/g, '1');
    // Do not split on "d": it also occurs in unresolved references and words.
    // Preserve dice expressions, including multiple dice and nested functions.
    if (/\d*d\d+/i.test(formula) || formula.includes('@')) return formula;
    try {
        const result = Roll.safeEval(formula);
        return typeof result === 'number' && Number.isFinite(result) ? result : formula;
    } catch {
        return formula;
    }
}

/** Use the public playback order; include sounds for playlists without an order. */
export function orderedSounds(playlist) {
    const order = playlist.playbackOrder;
    return Array.isArray(order) && order.length
        ? order.map(id => playlist.sounds.get(id)).filter(Boolean)
        : Array.from(playlist.sounds);
}
