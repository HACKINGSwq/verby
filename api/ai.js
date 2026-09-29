export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const provider = body.provider || 'openai';
    const key = body.key || '';
    const model = body.model || '';
    const system = body.system || '';
    const messages = body.messages || [];

    if (!key) return res.status(400).json({ error: 'key missing' });

    if (provider === 'claude') {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: model || 'claude-sonnet-4-20250514',
          max_tokens: body.max_tokens || 450,
          system: system,
          messages: messages
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      const text = data.content && data.content[0] && data.content[0].text;
      return res.status(200).json({ text: text || '', raw: data });
    }

    const msgs = system ? [{ role: 'system', content: system }].concat(messages) : messages;
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: msgs,
        temperature: 0.85,
        max_tokens: body.max_tokens || 450
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    const text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    return res.status(200).json({ text: text || '', raw: data });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
