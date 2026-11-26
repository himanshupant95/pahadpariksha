import { readFile } from 'node:fs/promises';
import { articleText } from './article-text.mjs';
const urls = JSON.parse(await readFile('urls.json','utf8'));
for (const u of urls) { const t = await articleText(u, 3500); console.log('\n=====', u, '\n', t || '(empty)'); }
