<template>
    <section>
        <ul>
            <li>
                <h1
                    v-t:title
                    title="Translated title||Titre traduit"
                >
                    Hover me
                </h1>
            </li>
            <li>
                <h1
                    v-t:title="{inlineVar: 1234}"
                    title="Title using variable: {inlineVar}||Titre utilisant un variable: {inlineVar}"
                >
                    Hover me
                </h1>
            </li>
            <li>
                <h1
                    v-t:title
                    title="Translated title by {myVar}||Titre traduit par {myVar}"
                >
                    Hover me
                </h1>
            </li>
            <li>
                <input
                    v-t.title.placeholder
                    type="text"
                    placeholder="Hover me||Survolez-moi"
                    title="Translated title||Titre traduit"
                >
            </li>
            <li>
                <input
                    v-t.title
                    v-t:placeholder
                    type="text"
                    placeholder="{more} complex||{more} complexe"
                    title="Translated title ({myVar})||Titre traduit ({myVar})"
                    value.t="translated||traduit"
                >
            </li>
        </ul>
    </section>
</template>

<script setup>
const myVar = ref(`Eye-In Media`);

const more = staticTrComputed(`More||Plus`);
</script>

<style scoped>

</style>
