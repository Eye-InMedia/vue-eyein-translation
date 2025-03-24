<template>
    <main>
        <div class="container">
            <select v-model="locale">
                <option value="en-US">English</option>
                <option value="fr-CA">Français</option>
                <option value="es-ES">Español</option>
            </select>

            <h1>Attributes</h1>
            <t-attributes></t-attributes>

            <h1>T Component</h1>
            <t-component></t-component>

            <h1>Filters</h1>
            <t-filters></t-filters>

            <h1>Markdown</h1>
            <t-markdown></t-markdown>
        </div>
    </main>
</template>

<script setup>
import TFilters from "./components/tFilters.vue";
import TAttributes from "./components/tAttributes.vue";
import TComponent from "./components/tComponent.vue";
import TMarkdown from "./components/tMarkdown.vue";
const locale = useLocale();
</script>

<style>
body {
    margin: 0;
}

main {
    display: flex;
    align-items: center;
    justify-content: space-around;
    height: 100vh;
}

.container {
    min-width: 30%;
    min-height: 40%;
    border-radius: 10px;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);
    padding: 30px;
}
</style>
