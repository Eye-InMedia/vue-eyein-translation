export function getAllFilters() {
    return [`upper`, `lower`, `capitalize`, `number`, `dateLong`, `date`, `th`]
}

export function applyFilter(filter, value, locale, localeOptions) {
    switch (filter) {
        case `upper`:
            return value.toUpperCase();
        case `lower`:
            return value.toLowerCase();
        case `capitalize`:
            return capitalize(value);
        case `number`:
            return formatNumber(value, locale);
        case `dateLong`:
            return formatDate(value, locale, `long`);
        case `date`:
            return formatDate(value, locale, `short`);
        case `th`:
            return nth(value, locale, localeOptions);
        default:
            return value;
    }
}

export function capitalize(value) {
    if (!value) {
        return ``;
    }

    return value[0].toUpperCase() + value.substring(1);
}

export function formatNumber(value, locale) {
    return value.toLocaleString(locale);
}

export function formatDate(value, locale, mode) {
    let dateStyle = `full`;
    let timeStyle = `short`;

    switch (mode) {
        case `short`:
            dateStyle = `short`;
    }

    return new Intl.DateTimeFormat(locale, {
        dateStyle: dateStyle,
        timeStyle: timeStyle,
    }).format(value);
}

export function nth(n, locale, localeOptions) {
    const suffixes = localeOptions?.$ordinal || {
        one: `º`,
        two: `º`,
        few: `º`,
        other: `º`
    };

    const ordinalRules = new Intl.PluralRules(locale, {type: `ordinal`});
    const rule = ordinalRules.select(n);
    const suffix = suffixes[rule];
    return `${n}${suffix}`;
}
