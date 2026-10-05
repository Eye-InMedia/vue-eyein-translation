import {defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        include: [`test/**/*.test.js`],
        // tests use process.chdir(), which is not available in worker threads
        pool: `forks`
    }
});
