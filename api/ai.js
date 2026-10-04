export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const provider = body.provider || 'openai';
    const model = body.model || '';
    const system = body.system || '';
    const messages = body.messages || [];
    const max_tokens = body.max_tokens || 800;
    const stream = !!body.stream;

    if (provider === 'claude') {
      const k = body.key || process.env.ANTHROPIC_API_KEY || '';
      if (!k) return res.status(400).json({ error: 'Claude key missing (client or ANTHROPIC_API_KEY env)' });
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': k,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens,
          system,
          messages
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      const text = data.content && data.content[0] && data.content[0].text;
      return res.status(200).json({ text: text || '', source: body.key ? 'client' : 'server' });
    }

    const k = body.key || process.env.OPENAI_API_KEY || '';
    if (!k) return res.status(400).json({ error: 'OpenAI key missing (client or OPENAI_API_KEY env)' });
    const msgs = system ? [{ role: 'system', content: system }].concat(messages) : messages;

    if (stream) {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + k
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: msgs,
          temperature: 0.9,
          frequency_penalty: 0.4,
          max_tokens,
          stream: true
        })
      });
      if (!r.ok) {
        const err = await r.text();
        return res.status(r.status).json({ error: err.slice(0, 300) });
      }
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(dec.decode(value, { stream: true }));
      }
      return res.end();
    }

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + k
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: msgs,
        temperature: 0.9,
        frequency_penalty: 0.4,
        max_tokens
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return res.status(200).json({ text: text || '', source: body.key ? 'client' : 'server' });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
