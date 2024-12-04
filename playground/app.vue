<template>
    <main>
        <select v-model="locale">
            <option value="en-US">English</option>
            <option value="fr-CA">Français</option>
            <option value="es-ES">Español</option>
        </select>
        <div title="Test EN||Test FR" v-t:title>
            <t>Test translation||Traduction de test</t>
        </div>
        <div><t>B||B2</t></div>
        <div><t>C||C2</t></div>
        <div><t>A||A2</t></div>
        <div><t>D||D2</t></div>
    </main>
</template>

<script setup>
const hello = ref(`Hello world`);

// const test = staticTr(`JS translation||Traduction dans le JS`);
// const test2 = tr({en: `English`, fr: `French`});

const locale = useLocale();
</script>
