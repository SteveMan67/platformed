import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  root: 'frontend',
  base: '/',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'frontend/index.html'),
        editor: resolve(__dirname, 'frontend/editor.html'),
        level: resolve(__dirname, 'frontend/level.html'),
        levelMeta: resolve(__dirname, 'frontend/level-meta.html'),
        login: resolve(__dirname, 'frontend/login.html'),
        register: resolve(__dirname, 'frontend/register.html'),
        newLevel: resolve(__dirname, 'frontend/new-level.html'),
        user: resolve(__dirname, 'frontend/user.html')
      }
    }
  }
})