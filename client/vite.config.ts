// vite.config.ts
// Configures the Vite build tool and development server, including backend proxying.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // Added proxy to cleanly map local frontend requests to the Express backend!
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        // Keep Host as localhost:8080 so Better Auth sees the same origin as BETTER_AUTH_URL (Vite dev).
        changeOrigin: false,
      },
    },
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
