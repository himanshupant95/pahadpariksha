// Apply the owner's review commands from a comment on a "ca-review" issue to src/data/digest.json.
// Env: COMMENT (comment body), ISSUE_BODY (issue body with the <!-- ca-map {...} --> P-number → id map).
// Writes review-result.md (reply), review-changed (1/0), review-close (1 on /ok).
import { readFile, writeFile } from 'node:fs/promises';
import { applyCommands } from './review-lib.mjs';

const DIGEST = 'src/data/digest.json';
const map = JSON.parse((process.env.ISSUE_BODY || '').match(/<!-- ca-map (\{.*?\}) -->/)?.[1] || '{}');
const dg = JSON.parse(await readFile(DIGEST, 'utf8'));
const { reply, changed, close } = applyCommands(dg, map, process.env.COMMENT);
if (changed) await writeFile(DIGEST, JSON.stringify(dg, null, 1) + '\n');
await writeFile('review-result.md', reply || 'कोई आदेश नहीं मिला।');
await writeFile('review-changed', changed ? '1' : '0');
await writeFile('review-close', close ? '1' : '0');
console.log(reply);
