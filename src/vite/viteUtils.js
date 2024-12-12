export function createTranslationId(str) {
    const cyrb64 = (str, seed = 0) => {
        let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
        return [h2 >>> 0, h1 >>> 0];
    };

    const cyrb64Hash = (str, seed = 0) => {
        const [h2, h1] = cyrb64(str, seed);
        return h2.toString(36).padStart(7, '0') + h1.toString(36).padStart(7, '0');
    }

    return `zz` + cyrb64Hash(str);
}

export function debounce(func, timeout = 100) {
    let timer;

    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

export function findLineNumber(indices, src) {
    const regex = /\n/g;
    let matches = [];
    const allEndLineIndices = [];
    while ((matches = regex.exec(src))) {
        allEndLineIndices.push(matches.index);
    }

    let i = 0;
    for (const endLineIndex of allEndLineIndices) {
        i++;

        if (endLineIndex >= indices[0]) {
            return i;
        }
    }

    return -1;
}

export function getEndOfImportsIndex(src) {
    const allImportsMatches = [...src.matchAll(/^\s*import\s+.*$/gmd)];
    if (!allImportsMatches || allImportsMatches.length === 0) {
        return -1;
    }
    const lastImportMatch = allImportsMatches.pop();
    return lastImportMatch.indices[0][1];
}

export function getVueEndOfImportsIndex(src) {
    const scriptRegex = /<script.*>/g;
    if (!scriptRegex.test(src)) {
        return -1;
    }

    let index = scriptRegex.lastIndex;
    const endOfImportsIndex = getEndOfImportsIndex(src);
    if (endOfImportsIndex >= 0) {
        index = endOfImportsIndex;
    }

    return index;
}
