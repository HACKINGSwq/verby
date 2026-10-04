/* Verby v7.9 — Chat + Character.AI pipeline: streaming, memory, server-keys, offline fallback */
let cur = null, curThread = 'main', genAbort = null, generating = false;

function ensureThreads(cid) {
  var th = store.threads(cid);
  if (!th.length) {
    th = [{ id: 'main', title: 'Hauptchat', updated: Date.now() }];
    store.setThreads(cid, th);
  }
  return th;
}

function openChat(id, threadId) {
  cur = store.chars().find(function (c) { return c.id === id; });
  if (!cur) return;
  var th = ensureThreads(id);
  curThread = threadId || th[0].id;
  hideAll();
  var ch = document.getElementById('chat');
  ch.classList.add('on');
  ch.style.display = 'flex';
  var av = document.getElementById('cAv');
  if (cur.photo) {
    av.textContent = '';
    av.style.backgroundImage = 'url(' + cur.photo + ')';
  } else {
    av.textContent = cur.emoji || '✨';
    av.style.backgroundImage = '';
  }
  document.getElementById('cName').textContent = cur.name;
  var tMeta = th.find(function (x) { return x.id === curThread; });
  document.getElementById('cSub').textContent = (tMeta && tMeta.title) || cur.short || 'Online';
  var hist = store.chats(cur.id, curThread);
  if (!hist.length) {
    hist = [{ role: 'bot', text: cur.greeting, ts: Date.now() }];
    store.setChats(cur.id, curThread, hist);
  }
  paintMsgs(hist);
  updateSmart(hist);
  haptic();
}

function openProfileFromChat() {
  if (!cur) return;
  window._prof = cur;
  hideAll();
  document.getElementById('app').classList.add('on');
  document.getElementById('app').style.display = 'flex';
  render('profile');
}

function paintMsgs(hist) {
  var msgs = document.getElementById('msgs');
  msgs.innerHTML = hist.map(function (m, idx) {
    var tools = m.role === 'bot'
      ? '<div class="msg-tools"><button type="button" onclick="regenMsg(' + idx + ')">Regen</button><button type="button" onclick="delMsg(' + idx + ')">Del</button></div>'
      : '<div class="msg-tools"><button type="button" onclick="delMsg(' + idx + ')">Del</button></div>';
    return '<div class="msg ' + (m.role === 'user' ? 'me' : 'bot') + '">' + fmt(m.text) + tools + '</div>';
  }).join('');
  msgs.scrollTop = 99999;
}

function fmt(t) {
  return esc(t).replace(/\*([^*]+)\*/g, '<span class="act">*$1*</span>').replace(/\n/g, '<br>');
}

function updateSmart(hist) {
  var row = document.getElementById('smartRow');
  if (!row) return;
  var last = '';
  for (var i = hist.length - 1; i >= 0; i--) if (hist[i].role === 'bot') { last = hist[i].text; break; }
  var s = /\?/.test(last) ? ['Erzähl mehr', 'Ich bin unsicher', 'Und du?'] : ['Das verstehe ich', '*nickt*', 'Weiter'];
  row.innerHTML = s.map(function (x) {
    return '<button class="chip" type="button" onclick="document.getElementById(\'inp\').value=this.textContent">' + esc(x) + '</button>';
  }).join('');
}

function insertAction(a) {
  var inp = document.getElementById('inp');
  inp.value = (inp.value ? inp.value + ' ' : '') + '*' + a + '*';
  inp.focus();
}

function showChatMenu() {
  if (!cur) return;
  var th = ensureThreads(cur.id);
  var list = th.map(function (t, i) {
    return (i + 1) + '. ' + (t.id === curThread ? '→ ' : '') + t.title;
  }).join('\n');
  var choice = prompt('Chats:\n' + list + '\n\n"neu" oder Nummer:');
  if (!choice) return;
  choice = choice.trim().toLowerCase();
  if (choice === 'neu') {
    var id = 't' + Date.now();
    th.unshift({ id: id, title: 'Chat ' + (th.length + 1), updated: Date.now() });
    store.setThreads(cur.id, th);
    store.setChats(cur.id, id, [{ role: 'bot', text: cur.greeting, ts: Date.now() }]);
    openChat(cur.id, id);
    return;
  }
  var n = parseInt(choice, 10);
  if (n >= 1 && n <= th.length) openChat(cur.id, th[n - 1].id);
}

function delMsg(idx) {
  if (!cur) return;
  var hist = store.chats(cur.id, curThread);
  hist.splice(idx, 1);
  store.setChats(cur.id, curThread, hist);
  paintMsgs(hist);
}

async function regenMsg(idx) {
  if (!cur || generating) return;
  var hist = store.chats(cur.id, curThread);
  if (!hist[idx] || hist[idx].role !== 'bot') return;
  var userText = '';
  for (var i = idx - 1; i >= 0; i--) if (hist[i].role === 'user') { userText = hist[i].text; break; }
  if (!userText) return;
  generating = true;
  try {
    hist[idx].text = await characterAI(cur, hist.slice(0, idx).concat([{ role: 'user', text: userText }]));
  } catch (e) {
    hist[idx].text = localReply(cur, userText);
  }
  generating = false;
  store.setChats(cur.id, curThread, hist);
  paintMsgs(hist);
}

document.getElementById('chatBack').onclick = function () { enterApp(); render('chats'); };
document.getElementById('chatMenuBtn').onclick = showChatMenu;
document.getElementById('send').onclick = sendMsg;
document.getElementById('skipBtn').onclick = function () {
  if (genAbort) try { genAbort.abort(); } catch (e) {}
  generating = false;
  document.getElementById('skipBtn').style.display = 'none';
};
document.getElementById('inp').onkeypress = function (e) { if (e.key === 'Enter') sendMsg(); };

async function sendMsg() {
  var t = document.getElementById('inp').value.trim();
  if (!t || !cur || generating) return;
  if (!isDev() && store.credits() <= 0) return alert('Keine Credits');
  document.getElementById('inp').value = '';
  haptic();
  var hist = store.chats(cur.id, curThread);
  hist.push({ role: 'user', text: t, ts: Date.now() });
  store.setChats(cur.id, curThread, hist);
  paintMsgs(hist);
  var msgs = document.getElementById('msgs');
  msgs.innerHTML += '<div class="typing" id="ty">schreibt…</div>';
  msgs.scrollTop = 99999;
  generating = true;
  document.getElementById('skipBtn').style.display = 'block';
  genAbort = new AbortController();
  var reply = '';
  try {
    reply = await characterAI(cur, hist, genAbort.signal, function (partial) {
      var ty = document.getElementById('ty');
      if (ty) ty.innerHTML = fmt(partial);
      msgs.scrollTop = 99999;
    });
    if (!isDev()) store.setCredits(Math.max(0, store.credits() - 1));
    store.addXp(2);
    maybeUpdateMemory(cur, hist.concat([{ role: 'bot', text: reply }]));
  } catch (e) {
    reply = e.name === 'AbortError' ? '*(abgebrochen)*' : localReply(cur, t);
  }
  generating = false;
  document.getElementById('skipBtn').style.display = 'none';
  var ty = document.getElementById('ty');
  if (ty) ty.remove();
  hist = store.chats(cur.id, curThread);
  hist.push({ role: 'bot', text: reply, ts: Date.now() });
  store.setChats(cur.id, curThread, hist);
  var th = ensureThreads(cur.id);
  th.forEach(function (x) { if (x.id === curThread) x.updated = Date.now(); });
  store.setThreads(cur.id, th);
  paintMsgs(hist);
  updateSmart(hist);
}

function buildCAIPrompt(char, hist) {
  var styleMap = {
    novel: 'Write vivid, immersive replies (2-5 short paragraphs). Advance the scene. Use *actions* naturally. Stay in character always.',
    natural: 'Natural conversational replies, 2-4 sentences. Stay in character.',
    short: 'Keep replies to 1-3 sentences. Stay in character.',
    dramatic: 'Slightly dramatic tone, still fully in character.'
  };
  var lastUser = ((hist || []).slice().reverse().find(function (m) { return m.role === 'user'; }) || {}).text || '';
  var lang = /[äöüß]|\b(ich|und|das|nicht|bin|hast)\b/i.test(lastUser) ? 'German' : "the user's language";
  var system = 'You ARE "' + char.name + '". Never break character. Never say you are an AI, language model, or assistant. ';
  system += 'Respond in ' + lang + '. ';
  system += (styleMap[VERBY_AI.style] || styleMap.novel) + ' ';
  system += 'Do not only ask questions — react, feel, act. Avoid repeating the same phrases. ';
  system += 'Friendly mode: no explicit sexual content. ';
  if (char.short) system += 'Tagline: ' + char.short + '. ';
  if (char.tags) system += 'Personality tags: ' + char.tags + '. ';
  if (char.lore) system += 'Lorebook (canon facts — never contradict): ' + char.lore + '. ';
  var mem = store.memory(char.id);
  if (mem) system += 'Session memory summary: ' + mem + '. ';
  if (char.greeting) system += 'Greeting style reference: ' + char.greeting;
  return system;
}

async function characterAI(char, hist, signal, onPartial) {
  var system = buildCAIPrompt(char, hist);
  var messages = [];
  hist.slice(-24).forEach(function (m) {
    messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
  });
  var provider = VERBY_AI.isClaude() ? 'claude' : 'openai';
  var key = VERBY_AI.isClaude() ? VERBY_AI.getClaudeKey() : VERBY_AI.getOpenAIKey();
  var useStream = provider === 'openai' && typeof onPartial === 'function';

  if (useStream) {
    try {
      var res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'openai',
          key: key || undefined,
          model: VERBY_AI.model,
          system: system,
          messages: messages,
          max_tokens: 900,
          stream: true
        }),
        signal: signal
      });
      if (res.ok) {
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var full = '';
        var buf = '';
        while (true) {
          var chunk = await reader.read();
          if (chunk.done) break;
          buf += dec.decode(chunk.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop() || '';
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line.indexOf('data:') !== 0) continue;
            var data = line.replace(/^data:\s?/, '');
            if (data === '[DONE]') continue;
            try {
              var j = JSON.parse(data);
              var delta = j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content;
              if (delta) {
                full += delta;
                if (onPartial) onPartial(full);
              }
            } catch (e) {}
          }
        }
        if (full) return full.trim();
      }
    } catch (e) {
      if (e.name === 'AbortError') throw e;
    }
  }
  return characterAINoStream(char, hist, system, messages, signal);
}

async function characterAINoStream(char, hist, system, messages, signal) {
  var provider = VERBY_AI.isClaude() ? 'claude' : 'openai';
  var key = VERBY_AI.isClaude() ? VERBY_AI.getClaudeKey() : VERBY_AI.getOpenAIKey();
  var msgs = messages || [];
  if (!messages) {
    msgs = [];
    hist.slice(-24).forEach(function (m) {
      msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
    });
  }
  if (provider === 'claude' && (!msgs.length || msgs[0].role !== 'user')) {
    msgs = [{ role: 'user', content: '(scene continues)' }].concat(msgs);
  }
  var res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider: provider,
      key: key || undefined,
      model: VERBY_AI.model,
      system: system || buildCAIPrompt(char, hist),
      messages: msgs,
      max_tokens: 900
    }),
    signal: signal
  });
  if (!res.ok) {
    var err = await res.text();
    throw new Error(err.slice(0, 180));
  }
  var data = await res.json();
  if (!data.text) throw new Error('empty');
  return data.text.trim();
}

function maybeUpdateMemory(char, hist) {
  if (hist.length < 10 || hist.length % 14 !== 0) return;
  var slice = hist.slice(-14).map(function (m) {
    return (m.role === 'user' ? 'User: ' : char.name + ': ') + m.text;
  }).join('\n').slice(0, 1400);
  var prev = store.memory(char.id);
  var summary = (prev ? prev + ' | ' : '') + slice.slice(0, 500);
  store.setMemory(char.id, summary.slice(-1000));
}

function localReply(char, userText) {
  var low = (userText || '').toLowerCase();
  if (char.lore && /wer bist|erinner/.test(low)) return '*' + char.name + ' denkt nach*\n' + char.lore.slice(0, 300);
  if (/\*[^*]+\*/.test(userText || '')) return '*erwidert die Geste*\nIch habe das bemerkt.';
  return '*' + (char.name || 'sie') + ' lächelt*\n' + (char.short || 'Erzähl mir mehr davon.') + ' Was bedeutet das für dich?';
}

window.addEventListener('online', function () {
  var b = document.getElementById('offlineBar');
  if (b) b.classList.remove('on');
});
window.addEventListener('offline', function () {
  var b = document.getElementById('offlineBar');
  if (b) b.classList.add('on');
});
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js?v=7.9').catch(function () {});
}

function runUpdateScreen(then) {
  var prev = localStorage.getItem('vb_app_version');
  var ver = window.VERBY_VERSION || '0';
  if (prev === ver) return then();
  var ov = document.getElementById('updateOverlay');
  var bar = document.getElementById('updateBar');
  if (!ov) return then();
  ov.classList.add('on');
  var start = Date.now(), maxMs = 2800;
  var t = setInterval(function () {
    var p = Math.min(100, ((Date.now() - start) / maxMs) * 100);
    if (bar) bar.style.width = p + '%';
    if (p >= 100) {
      clearInterval(t);
      localStorage.setItem('vb_app_version', ver);
      try { ensureForumSeed(); } catch (e) {}
      setTimeout(function () { ov.classList.remove('on'); then(); }, 80);
    }
  }, 40);
}

async function resolveAuth() {
  if (!sb) return !!store.user();
  try {
    if (location.href.indexOf('code=') >= 0) {
      try { await sb.auth.exchangeCodeForSession(location.href); } catch (e) {}
      try { history.replaceState({}, '', location.pathname || '/'); } catch (e) {}
    }
    for (var i = 0; i < 6; i++) {
      var r = await sb.auth.getSession();
      if (r.data && r.data.session) { applySession(r.data.session); return true; }
      await new Promise(function (x) { setTimeout(x, 180); });
    }
  } catch (e) {}
  return !!store.user();
}

(async function boot() {
  runUpdateScreen(async function () {
    if (sb) {
      sb.auth.onAuthStateChange(function (ev, session) {
        if (session && (ev === 'SIGNED_IN' || ev === 'TOKEN_REFRESHED' || ev === 'INITIAL_SESSION')) {
          applySession(session);
          if (ev === 'SIGNED_IN') enterApp();
        }
        if (ev === 'SIGNED_OUT') { localStorage.removeItem('vb_user'); showLanding(); }
      });
    }
    var ok = await resolveAuth();
    if (ok || store.user()) enterApp();
    else showLanding();
  });
})();
