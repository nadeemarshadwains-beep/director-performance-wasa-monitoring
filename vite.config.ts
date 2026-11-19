import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { host: "127.0.0.1" },
  base: process.env.GITHUB_PAGES === "true" ? "/director-performance-wasa-monitoring/" : "/",
});
