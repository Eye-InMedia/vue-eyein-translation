import {applyFilter} from "./filters.js";

export default function replaceDataBindings(str, data, locale, translations) {
    let allDataBindingMatches = str.matchAll(/\{(\w+(?:\.\w+)*)(|[^}]+)*}/g);
    for (const matches of allDataBindingMatches) {
        const fullMatch = matches[0];
        const keys = matches[1].split(`.`);

        if (keys.length === 0) {
            continue;
        }

        let transformedValue;
        for (const key of keys) {
            transformedValue = transformedValue ? transformedValue[key] : data[key];
        }

        if (matches.length > 2 && matches[2]) {
            const filters = matches[2].split(`|`);
            filters.shift();
            for (const filter of filters) {
                transformedValue = applyFilter(filter, transformedValue, locale, translations[locale]);
            }
        }
        str = str.replace(fullMatch, transformedValue);
    }

    return str;
}
