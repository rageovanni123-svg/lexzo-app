import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

// Build para a Vercel: o plugin do Nitro detecta o ambiente da Vercel
// e gera a saída em .vercel/output (Build Output API). Não precisa de vercel.json.
// A ordem importa: tanstackStart -> nitro -> viteReact.
export default defineConfig({
  server: { port: 3000 },
  build: { sourcemap: true },
  plugins: [tsConfigPaths(), tailwindcss(), tanstackStart(), nitro(), viteReact()],
});
