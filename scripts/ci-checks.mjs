/* Dependency-free static sanity checks for PartFit Ghana.
   Run in CI (and locally: `node scripts/ci-checks.mjs`). Fast, no network,
   no browser — guards the invariants the app relies on so a regression is
   caught on the PR instead of in production. */
import { readFileSync, readdirSync } from 'node:fs';

let failed = 0;
const ok = m => console.log('  ✓ ' + m);
const bad = m => { console.error('  ✗ ' + m); failed = 1; };

const html = readFileSync('index.html', 'utf8');

// 1. CSP is present and script-src stays 'self' (no CDN escape hatch).
if (/Content-Security-Policy/.test(html)) ok('CSP meta present');
else bad('CSP meta missing from index.html');
if (/script-src 'self'/.test(html)) ok("CSP keeps script-src 'self'");
else bad("CSP no longer pins script-src to 'self'");

// 2. Every app <script src> is deferred (parse-blocking guard).
const withSrc = [...html.matchAll(/<script\b[^>]*\bsrc=/g)].length;
const missingDefer = [...html.matchAll(/<script\b(?![^>]*\bdefer\b)[^>]*\bsrc=/g)].length;
if (withSrc > 0 && missingDefer === 0) ok(`all ${withSrc} app scripts deferred`);
else bad(`${missingDefer} of ${withSrc} <script src> tag(s) missing defer`);

// 3. Service worker declares a versioned cache constant.
const sw = readFileSync('sw.js', 'utf8');
if (/const CACHE\s*=\s*['"]partfit-[\w.-]+['"]/.test(sw)) ok('SW cache version present');
else bad('sw.js is missing a partfit-* CACHE constant');

// 4. Every root JavaScript file parses (belt-and-braces alongside node --check).
const jsFiles = readdirSync('.').filter(f => f.endsWith('.js'));
let parseErrors = 0;
for (const f of jsFiles) {
  try { new Function(readFileSync(f, 'utf8')); }
  catch (e) {
    // new Function rejects top-level `return`/import; node --check is the real
    // gate. Only flag genuine SyntaxErrors that node --check would also catch.
    if (e instanceof SyntaxError && !/return|import|export/.test(e.message)) {
      bad(`${f}: ${e.message}`); parseErrors++;
    }
  }
}
if (!parseErrors) ok(`${jsFiles.length} root JS files scanned`);

console.log(failed ? '\nCI checks FAILED' : '\nCI checks passed');
process.exit(failed);
