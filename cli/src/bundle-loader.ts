// Build / load the engine's browser single-file IIFE bundle.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BuildOptions } from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to cli/ (parent of src/). */
const CLI_DIR = path.resolve(__dirname, '..');

/** cli's vendored engine entry (esbuild entry, self-contained source of truth). */
const ENGINE_ENTRY = path.join(CLI_DIR, 'engine', 'index.ts');
/** cli's own bundle output. */
const CLI_BUNDLE_PATH = path.join(
  CLI_DIR,
  'dist',
  'verify_article_structure.browser.js',
);

/** esbuild build params (same shape as scripts/build-browser.js). */
function buildBundleOptions(outfile: string): BuildOptions {
  return {
    entryPoints: [ENGINE_ENTRY],
    bundle: true,
    format: 'iife',
    globalName: '__verifyArticleStructureModule__',
    outfile,
    platform: 'browser',
    target: 'es2016',
    legalComments: 'none',
  };
}

/**
 * Load the browser bundle source string.
 *
 * Builds the bundle into cli/dist/verify_article_structure.browser.js via
 * esbuild and returns its source (for page.evaluate injection).
 */
export async function loadBrowserBundle(): Promise<string> {
  const esbuild = await import('esbuild');
  fs.mkdirSync(path.dirname(CLI_BUNDLE_PATH), { recursive: true });
  esbuild.buildSync(buildBundleOptions(CLI_BUNDLE_PATH) as Parameters<typeof esbuild.buildSync>[0]);
  return fs.readFileSync(CLI_BUNDLE_PATH, 'utf8');
}
