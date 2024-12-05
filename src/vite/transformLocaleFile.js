export default function transformLocaleFile(ctx) {
    // console.log(`transformLocaleFile`, ctx.fileId);

    const json = JSON.parse(ctx.src);
    let result = {};
    for (const key in json) {
        if (key === `$fingerprint`) {
            continue;
        }

        if (key.startsWith(`$`)) {
            result[key] = json[key];
            continue;
        }

        if (typeof json[key] === `string` || json[key].hasOwnProperty(`target`)) {
            result[key] = typeof json[key] === `string` ? json[key] : json[key].target;
        } else {
            for (const translationId in json[key]) {
                result[`${key}.${translationId}`] = typeof json[key][translationId] === `string` ? json[key][translationId] : json[key][translationId].target;
            }
        }
    }

    const code = `const locale = ${JSON.stringify(result)}; export default locale;`;
    return {code: code};
}
