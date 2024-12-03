export default function pluralize(str, data, locale) {
    let allPluralsMatches = str.matchAll(/\{([^{}]*?(?:\{(\w+)(?:\|\w+?)*?})+?[^{}]*?)}/g);
    for (const matches of allPluralsMatches) {
        if (!matches || matches.length < 3) {
            continue;
        }

        const fullMatch = matches[0];
        const key = matches[2];

        if (typeof data[key] !== `number`) {
            throw new Error(`[Translation Error] ${key} is not a number.`);
        }

        const choices = matches[1].replace(/\{([^|]*)\|([^|]*)}/g, `{$1[;;;]$2}`).split(`|`);
        if (choices.length < 3) {
            throw new Error(`[Translation Error] Pluralization issue, there must be at least 3 choices for n = 0, n = 1 and n > 1.`);
        }

        const cardinalRules = new Intl.PluralRules(locale);
        const rule = cardinalRules.select(data[key]);

        let choice;
        if (data[key] === 0) {
            choice = choices[0];
        } else if (choices.length === 3) {
            switch (rule) {
                case `one`:
                    choice = choices[1];
                    break;
                default:
                    choice = choices[2];
                    break;
            }
        } else {
            switch (rule) {
                case `zero`:
                    choice = choices[0];
                    break;
                case `one`:
                    choice = choices[1];
                    break;
                case `two`:
                    choice = choices[2];
                    break;
                case `few`:
                    choice = choices[3];
                    break;
                case `many`:
                    if (choices.length > 4) {
                        choice = choices[4];
                    } else {
                        choices.at(-1);
                    }
                    break;
                default:
                    choice = choices.at(-1);
                    break;
            }
        }

        str = str.replace(fullMatch, choice.replace(/\[;;;]/g, `|`));
    }

    return str;
}
