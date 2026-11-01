// Optional: refresh the file:// fallback copy of content/parallels.json inside index.html.
// Usage (from the repo root): node site/tools/embed-parallels.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const dir = new URL('..', import.meta.url);
const json = JSON.stringify(JSON.parse(readFileSync(new URL('content/parallels.json', dir), 'utf8')));
const htmlPath = new URL('index.html', dir);
const html = readFileSync(htmlPath, 'utf8').replace(
  /(<script type="application\/json" id="parallels-fallback">)[\s\S]*?(<\/script>)/,
  (_, a, b) => `${a}${json.replace(/</g, '\\u003c')}${b}`,
);
writeFileSync(htmlPath, html);
console.log('Embedded', json.length, 'bytes');
