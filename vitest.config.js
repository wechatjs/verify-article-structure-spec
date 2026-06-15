import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // 让 verify_article_structure.js 里的 `require('web-webapp-common/...')` 等 webpack alias
      // 在 vitest/Node 环境下也能解析到真品。
      // 注意：路径是相对当前 vitest.config.js 所在目录（packages/verify-article-structure-spec/）。
      'web-webapp-common': path.resolve(__dirname, '../web-webapp-common'),
      'biz_common': path.resolve(__dirname, '../mmbizweb-web2-common/biz_common'),
    },
  },
  test: {
    include: ['__tests__/unit/**/*.test.js'],
    environment: 'jsdom',
    globals: true,
    // 单测要快：超过 5s 直接判定失败
    testTimeout: 5000,
    // 启动前把 stub 模块注入 require 缓存，避免内部依赖的副作用
    setupFiles: ['./__tests__/unit/setup.js'],
  },
});
