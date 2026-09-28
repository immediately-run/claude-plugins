import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'

// MDX must run before @vitejs/plugin-react so the JSX it emits is handled by
// React's transform. immediately.run compiles .mdx natively WITH remark-gfm
// (tables, strikethrough, autolinks), so the local build enables it too —
// without it a GFM table renders on the host and breaks under `vite dev`.
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    react(),
  ],
})
