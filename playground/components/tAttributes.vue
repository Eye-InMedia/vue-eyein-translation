<template>
    <section>
        <ul>
            <li>
                <h1 title="Translated title||Titre traduit" v-t:title>Hover me</h1>
            </li>
            <li>
                <h1 title="Title using variable: {inlineVar}||Titre utilisant un variable: {inlineVar}" v-t:title="{inlineVar: 1234}">Hover me</h1>
            </li>
            <li>
                <h1 title="Translated title by {myVar}||Titre traduit par {myVar}" v-t:title>Hover me</h1>
            </li>
            <li>
                <input type="text" placeholder="Hover me||Survolez-moi" title="Translated title||Titre traduit" v-t.title.placeholder>
            </li>
            <li>
                <input type="text" placeholder="{more} complex||{more} complexe" title="Translated title ({myVar})||Titre traduit ({myVar})" v-t.title v-t:placeholder value.t="translated||traduit">
            </li>
        </ul>
    </section>
</template>

<script setup>
const myVar = ref(`Eye-In Media`);

const more = staticTrComputed(`More||Plus`)
</script>

<style scoped>

</style>
