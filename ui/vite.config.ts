import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      // Required by FHEVM SDK for WebAssembly SharedArrayBuffer
      // Note: COEP removed to allow Base Account SDK communication with Coinbase services
      // COOP set to same-origin-allow-popups for Base Account SDK compatibility
      "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    },
  },
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for Node.js modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Polyfill specific modules
      include: ["util", "stream", "crypto", "buffer"],
    }),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  optimizeDeps: {
    exclude: ["@zama-fhe/relayer-sdk", "@zama-fhe/relayer-sdk/bundle"],
    esbuildOptions: {
      target: "esnext",
    },
  },
}));
