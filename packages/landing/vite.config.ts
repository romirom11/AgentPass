import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3848,
    proxy: {
      "/auth/agentpass": {
        target: "http://localhost:3846",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth\/agentpass/, "/demo/api/auth/agent"),
      },
    },
  },
});
