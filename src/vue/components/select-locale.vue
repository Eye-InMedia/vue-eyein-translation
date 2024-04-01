<template>
    <div class="select-locale">
        <div class="current-locale" @click="selectionVisible = true" :title="currentLocaleObject.short.toUpperCase()" @focusout="selectionVisible = false">
            <img v-if="flags" :src="currentLocaleObject.flag" :alt="currentLocaleObject.short.toUpperCase()">
            <template v-if="!flagOnly">
                <span v-if="short">{{ currentLocaleObject.short.toUpperCase() }}</span>
                <span v-else>{{ currentLocaleObject.name }}</span>
            </template>
        </div>

        <div class="selection" v-if="selectionVisible">
            <div class="locales">
                <div class="locale" v-for="locale of locales" :title="locale.value" @click="switchLocale(locale)">
                    <img :src="locale.flag" :alt="currentLocaleObject.short.toUpperCase()">
                    <span v-if="!flagOnly">{{ short ? locale.short.toUpperCase() : locale.name }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<script>

import {capitalize} from "../filters";

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
            currentLocale: this.getLocale(),
            selectionVisible: false
        }
    },
    computed: {
        currentLocaleObject() {
            return this.locales.find(l => l.value === this.currentLocale);
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
            this.currentLocale = this.getLocale();
        }
    }
}
</script>

<style scoped>
.select-locale {
    display: inline-block;
    position: relative;
    color: black;

    img {
        margin: 0;
        width: 30px;

        + span {
            margin-left: 7px;
        }
    }

    .current-locale {
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;

        span {
            margin-left: 7px;
        }
    }

    .selection {
        color: black;
        position: absolute;
        top: calc(1em + 10px);
        left: 0;
        z-index: 1001;

        display: inline-block;

        .locales {
            display: grid;
            grid-template-rows: repeat(8, auto);
            grid-auto-flow: column;

            background-color: white;
            border-radius: 3px;
            box-shadow: 2px 2px 7px 0 black;

            .locale {
                display: flex;
                align-items: center;
                justify-content: left;
                padding: 5px 10px;
                cursor: pointer;
                user-select: none;

                &:hover {
                    background-color: rgba(0, 0, 0, 0.1);
                }
            }
        }
    }

}
</style>
