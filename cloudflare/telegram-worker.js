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
// One-time: open https://<your-worker>.workers.dev/setup?key=<WEBHOOK_SECRET> to connect Telegram.

const HELP = 'सुधार के आदेश (एक पंक्ति में एक; एक संदेश में कई भी चलेंगे):\n' +
  '/remove P2 — पूरा बिंदु हटाएँ\n/remove P2.3 — उप-बिंदु हटाएँ\n/edit P2 नया शीर्षक\n/edit P2.3 नया पाठ\n/ok — सब ठीक है\n' +
  'साइट लगभग 1–2 मिनट में अपडेट होती है; पूरा होने पर बॉट बताएगा।';

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const tg = (method, body) => fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => r.json());

    // one-time setup: point Telegram at this Worker
    if (url.pathname === '/setup') {
      if (url.searchParams.get('key') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });
      const r = await tg('setWebhook', { url: `${url.origin}/hook`, secret_token: env.WEBHOOK_SECRET, allowed_updates: ['message'], drop_pending_updates: true });
      return new Response(r.ok ? '✅ Telegram webhook जुड़ गया। अब बॉट को /help भेजें।' : `❌ ${r.description}`, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
    }

    if (url.pathname !== '/hook' || req.method !== 'POST') return new Response('ok');
    if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('forbidden', { status: 403 });

    const update = await req.json().catch(() => ({}));
    const m = update.message;
    if (!m?.text) return new Response('ok');
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
