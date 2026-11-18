// One-off probe (news.yml mode=probe): which Uttarakhand feeds respond from GitHub's runners,
// and whether article pages can be read for full text.
import { articleText } from './article-text.mjs';
const UA = 'Mozilla/5.0 (compatible; PahadParikshaBot/1.0; +https://pahadpariksha.in)';
const AU = ['haridwar','nainital','almora','haldwani','udham-singh-nagar','pauri','tehri','chamoli','uttarkashi','pithoragarh','rudraprayag','bageshwar','champawat','roorkee','rishikesh'];
const C = [
  ...AU.map((c) => `https://www.amarujala.com/rss/${c}.xml`),
  'https://api.livehindustan.com/feeds/rss/uttarakhand/dehradun/rssfeed.xml',
  'https://api.livehindustan.com/feeds/rss/uttarakhand/haldwani/rssfeed.xml',
  'https://www.jagran.com/rss/uttarakhand/dehradun-city.xml', 'https://www.jagran.com/rss/state/uttarakhand.xml',
  'https://feeds.feedburner.com/ndtvkhabar-uttarakhand', 'https://www.etvbharat.com/hi/uttarakhand/feed',
  'https://www.indiatv.in/rssnews/topstory-uttarakhand.xml', 'https://www.hindustantimes.com/feeds/rss/cities/dehradun-news/rssfeed.xml',
  'https://timesofindia.indiatimes.com/rssfeeds/-2128817995.cms',
];
const firstLinks = {};
for (const u of C) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    const t = await r.text();
    const items = (t.match(/<item[\s>]/g) || []).length;
    const link = t.match(/<item[\s>][\s\S]*?<link>(?:<!\[CDATA\[)?\s*([^<\]\s]+)/)?.[1] || '';
    console.log(`${r.status} items=${items} ${u}`);
    if (items && link) firstLinks[new URL(link).host] ??= link;
  } catch (e) { console.log(`ERR ${e.message.slice(0, 60)} ${u}`); }
}
// article text from each publisher we already use + any new host found above
const news = (await import('../src/data/news.json', { with: { type: 'json' } })).default.items;
for (const n of news) { const h = new URL(n.link).host; if (!/google/.test(h)) firstLinks[h] ??= n.link; }
for (const [host, link] of Object.entries(firstLinks)) {
  const t = await articleText(link);
  console.log(`ARTICLE ${host}: ${t.length} chars :: ${t.slice(0, 160).replace(/\n/g, ' ')}`);
}
