<template>
    <main>
        <select @input="switchLocale">
            <option value="en-US">English</option>
            <option value="fr-FR">Français</option>
            <option value="es-ES">Español</option>
        </select>
        <div title="Test EN||Test FR" v-t:title>
            <t>Test translation||Traduction de test</t>
        </div>
        <div>{{ test }}</div>
        <div>{{ test2 }}</div>
    </main>
</template>

<script setup>
const test = createTranslation(`JS translation||Traduction dans le JS`);
const test2 = tr({en: `English`, fr: `French`});

const locale = useLocale();

async function switchLocale(event) {
    locale.value = event.target.value;
    await loadLocale(event.target.value);
}
</script>
