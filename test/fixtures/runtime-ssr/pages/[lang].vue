<template>
    <main>
        <h1 id="inline">{{ inline }}</h1>
        <p id="external">{{ external }}</p>
        <p id="computed">{{ reactiveText }}</p>
        <p id="plain">{{ plain }}</p>
        <t id="component" :value="messages" />
        <a id="attribute" :title="messages" v-t:title="messages">attribute</a>
        <NuxtLink id="english" to="/en">English</NuxtLink>
        <NuxtLink id="french" to="/fr">Français</NuxtLink>
    </main>
</template>
<script setup>
const messages = {"en-US": "Hello", "fr-CA": "Bonjour"};
const route = useRoute();
const inline = staticTr(`Hello||Bonjour`);
const external = staticTr(`@@greeting`);
const reactiveText = trComputed(messages);
const plain = tr(messages);
if (import.meta.server && route.query.gate) await $fetch(`/api/gate?action=hold`);
</script>
