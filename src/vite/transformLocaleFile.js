export default function transformLocaleFile(ctx) {
    // console.log(`transformLocaleFile`, ctx.fileId);

    const json = JSON.parse(ctx.src.toString());
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

    ctx.src.remove(0, ctx.src.toString().length);
    ctx.src.append(JSON.stringify(result));
    ctx.src.prepend(`const locale = `);
    ctx.src.append(`; export default locale;`);

    // console.log(ctx.fileId, ctx.src.toString());
}
