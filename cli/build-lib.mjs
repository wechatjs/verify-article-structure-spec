// Build a CJS bundle for the '.' export — bundles mp-darkmode + all engine
// deps into a single file at ES2016 (no optional chaining). This lets webpack 4
// consume the package without parsing mp-darkmode's minified bundle separately.
import esbuild from 'esbuild';

esbuild.buildSync({
  entryPoints: ['engine/index.ts'],
  bundle: true,
  format: 'cjs',
  outfile: 'dist/verify-article-structure.lib.cjs',
  platform: 'browser',
  target: 'es2016',
  legalComments: 'none',
});

console.log('✅ dist/verify-article-structure.lib.cjs (CJS, ES2016) built');
