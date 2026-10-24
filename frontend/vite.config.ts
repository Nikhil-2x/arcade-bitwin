import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // two-player rooms: the backend (npm run dev in ../backend) listens on 8787
    proxy: { "/ws": { target: "ws://localhost:8787", ws: true } },
  },
});
