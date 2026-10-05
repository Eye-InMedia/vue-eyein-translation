import {defineConfig} from "vitest/config";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
    plugins: [vue()],
    resolve: {alias: {"#app": new URL(`./test/helpers/nuxtApp.js`, import.meta.url).pathname}},
    define: {"import.meta.server": true},
    test: {
        include: [`test/**/*.test.js`],
        // tests use process.chdir(), which is not available in worker threads
        pool: `forks`
    }
});
