<template>
    <section>
        <ul>
            <li>
                <t>**Translation** 1||**Traduction** 1</t>
            </li>
            <li>
                <t class.1="red">__Translation__(1) 2||__Traduction__(1) 2</t>
            </li>
            <li>
                <t id.1="myId" class.1.2="highlighted" class.2="bordered">
                    This *word*(1) must have class .highlighted and id #myId.
                    Another **words**(2) with __only__(2) the class .highlighted but different tags
                </t>
            </li>
            <li>
                <t>_Hello {myVar}_||_Bonjour le {myVar}_</t>
            </li>
            <li>
                <t :d="{renamedVar: myVar}">~~Hello {renamedVar}~~||~~Bonjour le {renamedVar}~~</t>
            </li>
            <li>
                <t>*Hello ***{world}****||*Bonjour le ***{world}**</t>
            </li>
            <li>
                <t>Hello =={notComputedWorld}==||Bonjour le =={notComputedWorld}==</t>
            </li>
            <li>
                <t>H~2~O, x^2^||H~2~O, x^2^</t>
            </li>
            <li>
                <t>Click on [this link](https://example.com)||Cliquez sur [ce lien](https://example.com)</t>
            </li>
            <li>
                <t>These characters should be escaped: \~ \= \* \_ \^||Ces caractères devraient être échappés: \~ \= \* \_ \^</t>
            </li>
        </ul>
    </section>
</template>

<script setup>
const myVar = ref(`world`);

const world = staticTrComputed(`world||monde`);
const notComputedWorld = staticTr(`world||monde`);

</script>

<style scoped>
:deep(.red) {
    color: red;
}

:deep(.highlighted) {
  background-color: cyan;
}

:deep(.bordered) {
    border: 1px solid black;
}
</style>
