export function localeCookieOptions(url) {
    return {path: `/`, sameSite: `strict`, secure: url.protocol === `https:`};
}
