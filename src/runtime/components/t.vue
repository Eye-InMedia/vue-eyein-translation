<template>
    <template v-if="noHtml">{{ translation }}</template>
    <span v-else v-html="htmlResult"></span>
</template>

<script>
import SimpleMarkdownParser from "../js/SimpleMarkdownParser.js";
import {applyFilter, getAllFilters} from "../js/filters.js";

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
    },
    noHtml: {
        type: Boolean,
        default: false
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
    inject: [`_eTr`],
    computed: {
        translation() {
            if (!this.value) {
                throw new Error(`<t> is Missing value or slot`);
            }

            let data = this.d;
            if (this.value.data) {
                data = {...data, ...this.value.data}
            }

            let result = this._eTr.tr(this.value, data);

            const localeOptions = this._eTr.getLocaleOptions(this._eTr.getLocale());
            for (const filter of filters) {
                if (this[filter]) {
                    result = applyFilter(filter, result, this._eTr.getLocale(), localeOptions);
                }
            }

            return result;
        },
        htmlResult() {
            const markdownParser = new SimpleMarkdownParser(this.translation, this.$attrs);
            return markdownParser.parse({linkTarget: this.linkTarget})
        }
    }
}
</script>

<style scoped>

</style>
