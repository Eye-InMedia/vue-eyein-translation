import {useCookie} from '#app'

export default function useLocale() {
    return useCookie(`locale`, {secure: true, sameSite: true});
}
