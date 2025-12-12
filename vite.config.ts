import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    base: "/react-ai-query/",
    server: {
        port: 5173
    },
    resolve: {
        alias: {
            "react-ai-query": resolve(__dirname, "src/index.ts")
        }
    }
});

