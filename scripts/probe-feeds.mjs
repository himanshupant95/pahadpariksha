// One-off: check which publisher RSS feeds respond and whether they carry a summary (<description>).
const UA = 'Mozilla/5.0 (compatible; PahadParikshaBot/1.0; +https://pahadpariksha.in)';
const C = [
  'https://www.amarujala.com/rss/uttarakhand.xml', 'https://www.amarujala.com/rss/dehradun.xml',
  'https://api.livehindustan.com/feeds/rss/uttarakhand/rssfeed.xml', 'https://www.livehindustan.com/rss/uttarakhand',
  'https://www.jagran.com/rss/news/uttarakhand.xml', 'https://www.jagran.com/rss/uttarakhand.xml',
  'https://hindi.news18.com/rss/khabar/uttarakhand/uttarakhand.xml', 'https://hindi.news18.com/rss/uttarakhand.xml',
  'https://www.hindustantimes.com/feeds/rss/cities/dehradun-news/rssfeed.xml',
  'https://timesofindia.indiatimes.com/rssfeeds/-2128817995.cms', 'https://timesofindia.indiatimes.com/rssfeeds/4118215.cms',
  'https://www.etvbharat.com/hindi/uttarakhand/rss', 'https://www.etvbharat.com/rss/hindi/uttarakhand.xml',
  'https://navbharattimes.indiatimes.com/state/uttarakhand/rssfeedsection/21236867.cms',
  'https://www.bhaskar.com/rss-v1--category-11280.xml', 'https://www.tv9hindi.com/state/uttarakhand/feed',
  'https://www.abplive.com/states/uttarakhand/feed', 'https://www.zeenews.india.com/hindi/india/uttarakhand/rss',
  'https://www.dailypioneer.com/RSS/state-editions/dehradun.xml', 'https://english.loktej.com/tag/717/rss',
];
for (const u of C) {
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000), redirect: 'follow' });
    const t = await r.text();
    const items = (t.match(/<item[\s>]/g) || []).length;
    const d = t.match(/<item[\s>][\s\S]*?<description>([\s\S]*?)<\/description>/);
    const desc = d ? d[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim() : '';
    const ti = t.match(/<item[\s>][\s\S]*?<title>([\s\S]*?)<\/title>/)?.[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() || '';
    const dt = t.match(/<item[\s>][\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '';
    console.log(`${r.status} items=${items} desc=${desc.length} ${u}\n    ${dt} | ${ti.slice(0, 80)}\n    ${desc.slice(0, 160)}`);
  } catch (e) { console.log(`ERR ${e.message.slice(0, 60)} ${u}`); }
}
