// Build a browser-runnable IIFE bundle that exposes verifyArticleStructure as a
// global (window.VerifyArticleStructure). Self-contained (bundles mp-darkmode
// etc.). For raw-browser / non-webpack consumers; webpack consumers use the
// engine entry (exports['.']).
import esbuild from 'esbuild';

esbuild.buildSync({
  entryPoints: ['engine/index.ts'],
  bundle: true,
  format: 'iife',
  globalName: 'VerifyArticleStructure',
  outfile: 'dist/verify-article-structure.browser.js',
  platform: 'browser',
  target: 'es2016',
  legalComments: 'none',
});

console.log('✅ dist/verify-article-structure.browser.js (IIFE) built');
