/**
 * Score Snap — AI reading server (Cloudflare Worker)
 *
 * Holds the Anthropic API key so the public website never sees it.
 * Only accepts requests that come from your own website AND carry the class passcode.
 *
 * Settings (Cloudflare dashboard › Workers › score-snap-ai › Settings › Variables and Secrets):
 *   ANTHROPIC_API_KEY  (Secret)  your key from console.anthropic.com
 *   PASSCODE           (Secret)  the class passcode you give students
 *   ALLOWED_ORIGINS    (Text)    https://wanlopn-spec.github.io
 *   DAILY_LIMIT        (Text, optional)  max readings per day for everyone together, e.g. 200
 *   USAGE              (KV binding, optional)  needed only when DAILY_LIMIT is set
 */
const MODEL = 'claude-opus-5-5';
const MAX_TOKENS = 16000;
const MAX_IMAGES = 8;
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const MAX_PROMPT_CHARS = 200000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean);
    const originOk = allowed.includes(origin);
    const cors = {
      'Access-Control-Allow-Origin': originOk ? origin : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, x-passcode',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    };
    const fail = (status, code, message) => new Response(JSON.stringify({ error: { code, message } }),
      { status, headers: { ...cors, 'content-type': 'application/json' } });

    const url = new URL(req.url);
    if (req.method === 'GET' && url.pathname === '/') return new Response('Score Snap AI server is running.', { headers: cors });
    if (req.method === 'OPTIONS') return new Response(null, { status: originOk ? 204 : 403, headers: cors });
    if (!originOk) return fail(403, 'origin', 'This website is not allowed to use this server.');
    if (req.method !== 'POST' || url.pathname !== '/read') return fail(404, 'not_found', 'Use POST /read');
    if (!env.ANTHROPIC_API_KEY) return fail(500, 'server_key', 'ANTHROPIC_API_KEY is not set.');
    if (!env.PASSCODE || req.headers.get('x-passcode') !== env.PASSCODE) return fail(401, 'passcode', 'Wrong class passcode.');
    if ((+req.headers.get('content-length') || 0) > MAX_BODY_BYTES) return fail(413, 'too_large', 'Images are too large.');

    // optional shared daily limit
    if (env.USAGE && +env.DAILY_LIMIT > 0) {
      const day = new Date().toISOString().slice(0, 10), k = 'n:' + day;
      const n = +(await env.USAGE.get(k) || 0);
      if (n >= +env.DAILY_LIMIT) return fail(429, 'daily_limit', 'Daily limit reached.');
      await env.USAGE.put(k, String(n + 1), { expirationTtl: 60 * 60 * 48 });
    }

    let body;
    try { body = await req.json(); } catch { return fail(400, 'bad_json', 'Bad request.'); }
    const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, MAX_PROMPT_CHARS) : '';
    if (!prompt) return fail(400, 'no_prompt', 'Missing prompt.');
    const content = (Array.isArray(body.images) ? body.images : []).slice(0, MAX_IMAGES)
      .filter(i => i && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type) && typeof i.data === 'string')
      .map(i => ({ type: 'image', source: { type: 'base64', media_type: i.media_type, data: i.data } }));
    content.push({ type: 'text', text: prompt });

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, stream: true, messages: [{ role: 'user', content }] }),
    });
    // stream Anthropic's answer straight back (or its error body)
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, 'content-type': upstream.headers.get('content-type') || 'text/event-stream', 'cache-control': 'no-store' },
    });
  },
};
