/**
 * fetch-article.ts
 *
 * URL fetch layer: TS port of `__tests__/integration/run.js`
 * fetchArticleContent.
 *
 * Logic (matches run.js):
 * - Use Node https/http to fetch; follow up to MAX_REDIRECTS redirects.
 * - Send a UA header.
 * - Regex-match the start of `id="js_content"`.
 * - Pick the earliest of several end keywords as the end boundary.
 * - Strip the trailing `</div>` close, return the #js_content innerHTML.
 * - Enforce FETCH_TIMEOUT_MS.
 * - Failures (no #js_content / login required / timeout) throw a clear error.
 *
 * NOTE: user-facing error messages stay Chinese (cli.test.ts may assert them).
 */
import https from 'node:https';
import http from 'node:http';

const FETCH_TIMEOUT_MS = 30000;
const MAX_REDIRECTS = 5;

const END_KEYWORDS = [
  '<script type="text/javascript"',
  'id="js_pc_qr_code"',
  'id="js_content_ad"',
  'class="rich_media_area_extra"',
  'id="js_tags_preview_toast"',
];

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch a mp-article URL, return the #js_content innerHTML.
 *
 * @throws {Error} too many redirects / no #js_content (login required) /
 *   fetch timeout / network error
 */
export function fetchArticleContent(url: string, redirect = 0): Promise<string> {
  return new Promise((resolve, reject) => {
    if (redirect > MAX_REDIRECTS) {
      return reject(new Error('重定向次数过多'));
    }
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(
      url,
      { headers: { 'User-Agent': USER_AGENT } },
      (res) => {
        if (
          res.statusCode &&
          res.statusCode >= 300 &&
          res.statusCode < 400 &&
          res.headers.location
        ) {
          return fetchArticleContent(res.headers.location, redirect + 1)
            .then(resolve)
            .catch(reject);
        }
        let html = '';
        res.on('data', (chunk: Buffer | string) => {
          html += chunk;
        });
        res.on('end', () => {
          const m = html.match(/id=["']js_content["'][^>]*>/);
          if (!m) {
            return reject(new Error('未找到 #js_content，文章可能需登录'));
          }
          const start = (m.index ?? 0) + m[0].length;
          let end = html.length;
          for (const kw of END_KEYWORDS) {
            const i = html.indexOf(kw, start);
            if (i > 0 && i < end) end = i;
          }
          let content = html.substring(start, end);
          // Strip js_content's closing </div> (innerHTML must not include the
          // outer close tag). Only the trailing one is removed since the article
          // may contain nested divs.
          content = content.replace(/\s*<\/div>\s*$/, '');
          resolve(content);
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(FETCH_TIMEOUT_MS, () =>
      req.destroy(new Error('抓取超时')),
    );
  });
}
