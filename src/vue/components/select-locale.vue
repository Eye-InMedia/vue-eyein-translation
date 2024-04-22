<template>
    <div class="select-locale">
        <button class="current-locale-btn" @click="selectionVisible = true" :title="currentLocaleObject.short.toUpperCase()" @focusout="focusOut" tabindex="0">
            <img v-if="flags" :src="currentLocaleObject.flag" :alt="currentLocaleObject.short.toUpperCase()">
            <template v-if="!flagOnly">
                <span v-if="short">{{ currentLocaleObject.short.toUpperCase() }}</span>
                <span v-else>{{ currentLocaleObject.name }}</span>
            </template>
        </button>

        <div class="selection-overlay" v-show="selectionVisible">
            <ul class="locales-list">
                <li class="locale-item" v-for="(locale, index) of locales" :title="locale.value">
                    <a @click="switchLocale(locale)" :tabindex="index+1">
                        <img :src="locale.flag" :alt="currentLocaleObject.short.toUpperCase()">
                        <span v-if="!flagOnly">{{ short ? locale.short.toUpperCase() : locale.name }}</span>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<script>
import {capitalize} from "../filters.js";

export default {
    name: `select-locale`,
    props: {
        flags: {
            type: Boolean,
            default() {
                return true;
            }
        },
        flagOnly: {
            type: Boolean,
            default() {
                return false;
            }
        },
        short: {
            type: Boolean,
            default() {
                return false;
            }
        }
    },
    data() {
        return {
            selectionVisible: false
        }
    },
    computed: {
        currentLocaleObject() {
            const locale = this.getLocale();
            return this.locales.find(l => l.value === locale);
        },
        locales() {
            const supportedLocales = this.getLocales();
            let locales = [];
            for (const l of supportedLocales) {
                const tmp = l.split(`-`);
                const shortLocale = tmp.shift();
                const region = tmp.pop();
                const localeName = new Intl.DisplayNames([l], {type: `language`});
                locales.push({
                    value: l,
                    short: shortLocale,
                    region: region,
                    flag: `https://eyeinlivestorage.blob.core.windows.net/public/icons/flags/${region.toUpperCase()}.svg`,
                    name: capitalize(localeName.of(shortLocale))
                });
            }
            return locales;
        }
    },
    methods: {
        async switchLocale(locale) {
            await this.setLocale(locale.value);
            this.selectionVisible = false;
        },
        focusOut() {
            setTimeout(() => this.selectionVisible = false, 500);
        }
    }
}
</script>

<style scoped>
.select-locale {
    display: inline-block;
    position: relative;
    color: black;
    user-select: none;
}

.select-locale img {
    margin: 0;
    width: 30px;
}

.select-locale img + span {
    margin-left: 7px;
}

.select-locale .current-locale-btn {
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
}

.select-locale .current-locale-btn span {
    margin-left: 7px;
}

.select-locale .selection-overlay {
    color: black;
    position: absolute;
    top: calc(1em + 10px);
    left: 0;
    z-index: 1001;

    display: inline-block;
}

.select-locale .selection-overlay .locales-list {
    display: grid;
    grid-template-rows: repeat(8, auto);
    grid-auto-flow: column;

    background-color: white;
    border-radius: 3px;
    box-shadow: 2px 2px 7px 0 black;
    padding: 0;
}

.select-locale .selection-overlay .locales-list .locale-item {
    display: flex;
    align-items: center;
    justify-content: left;
    padding: 5px 10px;
    cursor: pointer;
    user-select: none;
    border: none;
    background: none;
    list-style: none;
}

.select-locale .selection-overlay .locales-list .locale-item:hover {
    background-color: rgba(0, 0, 0, 0.1);
}

</style>
