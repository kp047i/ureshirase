import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// 1ファイルに束ねる。ダブルクリックで開ける(サーバー不要)ので、そのまま渡せる
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  base: './',
})
