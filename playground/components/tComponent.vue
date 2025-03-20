<template>
    <section>
        <ul>
            <li>
                <t>Translation 1||Traduction 1</t>
            </li>
            <li>
                <t>Hello {myVar}||Bonjour le {myVar}</t>
            </li>
            <li>
                <t :d="{renamedVar: myVar}">Hello {renamedVar}||Bonjour le {renamedVar}</t>
            </li>
            <li>
                <t>Hello {world}||Bonjour le {world}</t>
            </li>
            <li>
                <t>Hello {notComputedWorld}||Bonjour le {notComputedWorld}</t>
            </li>
            <li>
                <t>Hello {translatedObject}||Bonjour la {translatedObject}</t>
            </li>
            <li>
                <t>Hello {translatedObjectComputed}||Bonjour la {translatedObjectComputed}</t>
            </li>
        </ul>
    </section>
</template>

<script setup>
const myVar = ref(`world`);

const world = staticTrComputed(`world||monde`);
const notComputedWorld = staticTr(`world||monde`);

const translatedObject = tr({en: `Translation in DB`, fr: `Traduction dans la BDD`});
const translatedObjectComputed = trComputed({en: `Translation in DB`, fr: `Traduction dans la BDD`});
</script>

<style scoped>

</style>
