import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  build: {
    outDir: "dist",
  },
  plugins: [react()],
  server: {
    proxy: {
      "/api/chart": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => {
          const url = new URL(path, "http://localhost");
          const symbol = url.searchParams.get("symbol");
          const interval = url.searchParams.get("interval") || "1d";
          const range = url.searchParams.get("range") || "10y";
          return `/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`;
        },
      },
    },
  },
});
