export default function transformLocaleFile(ctx) {
    // console.log(`transformLocaleFile`, ctx.fileId);

    const json = JSON.parse(ctx.src);
    let result = {};
    for (const groupId in json) {
        if (typeof json[groupId] === `string` || json[groupId].hasOwnProperty(`target`)) {
            result[groupId] = typeof json[groupId] === `string` ? json[groupId] : json[groupId].target;
        } else {
            for (const translationId in json[groupId]) {
                result[`${groupId}.${translationId}`] = typeof json[groupId][translationId] === `string` ? json[groupId][translationId] : json[groupId][translationId].target;
            }
        }
    }

    return `const locale = ${JSON.stringify(result)}; export default locale;`;
}
