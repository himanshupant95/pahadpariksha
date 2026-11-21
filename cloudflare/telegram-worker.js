// Cloudflare Worker — instant Telegram webhook for the Pahad Pariksha review bot.
// Receives the owner's Telegram messages, answers /help at once, acknowledges commands within a second
// and starts the GitHub workflow (.github/workflows/telegram.yml), which applies the change, rebuilds the
// site and replies "✅ साइट अपडेट हो गई".
//
// Worker secrets/variables (Settings → Variables and Secrets):
//   BOT_TOKEN       Telegram bot token (from @BotFather)                         — secret
//   CHAT_ID         your Telegram chat id (the only chat obeyed)                  — variable
//   GH_TOKEN        GitHub fine-grained token: repo pahadpariksha, Contents: Read and write — secret
//   WEBHOOK_SECRET  any long random text (protects the webhook and /setup)        — secret
//   GH_REPO         himanshupant95/pahadpariksha                                 — variable
//   CONTEST         KV namespace binding (Settings → Bindings → KV namespace)    — stores quiz-contest answers
// One-time: open https://<your-worker>.workers.dev/setup?key=<WEBHOOK_SECRET> to connect Telegram.
//
// Quiz contest (scripts/contest.mjs): the bot posts non-anonymous quiz polls in the discussion group;
// Telegram sends each answer here as a poll_answer update and it is kept in KV (60 days).
// GET /contest?key=<sha256(BOT_TOKEN + ':contest')>&polls=<id,id,…> returns the answers; &ensure=1 first
// makes sure the webhook also receives poll_answer updates (no manual /setup needed after this change).

const HELP = 'सुधार के आदेश (एक पंक्ति में एक; एक संदेश में कई भी चलेंगे):\n' +
  '/remove P2 — पूरा बिंदु हटाएँ\n/remove P2.3 — तथ्य हटाएँ\n/remove P2.Q — प्रश्न हटाएँ\n/edit P2 नया शीर्षक\n/edit P2.3 नया पाठ\n' +
  '/edit P2.S … — "क्या हुआ"\n/edit P2.Q … — प्रश्न\n/edit P2.A … — उत्तर\n/add P2 बजट: 450 करोड़ रुपये — नया तथ्य (कोई भी शीर्षक)\n/add P2 स्थायी पिरान कलियर: हरिद्वार ज़िला — 📚 स्थायी ज्ञान\n/ok — सब ठीक है\n' +
  'साइट लगभग 1–2 मिनट में अपडेट होती है; पूरा होने पर बॉट बताएगा।';

export default {
  async fetch(req, env0) {
    // values pasted into the dashboard often carry a stray space/newline — trim them all
    const env = Object.fromEntries(Object.entries(env0).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    const url = new URL(req.url);
    const tg = (method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => r.json());
    const UPDATES = ['message', 'poll_answer'];

    // quiz contest: read stored answers (called by GitHub Actions)
    if (url.pathname === '/contest') {
      const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
      const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.BOT_TOKEN}:contest`));
      const want = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
      if (url.searchParams.get('key') !== want) return json({ ok: false, error: 'bad key' }, 403);
      if (!env.CONTEST) return json({ ok: false, error: 'KV binding CONTEST missing' }, 500);
      if (url.searchParams.get('ensure')) {
        const info = await tg('getWebhookInfo', {});
        const have = info.result?.allowed_updates || [];
        if (info.result?.url && !UPDATES.every((u) => have.includes(u))) {
          const r = await tg('setWebhook', { url: info.result.url, secret_token: env.WEBHOOK_SECRET, allowed_updates: UPDATES });
          if (!r.ok) return json({ ok: false, error: `setWebhook: ${r.description}` }, 500);
        }
        if (!info.result?.url) return json({ ok: false, error: 'webhook not set — open /setup first' }, 500);
      }
      const answers = {};
      for (const poll of (url.searchParams.get('polls') || '').split(',').filter(Boolean)) {
        answers[poll] = [];
        let cursor;
        do {
          const page = await env.CONTEST.list({ prefix: `a:${poll}:`, cursor });
          for (const k of page.keys) answers[poll].push({ uid: k.name.split(':')[2], ...(k.metadata || {}) });
          cursor = page.list_complete ? undefined : page.cursor;
        } while (cursor);
      }
      return json({ ok: true, answers });
    }

    // one-time setup: point Telegram at this Worker
    if (url.pathname === '/setup') {
      const key = (url.searchParams.get('key') || '').trim();
      const plain = { 'content-type': 'text/plain; charset=utf-8' };
      if (!env.WEBHOOK_SECRET) return new Response('❌ WEBHOOK_SECRET सेट नहीं है (Settings → Variables and Secrets)।', { status: 403, headers: plain });
      if (!/^[A-Za-z0-9_-]+$/.test(env.WEBHOOK_SECRET)) return new Response('❌ WEBHOOK_SECRET में केवल अंग्रेज़ी अक्षर, अंक, _ और - हो सकते हैं।', { status: 403, headers: plain });
      if (key !== env.WEBHOOK_SECRET) return new Response(`❌ key मेल नहीं खाती — लिंक में ${key.length} अक्षर हैं, सेव किए गए WEBHOOK_SECRET में ${env.WEBHOOK_SECRET.length}।`, { status: 403, headers: plain });
      const missing = ['BOT_TOKEN', 'CHAT_ID', 'GH_TOKEN', 'GH_REPO'].filter((k) => !env[k]);
      if (missing.length) return new Response(`❌ ये सेटिंग्स नहीं मिलीं: ${missing.join(', ')}`, { status: 500, headers: plain });
      const r = await tg('setWebhook', { url: `${url.origin}/hook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: UPDATES, drop_pending_updates: true });
      return new Response(r.ok ? '✅ Telegram webhook जुड़ गया। अब बॉट को /help भेजें।' : `❌ Telegram: ${r.description} (BOT_TOKEN जाँचें)`, { headers: plain });
    }

    if (url.pathname !== '/hook' || req.method !== 'POST') return new Response('ok');
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });

    const update = await req.json().catch(() => ({}));
    const pa = update.poll_answer;
    if (pa?.user && env.CONTEST) {
      const key = `a:${pa.poll_id}:${pa.user.id}`;
      if (!pa.option_ids?.length) await env.CONTEST.delete(key);
      else {
        const n = [pa.user.first_name, pa.user.last_name].filter(Boolean).join(' ').slice(0, 60);
        await env.CONTEST.put(key, '', { expirationTtl: 60 * 864e2, metadata: { o: pa.option_ids, t: Date.now(), n, u: pa.user.username || '' } });
      }
      return new Response('ok');
    }
    const m = update.message;
    if (!m?.text) return new Response('ok');
    if (m.chat.type !== 'private') return new Response('ok'); // group/channel messages: stay silent
    if (String(m.chat.id) !== String(env.CHAT_ID)) {
      await tg('sendMessage', { chat_id: m.chat.id, text: `यह निजी बॉट है। (आपकी Chat ID: ${m.chat.id})` });
      return new Response('ok');
    }
    const text = m.text.trim();
    if (/^\/(start|help)\b/i.test(text)) { await tg('sendMessage', { chat_id: m.chat.id, text: HELP }); return new Response('ok'); }
    if (!text.startsWith('/')) { await tg('sendMessage', { chat_id: m.chat.id, text: 'आदेश / से शुरू करें — /help देखें।' }); return new Response('ok'); }

    const gh = await fetch(`https://api.github.com/repos/${env.GH_REPO}/dispatches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'pahadpariksha-telegram-worker', 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'telegram', client_payload: { text, message_id: m.message_id } }),
    });
    await tg('sendMessage', {
      chat_id: m.chat.id, reply_to_message_id: m.message_id,
      text: gh.status === 204 ? '⏳ मिला — लागू हो रहा है (1–2 मिनट)…' : `❌ GitHub ने मना किया (HTTP ${gh.status}) — GH_TOKEN जाँचें।`,
    });
    return new Response('ok'); // always 200 so Telegram doesn't resend
  },
};
