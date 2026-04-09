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
        // Use IPv4 loopback — `localhost` can resolve to ::1 while the API is only reachable via 127.0.0.1,
        // which produced ECONNREFUSED in dev and zero sign-up hits on the Express process.
        target: "http://127.0.0.1:3000",
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
