import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@rahoot/socket': path.resolve(__dirname, './src'),
      '@rahoot/common': path.resolve(__dirname, '../common/src'),
    },
  },
})
