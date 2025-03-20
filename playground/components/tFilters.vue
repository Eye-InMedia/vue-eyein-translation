<template>
    <section>
        <ul>
            <li>
                <t upper>uppercase||majuscule</t>
            </li>
            <li>
                <input type="text" placeholder="LOWERCASE||minuscule" v-t:placeholder.lower>
            </li>
            <li>
                <input type="text" placeholder="CAPITALIZED||capitale" v-t:placeholder.lower.capitalize>
            </li>
            <li>
                <t>You can add filterto variables: {myVar|upper}||Vous pouvez ajouter des filtres aux variable: {myVar|upper}</t>
            </li>
            <li>
                <t :d="{n: 1_000_000}">Numbers: {n|number}||Nombres: {n|number}</t>
            </li>
            <li>
                <t :d="{n1: 1, n2: 2, n3: 3, n4: 4, n103: 103}">Ordinals: {n1|th} {n2|th} {n3|th} {n4|th} {n103|th}||Ordinaux: {n1|th} {n2|th} {n3|th} {n4|th} {n103|th}</t>
            </li>
        </ul>
    </section>
</template>

<script setup>
const myVar = ref(`Eye-In Media`);
</script>

<style scoped>

</style>
