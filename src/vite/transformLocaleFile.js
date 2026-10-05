export default function transformLocaleFile(ctx) {
    const json = JSON.parse(ctx.src.toString());
    let result = Object.create(null);
    for (const key in json) {
        if (key === `$fingerprint`) {
            continue;
        }

        if (key.startsWith(`$`)) {
            result[key] = json[key];
            continue;
        }

        if (typeof json[key] === `string` || Object.prototype.hasOwnProperty.call(json[key], `target`)) {
            result[key] = typeof json[key] === `string` ? json[key] : json[key].target;
        } else {
            for (const translationId in json[key]) {
                result[`${key}.${translationId}`] = typeof json[key][translationId] === `string` ? json[key][translationId] : json[key][translationId].target;
            }
        }
    }

    ctx.src.remove(0, ctx.src.toString().length);
    // A computed key preserves __proto__ as data in the generated JavaScript object.
    ctx.src.append(JSON.stringify(result).replace(/"__proto__":/g, `["__proto__"]:`));
    ctx.src.prepend(`const locale = `);
    ctx.src.append(`; export default locale;`);
}
