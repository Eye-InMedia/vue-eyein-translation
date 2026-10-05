export function matchSupportedLocale(preference, locales) {
    if (typeof preference !== `string`) return null;
    const tag = preference.trim().toLowerCase();
    if (!/^[a-z]{1,8}(?:-[a-z0-9]{1,8})*$/i.test(tag)) return null;
    return locales.find(locale => locale.toLowerCase() === tag)
        || locales.find(locale => locale.toLowerCase().split(`-`)[0] === tag.split(`-`)[0])
        || null;
}

export function nearestLocale(preferences, locales) {
    if (Array.isArray(preferences)) {
        for (const preference of preferences) {
            const matched = matchSupportedLocale(preference, locales);
            if (matched) return matched;
        }
    }
    return locales[0];
}

export function detectBrowserLocale(locales, environment = globalThis) {
    try {
        const stored = matchSupportedLocale(environment.localStorage?.getItem(`locale`), locales);
        if (stored) return stored;
    } catch {
        // Browser privacy settings can reject access to storage itself.
    }
    try {
        const navigator = environment.navigator;
        const preferences = Array.isArray(navigator?.languages) ? [...navigator.languages] : [];
        preferences.push(navigator?.language);
        return nearestLocale(preferences, locales);
    } catch {
        return locales[0];
    }
}

export function negotiateAcceptLanguage(header, locales) {
    const ranges = [];
    if (typeof header === `string`) {
        for (const [order, entry] of header.split(`,`).entries()) {
            const match = entry.trim().match(/^(\*|[a-z]{1,8}(?:-[a-z0-9]{1,8})*)(?:\s*;\s*q=(0(?:\.\d{0,3})?|1(?:\.0{0,3})?))?$/i);
            if (match) ranges.push({tag: match[1].toLowerCase(), quality: match[2] === undefined ? 1 : Number(match[2]), order});
        }
    }
    const candidates = [];
    for (const [index, locale] of locales.entries()) {
        const tag = locale.toLowerCase();
        let selected, specificity = -1;
        for (const range of ranges) {
            let score = -1;
            if (range.tag === `*`) score = 0;
            else if (tag === range.tag || tag.startsWith(range.tag + `-`)) score = range.tag.split(`-`).length;
            // Regional fallback ranks below every actual language range, including q=0.
            else if (range.quality > 0 && tag.split(`-`)[0] === range.tag.split(`-`)[0]
                && !locales.some(l => l.toLowerCase() === range.tag || l.toLowerCase().startsWith(range.tag + `-`))) score = 0.5;
            if (score > specificity) {
                selected = range;
                specificity = score;
            }
        }
        if (selected?.quality > 0) candidates.push({locale, index, ...selected});
    }
    candidates.sort((a, b) => b.quality - a.quality || a.order - b.order || a.index - b.index);
    return candidates[0]?.locale || locales[0];
}
