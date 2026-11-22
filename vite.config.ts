import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    clearScreen: false,
    server: {
        host: process.env.TAURI_DEV_HOST || "0.0.0.0",
        port: 5173,
        strictPort: true,
        hmr: {
            protocol: "ws",
            host: process.env.TAURI_DEV_HOST || "0.0.0.0",
            port: 5174,
            clientPort: 5174,
        },
        watch: {
            ignored: ["**/src-tauri/**", ".trae/**"],
        },
    },
    resolve: {
        alias: {
            "@": resolve(import.meta.dirname, "./src"),
        },
    },
});
