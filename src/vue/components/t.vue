<template>
    <span v-html="htmlResult"></span>
</template>

<script>
import SimpleMarkdownParser from "../helpers/SimpleMarkdownParser";
import {applyFilter, getAllFilters} from "../filters.js";

const props = {
    value: {
        type: Object
    },
    d: {
        type: Object,
        default() {
            return {}
        }
    },
    linkTarget: {
        type: String,
        default() {
            return `_blank`
        }
    }
};

const filters = getAllFilters();
for (const filter of filters) {
    props[filter] = {
        type: Boolean
    }
}

export default {
    name: `t`,
    props: props,
    computed: {
        translation() {
            if (!this.value) {
                throw new Error(`<t> is Missing value or slot`);
            }

            const locale = this.getLocale();
            const localeOptions = this.getLocaleTranslations();

            let result = this.t(this.value, this.d, locale);

            for (const filter of filters) {
                if (this[filter]) {
                    result = applyFilter(filter, result, locale, localeOptions);
                }
            }

            return result;
        },
        htmlResult() {
            const markdownParser = new SimpleMarkdownParser(this.translation);
            return markdownParser.parse({linkTarget: this.linkTarget})
        }
    }
}
</script>

<style scoped>

</style>
