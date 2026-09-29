let cur = null; let curThread = 'main'; let genAbort = null; let generating = false;
function ensureThreads(cid) { var th = store.threads(cid); if (!th.length) { th = [{ id: 'main', title: 'Hauptchat', updated: Date.now() }]; store.setThreads(cid, th); } return th; }
function openChat(id, threadId) {
  cur = store.chars().find(function (c) { return c.id === id; }); if (!cur) return;
  var th = ensureThreads(id); curThread = threadId || th[0].id;
  hideAll(); const ch = document.getElementById('chat'); ch.classList.add('on'); ch.style.display = 'flex';
  const av = document.getElementById('cAv');
  if (cur.photo) { av.textContent = ''; av.style.backgroundImage = 'url(' + cur.photo + ')'; av.style.backgroundSize = 'cover'; } else { av.textContent = cur.emoji || '✨'; av.style.backgroundImage = ''; }
  document.getElementById('cName').textContent = cur.name;
  var tMeta = th.find(function (x) { return x.id === curThread; });
  document.getElementById('cSub').textContent = (tMeta && tMeta.title) || cur.short || cur.category || '';
  let hist = store.chats(cur.id, curThread);
  if (!hist.length) { hist = [{ role: 'bot', text: cur.greeting }]; store.setChats(cur.id, curThread, hist); }
  paintMsgs(hist); updateTokenBar(); haptic();
}
function openProfileFromChat() { if (!cur) return; window._prof = cur; hideAll(); document.getElementById('app').style.display = 'flex'; document.getElementById('app').classList.add('on'); render('profile'); }
function paintMsgs(hist) {
  const msgs = document.getElementById('msgs');
  msgs.innerHTML = hist.map(function (m, idx) {
    var tools = '';
    if (m.role === 'bot') tools = '<div class="msg-tools"><button type="button" onclick="regenMsg(' + idx + ')">Regenerieren</button><button type="button" onclick="editMsg(' + idx + ')">Bearbeiten</button><button type="button" onclick="delMsg(' + idx + ')">Loeschen</button></div>';
    else if (m.role === 'user') tools = '<div class="msg-tools"><button type="button" onclick="editMsg(' + idx + ')">Bearbeiten</button><button type="button" onclick="delMsg(' + idx + ')">Loeschen</button></div>';
    return '<div class="msg ' + (m.role === 'user' ? 'me' : 'bot') + '">' + fmt(m.text) + tools + '</div>';
  }).join('');
  msgs.scrollTop = 99999;
}
function fmt(t) { return esc(t).replace(/\*([^*]+)\*/g, '<span class="act">*$1*</span>').replace(/\n/g, '<br>'); }
function updateTokenBar() { var el = document.getElementById('tokenBar'); if (!el) return; el.textContent = (VERBY_AI.hasAnyKey() ? ((VERBY_AI.isClaude() ? 'Claude' : 'ChatGPT') + ' · ' + VERBY_AI.model) : 'Verby AI lokal') + ' · Credits: ' + (isDev() ? '∞' : store.credits()); }
function showChatMenu() {
  if (!cur) return; var th = ensureThreads(cur.id);
  var list = th.map(function (t, i) { return (i + 1) + '. ' + (t.id === curThread ? '→ ' : '') + t.title; }).join('\n');
  var choice = prompt('Chats:\n' + list + '\n\n"neu" fuer neuen Chat, oder Nummer:'); if (!choice) return;
  choice = choice.trim().toLowerCase();
  if (choice === 'neu' || choice === 'new') { var id = 't' + Date.now(); th.unshift({ id: id, title: 'Chat ' + (th.length + 1), updated: Date.now() }); store.setThreads(cur.id, th); store.setChats(cur.id, id, [{ role: 'bot', text: cur.greeting }]); openChat(cur.id, id); return; }
  var n = parseInt(choice, 10); if (n >= 1 && n <= th.length) openChat(cur.id, th[n - 1].id);
}
function delMsg(idx) { if (!cur) return; var hist = store.chats(cur.id, curThread); if (idx < 0 || idx >= hist.length) return; hist.splice(idx, 1); store.setChats(cur.id, curThread, hist); paintMsgs(hist); }
function editMsg(idx) { if (!cur) return; var hist = store.chats(cur.id, curThread); if (idx < 0 || idx >= hist.length) return; var neu = prompt('Nachricht bearbeiten:', hist[idx].text); if (neu == null) return; hist[idx].text = neu; store.setChats(cur.id, curThread, hist); paintMsgs(hist); }
async function regenMsg(idx) {
  if (!cur || generating) return; var hist = store.chats(cur.id, curThread); if (idx < 0 || idx >= hist.length || hist[idx].role !== 'bot') return;
  var userText = ''; for (var i = idx - 1; i >= 0; i--) { if (hist[i].role === 'user') { userText = hist[i].text; break; } }
  if (!userText) return alert('Keine User-Nachricht davor');
  var slice = hist.slice(0, idx); document.getElementById('msgs').innerHTML += '<div class="typing-dots" id="ty"><span></span><span></span><span></span></div>'; generating = true; showSkip(true);
  try { hist[idx].text = await openaiCharacterReply(cur, slice.concat([{ role: 'user', text: userText }])); } catch (e) { hist[idx].text = characterReply(cur, slice, userText); }
  store.setChats(cur.id, curThread, hist); generating = false; showSkip(false); paintMsgs(hist);
}
function showSkip(on) { var b = document.getElementById('skipBtn'); if (b) b.style.display = on ? 'block' : 'none'; }
document.getElementById('chatBack').onclick = function () { enterApp(); };
document.getElementById('chatMenuBtn').onclick = function () { showChatMenu(); };
document.getElementById('send').onclick = sendMsg;
document.getElementById('skipBtn').onclick = function () { if (genAbort) { try { genAbort.abort(); } catch (e) {} } generating = false; showSkip(false); var ty = document.getElementById('ty'); if (ty) ty.remove(); };
document.getElementById('inp').onkeypress = function (e) { if (e.key === 'Enter') sendMsg(); };
async function sendMsg() {
  const t = document.getElementById('inp').value.trim(); if (!t || !cur || generating) return;
  if (!isDev() && store.credits() <= 0) return alert('Keine Credits mehr');
  document.getElementById('inp').value = ''; haptic();
  let hist = store.chats(cur.id, curThread); hist.push({ role: 'user', text: t }); store.setChats(cur.id, curThread, hist); paintMsgs(hist);
  document.getElementById('msgs').innerHTML += '<div class="typing-dots" id="ty"><span></span><span></span><span></span></div>'; document.getElementById('msgs').scrollTop = 99999;
  generating = true; showSkip(true); genAbort = new AbortController(); var reply = '';
  try { reply = await openaiCharacterReply(cur, hist, genAbort.signal); if (!isDev()) store.setCredits(Math.max(0, store.credits() - 1)); store.addXp(2); }
  catch (e) { console.warn('AI fallback', e); reply = e.name === 'AbortError' ? '*(Antwort abgebrochen)*' : characterReply(cur, hist, t); }
  generating = false; showSkip(false); var ty = document.getElementById('ty'); if (ty) ty.remove();
  hist = store.chats(cur.id, curThread); hist.push({ role: 'bot', text: reply }); store.setChats(cur.id, curThread, hist);
  var th = ensureThreads(cur.id); th.forEach(function (x) { if (x.id === curThread) x.updated = Date.now(); }); store.setThreads(cur.id, th);
  paintMsgs(hist); updateTokenBar();
}
function buildSystemPrompt(char) {
  var system = 'Du bist der Charakter "' + char.name + '". Du bleibst IMMER in der Rolle. Antworte natuerlich, lebendig und auf Deutsch. Nutze *Sternchen* fuer Aktionen. Keine Meta-Kommentare als KI. Friendly-Modus: keine expliziten sexuellen Inhalte.';
  if (char.short) system += ' Kurzbeschreibung: ' + char.short + '.';
  if (char.tags) system += ' Tags: ' + char.tags + '.';
  if (char.lore) system += ' Lore/Memory: ' + char.lore + '.';
  if (char.greeting) system += ' Typische Begruessung: ' + char.greeting;
  return system;
}
async function openaiCharacterReply(char, hist, signal) {
  if (!VERBY_AI.hasAnyKey()) throw new Error('Kein API-Key');
  var system = buildSystemPrompt(char);
  if (VERBY_AI.isClaude()) return claudeCharacterReply(char, hist, system, signal);
  var messages = [];
  hist.slice(-16).forEach(function (m) { messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }); });
  var res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'openai', key: VERBY_AI.getOpenAIKey(), model: VERBY_AI.model, system: system, messages: messages, max_tokens: 450 }),
    signal: signal
  });
  if (!res.ok) throw new Error('OpenAI ' + res.status + ': ' + (await res.text()).slice(0, 200));
  var data = await res.json();
  if (!data.text) throw new Error('Leere Antwort');
  return data.text.trim();
}
async function claudeCharacterReply(char, hist, system, signal) {
  var key = VERBY_AI.getClaudeKey();
  if (!key) throw new Error('Kein Claude Key');
  var messages = [];
  hist.slice(-16).forEach(function (m) { messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }); });
  if (!messages.length || messages[0].role !== 'user') messages.unshift({ role: 'user', content: '(Chat startet)' });
  var res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'claude', key: key, model: VERBY_AI.model, system: system, messages: messages, max_tokens: 450 }),
    signal: signal
  });
  if (!res.ok) throw new Error('Claude ' + res.status + ': ' + (await res.text()).slice(0, 220));
  var data = await res.json();
  if (!data.text) throw new Error('Leere Claude-Antwort');
  return data.text.trim();
}
function characterReply(char, hist, userText) {
  var low = (userText || '').toLowerCase(); var tags = (char.tags || '').toLowerCase(); var lore = char.lore || ''; var name = char.name; var short = char.short || '';
  if (lore && /(wer bist|erinner|weißt du|memory|ueber dich|stell dich)/.test(low)) return buildInVoice(char, lore + (short ? '\n' + short : ''));
  if (/(wer bist|wie heisst|wie heißt)/.test(low)) return buildInVoice(char, 'Ich bin ' + name + (short ? '. ' + short : '.') + (tags ? ' Man beschreibt mich oft als: ' + char.tags + '.' : ''));
  if (/\*[^*]+\*/.test(userText || '')) return reactToAction(char, userText);
  if (/\?/.test(userText || '')) return buildInVoice(char, 'Gute Frage. Als ' + name + ': Was denkst *du* dazu?');
  var openers = /freundlich|warm/.test(tags) ? ['Das verstehe ich.', 'Danke, dass du das teilst.'] : /trocken|sarkast/.test(tags) ? ['Interessant.', 'Okay, notiert.'] : ['Mhm.', 'Ich hoere.'];
  var opener = openers[Math.floor(Math.random() * openers.length)];
  var follow = ['Was bedeutet das fuer dich?', 'Wie fuehlt sich das an?', 'Und was kommt als Naechstes?'];
  var pick = follow[Math.floor(Math.random() * follow.length)];
  var words = (userText || '').split(/\s+/).filter(function (w) { return w.length > 3; }).slice(0, 3);
  var ref = words.length ? ' Du hast „' + words.join(' ') + '“ angesprochen — ' : ' ';
  return buildInVoice(char, opener + ref + pick);
}
function buildInVoice(char, content) { var tags = (char.tags || '').toLowerCase(); if (/trocken|sarkast/.test(tags)) return content.replace(/\.$/, '') + '. Mehr muss man dazu nicht sagen.'; if (/freundlich|warm/.test(tags)) return '*laechelt*\n' + content; if (/mysteri|dunkel/.test(tags)) return '…' + content; return content; }
function reactToAction(char, userText) { var act = (userText.match(/\*([^*]+)\*/g) || []).map(function (x) { return x.replace(/\*/g, ''); }).join(', '); if (/schlag|slap|hit/i.test(act)) return '*weicht leicht aus*\nHey — alles gut bei dir?'; if (/umarm|hug/i.test(act)) return '*erwidert die Geste vorsichtig*\nDas ist unerwartet.'; return '*reagiert auf: ' + act + '*\nIch habe das bemerkt.'; }
function peFlip() { window._peFlip = !window._peFlip; if (window._peRedraw) window._peRedraw(); }
function peSave() { var canvas = document.getElementById('peCanvas'); if (!canvas || !window._peImg) return alert('Erst Bild laden'); var g = store.gallery(); g.unshift({ name: 'Edit ' + new Date().toLocaleTimeString('de-DE'), photo: canvas.toDataURL('image/jpeg', 0.88), emoji: '🖼️' }); store.setGallery(g); alert('Gespeichert'); }
function peUseForChar() { var canvas = document.getElementById('peCanvas'); if (!canvas || !window._peImg) return alert('Erst Bild laden'); window._cPhotoData = canvas.toDataURL('image/jpeg', 0.88); alert('Foto gemerkt'); render('create'); }
document.querySelectorAll('.nb[data-v]').forEach(function (b) { b.onclick = function () { haptic(); render(b.dataset.v); }; });
window.addEventListener('online', function () { document.getElementById('offlineBar').classList.remove('on'); });
window.addEventListener('offline', function () { document.getElementById('offlineBar').classList.add('on'); });
if (!navigator.onLine) document.getElementById('offlineBar').classList.add('on');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js?v=' + (window.VERBY_VERSION || '5.2')).then(function (reg) {
    try { reg.update(); } catch (e) {}
    setInterval(function () { try { reg.update(); } catch (e) {} }, 60000);
  }).catch(function () {});
}
function runUpdateScreen(then) {
  const prev = localStorage.getItem('vb_app_version'); const ver = window.VERBY_VERSION || '0'; if (prev === ver) { then(); return; }
  const ov = document.getElementById('updateOverlay'); const bar = document.getElementById('updateBar'); const sub = document.getElementById('updateSub');
  if (!ov) { then(); return; } ov.classList.add('on');
  if (sub) { var log = (window.VERBY_CHANGELOG || [])[0]; sub.textContent = 'v' + ver + (log ? ' · ' + log.t.slice(0, 40) + '…' : ''); }
  const maxMs = 5000, start = Date.now();
  const timer = setInterval(function () {
    const elapsed = Date.now() - start; let p = Math.min(100, (elapsed / maxMs) * 100); if (elapsed > 800) p = Math.min(100, p + 15);
    if (bar) bar.style.width = p + '%';
    if (p >= 100 || elapsed >= maxMs) { clearInterval(timer); if (bar) bar.style.width = '100%'; localStorage.setItem('vb_app_version', ver); try { ensureForumSeed(); } catch (e) {} setTimeout(function () { ov.classList.remove('on'); then(); }, 150); }
  }, 70);
}
async function resolveAuthSession() {
  if (!sb) return !!store.user();
  try {
    var href = window.location.href;
    if (href.indexOf('code=') >= 0 || href.indexOf('access_token') >= 0 || href.indexOf('error=') >= 0) {
      try { await sb.auth.exchangeCodeForSession(href); } catch (e1) { try { await sb.auth.getSession(); } catch (e2) {} }
      try { window.history.replaceState({}, document.title, window.location.pathname || '/'); } catch (e3) {}
    }
    var tries = 0;
    while (tries < 8) {
      var res = await sb.auth.getSession();
      if (res && res.data && res.data.session) { applySession(res.data.session); return true; }
      tries++;
      await new Promise(function (r) { setTimeout(r, 200); });
    }
  } catch (e) { console.warn('auth resolve', e); }
  return !!store.user();
}
function wireAuthListener() {
  if (!sb || window._vbAuthWired) return;
  window._vbAuthWired = true;
  sb.auth.onAuthStateChange(function (event, session) {
    if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
      applySession(session);
      if (event === 'SIGNED_IN') enterApp();
    }
    if (event === 'SIGNED_OUT') { localStorage.removeItem('vb_user'); showLanding(); }
  });
}
function startAutoUpdateCheck() {
  var ver = window.VERBY_VERSION || '0';
  setInterval(function () {
    fetch('/index.html?vcheck=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var m = html.match(/VERBY_VERSION\s*=\s*['"]([^'"]+)['"]/);
        if (m && m[1] && m[1] !== ver) {
          localStorage.setItem('vb_app_version', '');
          if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
          }
          location.reload();
        }
      }).catch(function () {});
  }, 45000);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', function () { location.reload(); });
  }
}
(async function boot() {
  runUpdateScreen(async function () {
    wireAuthListener();
    var ok = false;
    try { ok = await resolveAuthSession(); } catch (e) { console.warn(e); }
    if (ok || store.user()) enterApp();
    else showLanding();
    startAutoUpdateCheck();
  });
})();
