// Reads the body text of a news article from a publisher's own page (Amar Ujala, Live Hindustan,
// TV9 Bharatvarsh, …) so the writer and the checker see the full report, not just the headline.
// Google News links are never opened (their article URLs are not decoded — see handoff notes).
// Order: JSON-LD "articleBody" (clean, set by the publisher) → <p> paragraphs inside the article.

const UA = 'Mozilla/5.0 (compatible; PahadParikshaBot/1.0; +https://pahadpariksha.in)';
const ent = (t) => t.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#039;|&rsquo;|&lsquo;/g, "'")
  .replace(/&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));
const clean = (t) => ent(t.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

export const readable = (url) => !/news\.google\.com/.test(url || '');

export async function articleText(url, max = 6000) {
  if (!readable(url)) return '';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'hi,en;q=0.8' }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    if (!res.ok) return '';
    const html = await res.text();
    // 1) JSON-LD NewsArticle.articleBody
    for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(m[1].trim());
        const all = [data].flat().flatMap((d) => [d, ...(d['@graph'] || [])]);
        const body = all.map((d) => d && d.articleBody).find((b) => typeof b === 'string' && b.length > 200);
        if (body) return clean(body).slice(0, max);
      } catch { /* malformed JSON-LD — try the next block */ }
    }
    // 2) paragraphs, preferring those inside <article>
    const scope = (html.match(/<article[\s\S]*?<\/article>/i) || [html])[0];
    const paras = [...scope.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => clean(m[1]))
      .filter((p) => p.length > 60 && !/copyright|सर्वाधिकार|subscribe|डाउनलोड करें|follow us|यह भी पढ़ें|ये भी पढ़ें/i.test(p));
    return paras.join('\n').slice(0, max);
  } catch { return ''; }
}
