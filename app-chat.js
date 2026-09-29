let cur = null; let curThread = 'main'; let genAbort = null; let generating = false;
function ensureThreads(cid) {
  var th = store.threads(cid);
  if (!th.length) { th = [{ id: 'main', title: 'Hauptchat', updated: Date.now(), tag: 'RP' }]; store.setThreads(cid, th); }
  return th;
}
function openChat(id, threadId) {
  cur = store.chars().find(function (c) { return c.id === id; }); if (!cur) return;
  var th = ensureThreads(id); curThread = threadId || th[0].id;
  hideAll(); var ch = document.getElementById('chat'); ch.classList.add('on'); ch.style.display = 'flex';
  var av = document.getElementById('cAv');
  if (cur.photo) { av.textContent = ''; av.style.backgroundImage = 'url(' + cur.photo + ')'; av.style.backgroundSize = 'cover'; }
  else { av.textContent = cur.emoji || '✨'; av.style.backgroundImage = ''; }
  document.getElementById('cName').textContent = cur.name;
  var tMeta = th.find(function (x) { return x.id === curThread; });
  document.getElementById('cSub').textContent = ((tMeta && tMeta.tag) ? '[' + tMeta.tag + '] ' : '') + ((tMeta && tMeta.title) || cur.short || '');
  var hist = store.chats(cur.id, curThread);
  if (!hist.length) { hist = [{ role: 'bot', text: cur.greeting, ts: Date.now() }]; store.setChats(cur.id, curThread, hist); }
  paintMsgs(hist); updateTokenBar(); updateSmartReplies(hist); haptic(); touchSession();
}
function openProfileFromChat() { if (!cur) return; window._prof = cur; hideAll(); document.getElementById('app').style.display = 'flex'; document.getElementById('app').classList.add('on'); render('profile'); }
function paintMsgs(hist) {
  var msgs = document.getElementById('msgs');
  msgs.innerHTML = hist.map(function (m, idx) {
    var tools = '';
    if (m.role === 'bot') tools = '<div class="msg-tools"><button type="button" onclick="regenMsg(' + idx + ')">Regenerieren</button><button type="button" onclick="editMsg(' + idx + ')">Bearbeiten</button><button type="button" onclick="delMsg(' + idx + ')">Loeschen</button></div>';
    else if (m.role === 'user') tools = '<div class="msg-tools"><button type="button" onclick="editMsg(' + idx + ')">Bearbeiten</button><button type="button" onclick="delMsg(' + idx + ')">Loeschen</button></div>';
    var ts = m.ts ? '<span class="ts">' + new Date(m.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + '</span>' : '';
    return '<div class="msg ' + (m.role === 'user' ? 'me' : 'bot') + '">' + fmt(m.text) + ts + tools + '</div>';
  }).join('');
  msgs.scrollTop = 99999;
}
function fmt(t) { return esc(t).replace(/\*([^*]+)\*/g, '<span class="act">*$1*</span>').replace(/\n/g, '<br>'); }
function updateTokenBar() {
  var el = document.getElementById('tokenBar'); if (!el) return;
  el.textContent = (VERBY_AI.hasAnyKey() ? ((VERBY_AI.isClaude() ? 'Claude' : 'ChatGPT') + ' · ' + VERBY_AI.model + ' · ' + (VERBY_AI.style || 'natural')) : 'Verby AI lokal') + ' · Credits: ' + (isDev() ? '∞' : store.credits());
}
function updateSmartReplies(hist) {
  var row = document.getElementById('smartRow'); if (!row) return;
  if (typeof flagOn === 'function' && !flagOn('smartReplies')) { row.innerHTML = ''; return; }
  var last = ''; for (var i = hist.length - 1; i >= 0; i--) { if (hist[i].role === 'bot') { last = hist[i].text; break; } }
  var suggestions = /\?|was|wie|warum/i.test(last) ? ['Erzaehl mir mehr', 'Ich bin mir nicht sicher', 'Was denkst du?'] : /hallo|hi|hey/i.test(last) ? ['Hallo! Wie gehts?', 'Hey!', '*winkt*'] : ['Das verstehe ich', '*nickt*', 'Und dann?'];
  row.innerHTML = suggestions.map(function (s) { return '<button class="chip" type="button" onclick="useSmartReply(this)">' + esc(s) + '</button>'; }).join('');
}
function useSmartReply(btn) { document.getElementById('inp').value = btn.textContent; document.getElementById('inp').focus(); }
function insertAction(a) { var inp = document.getElementById('inp'); inp.value = (inp.value ? inp.value + ' ' : '') + '*' + a + '*'; inp.focus(); }
function showChatMenu() {
  if (!cur) return;
  var th = ensureThreads(cur.id);
  var list = th.map(function (t, i) { return (i + 1) + '. ' + (t.id === curThread ? '→ ' : '') + t.title + (t.tag ? ' [' + t.tag + ']' : ''); }).join('\n');
  var choice = prompt('Chats:\n' + list + '\n\n"neu" | "tag" | Nummer:'); if (!choice) return;
  choice = choice.trim().toLowerCase();
  if (choice === 'neu' || choice === 'new') {
    var id = 't' + Date.now();
    th.unshift({ id: id, title: 'Chat ' + (th.length + 1), updated: Date.now(), tag: 'RP' });
    store.setThreads(cur.id, th);
    store.setChats(cur.id, id, [{ role: 'bot', text: cur.greeting, ts: Date.now() }]);
    openChat(cur.id, id); return;
  }
  if (choice === 'tag') {
    var tag = prompt('Tag (RP, Story, OOC…):', (th.find(function (x) { return x.id === curThread; }) || {}).tag || 'RP');
    if (tag == null) return;
    th.forEach(function (x) { if (x.id === curThread) x.tag = tag.trim(); });
    store.setThreads(cur.id, th); openChat(cur.id, curThread); return;
  }
  var n = parseInt(choice, 10); if (n >= 1 && n <= th.length) openChat(cur.id, th[n - 1].id);
}
function delMsg(idx) { if (!cur) return; var hist = store.chats(cur.id, curThread); if (idx < 0 || idx >= hist.length) return; hist.splice(idx, 1); store.setChats(cur.id, curThread, hist); paintMsgs(hist); updateSmartReplies(hist); }
function editMsg(idx) { if (!cur) return; var hist = store.chats(cur.id, curThread); if (idx < 0 || idx >= hist.length) return; var neu = prompt('Bearbeiten:', hist[idx].text); if (neu == null) return; hist[idx].text = neu; store.setChats(cur.id, curThread, hist); paintMsgs(hist); }
async function regenMsg(idx) {
  if (!cur || generating) return;
  var hist = store.chats(cur.id, curThread);
  if (idx < 0 || idx >= hist.length || hist[idx].role !== 'bot') return;
  var userText = ''; for (var i = idx - 1; i >= 0; i--) { if (hist[i].role === 'user') { userText = hist[i].text; break; } }
  if (!userText) return alert('Keine User-Nachricht davor');
  var slice = hist.slice(0, idx);
  document.getElementById('msgs').innerHTML += '<div class="typing-dots" id="ty"><span></span><span></span><span></span></div>';
  generating = true; showSkip(true);
  try { hist[idx].text = await openaiCharacterReply(cur, slice.concat([{ role: 'user', text: userText }])); hist[idx].ts = Date.now(); }
  catch (e) { hist[idx].text = characterReply(cur, slice, userText); }
  store.setChats(cur.id, curThread, hist); generating = false; showSkip(false); paintMsgs(hist); updateSmartReplies(hist);
}
function showSkip(on) { var b = document.getElementById('skipBtn'); if (b) b.style.display = on ? 'block' : 'none'; }
var _cb = document.getElementById('chatBack'); if (_cb) _cb.onclick = function () { enterApp(); };
var _cm = document.getElementById('chatMenuBtn'); if (_cm) _cm.onclick = function () { showChatMenu(); };
var _sd = document.getElementById('send'); if (_sd) _sd.onclick = sendMsg;
var _sk = document.getElementById('skipBtn'); if (_sk) _sk.onclick = function () { if (genAbort) try { genAbort.abort(); } catch (e) {} generating = false; showSkip(false); var ty = document.getElementById('ty'); if (ty) ty.remove(); };
var _inp = document.getElementById('inp'); if (_inp) _inp.onkeypress = function (e) { if (e.key === 'Enter') sendMsg(); };
async function sendMsg() {
  var t = document.getElementById('inp').value.trim(); if (!t || !cur || generating) return;
  if (!isDev() && store.credits() <= 0) return alert('Keine Credits mehr');
  document.getElementById('inp').value = ''; haptic(); touchSession();
  var hist = store.chats(cur.id, curThread);
  hist.push({ role: 'user', text: t, ts: Date.now() }); store.setChats(cur.id, curThread, hist); paintMsgs(hist);
  document.getElementById('msgs').innerHTML += '<div class="typing-dots" id="ty"><span></span><span></span><span></span></div>';
  generating = true; showSkip(true); genAbort = new AbortController(); var reply = '';
  try {
    reply = await openaiCharacterReply(cur, hist, genAbort.signal);
    if (!isDev()) store.setCredits(Math.max(0, store.credits() - 1));
    store.addXp(2);
    var st = store.stats(); st.msgs = (st.msgs || 0) + 1; store.setStats(st);
  } catch (e) {
    reply = e.name === 'AbortError' ? '*(Antwort abgebrochen)*' : characterReply(cur, hist, t);
  }
  generating = false; showSkip(false); var ty = document.getElementById('ty'); if (ty) ty.remove();
  hist = store.chats(cur.id, curThread);
  hist.push({ role: 'bot', text: reply, ts: Date.now() }); store.setChats(cur.id, curThread, hist);
  var th = ensureThreads(cur.id); th.forEach(function (x) { if (x.id === curThread) x.updated = Date.now(); }); store.setThreads(cur.id, th);
  paintMsgs(hist); updateTokenBar(); updateSmartReplies(hist);
}
function detectLang(text) {
  if (/[äöüß]/i.test(text) || /\b(ich|und|nicht|das|ist)\b/i.test(text)) return 'de';
  if (/\b(the|and|you|is|are)\b/i.test(text)) return 'en';
  return 'de';
}
function buildSystemPrompt(char, hist) {
  var styleMap = { natural: 'Antworte natuerlich.', short: 'Kurz (1-3 Saetze).', novel: 'Ausfuehrlicher, atmosphaerisch.', dramatic: 'Etwas dramatischer Ton.' };
  var lastUser = ''; for (var i = (hist || []).length - 1; i >= 0; i--) { if (hist[i].role === 'user') { lastUser = hist[i].text; break; } }
  var lang = detectLang(lastUser || 'de');
  var system = 'Du bist "' + char.name + '". Bleibe in der Rolle. *Aktionen*. Friendly. ' + (styleMap[VERBY_AI.style] || styleMap.natural);
  system += ' Sprache: ' + (lang === 'en' ? 'Englisch' : 'Deutsch') + '. Fact-Check: widersprich nicht der Lore.';
  if (char.short) system += ' Kurz: ' + char.short + '.';
  if (char.tags) system += ' Tags: ' + char.tags + '.';
  if (char.lore) system += ' Lorebook: ' + char.lore + '.';
  return system;
}
async function openaiCharacterReply(char, hist, signal) {
  if (!VERBY_AI.hasAnyKey()) throw new Error('Kein API-Key');
  var system = buildSystemPrompt(char, hist);
  if (VERBY_AI.isClaude()) return claudeCharacterReply(char, hist, system, signal);
  var messages = [];
  hist.slice(-16).forEach(function (m) { messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }); });
  var res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'openai', key: VERBY_AI.getOpenAIKey(), model: VERBY_AI.model, system: system, messages: messages, max_tokens: 450 }), signal: signal });
  if (!res.ok) throw new Error('OpenAI ' + res.status);
  var data = await res.json(); if (!data.text) throw new Error('Leer'); return data.text.trim();
}
async function claudeCharacterReply(char, hist, system, signal) {
  var key = VERBY_AI.getClaudeKey(); if (!key) throw new Error('Kein Claude Key');
  var messages = [];
  hist.slice(-16).forEach(function (m) { messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }); });
  if (!messages.length || messages[0].role !== 'user') messages.unshift({ role: 'user', content: '(Chat startet)' });
  var res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider: 'claude', key: key, model: VERBY_AI.model, system: system, messages: messages, max_tokens: 450 }), signal: signal });
  if (!res.ok) throw new Error('Claude ' + res.status);
  var data = await res.json(); if (!data.text) throw new Error('Leer'); return data.text.trim();
}
function characterReply(char, hist, userText) {
  var low = (userText || '').toLowerCase();
  if (char.lore && /(wer bist|erinner)/.test(low)) return '*laechelt*\n' + char.lore;
  if (/(wer bist|wie heisst)/.test(low)) return 'Ich bin ' + char.name + (char.short ? '. ' + char.short : '.');
  if (/\*[^*]+\*/.test(userText || '')) return '*reagiert*\nIch habe das bemerkt.';
  return 'Mhm. Erzaehl mir mehr.';
}
function peFlip() { window._peFlip = !window._peFlip; if (window._peRedraw) window._peRedraw(); }
function peSave() { var canvas = document.getElementById('peCanvas'); if (!canvas || !window._peImg) return alert('Erst Bild'); var g = store.gallery(); g.unshift({ name: 'Edit', photo: canvas.toDataURL('image/jpeg', 0.88) }); store.setGallery(g); alert('OK'); }
function peUseForChar() { var canvas = document.getElementById('peCanvas'); if (!canvas || !window._peImg) return alert('Erst Bild'); window._cPhotoData = canvas.toDataURL('image/jpeg', 0.88); alert('Foto gemerkt'); render('create'); }
window.addEventListener('online', function () { var b = document.getElementById('offlineBar'); if (b) b.classList.remove('on'); });
window.addEventListener('offline', function () { var b = document.getElementById('offlineBar'); if (b) b.classList.add('on'); });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js?v=' + (window.VERBY_VERSION || '6')).then(function (reg) { try { reg.update(); } catch (e) {} }).catch(function () {});
}
function runUpdateScreen(then) {
  var prev = localStorage.getItem('vb_app_version'); var ver = window.VERBY_VERSION || '0';
  if (prev === ver) { then(); return; }
  var ov = document.getElementById('updateOverlay'); var bar = document.getElementById('updateBar'); var sub = document.getElementById('updateSub');
  if (!ov) { then(); return; }
  ov.classList.add('on');
  if (sub) sub.textContent = 'v' + ver;
  var maxMs = 4000, start = Date.now();
  var timer = setInterval(function () {
    var p = Math.min(100, ((Date.now() - start) / maxMs) * 100);
    if (bar) bar.style.width = p + '%';
    if (p >= 100) { clearInterval(timer); localStorage.setItem('vb_app_version', ver); try { ensureForumSeed(); } catch (e) {} setTimeout(function () { ov.classList.remove('on'); then(); }, 100); }
  }, 50);
}
async function resolveAuthSession() {
  if (!sb) return !!store.user();
  try {
    var href = location.href;
    if (href.indexOf('code=') >= 0 || href.indexOf('access_token') >= 0) {
      try { await sb.auth.exchangeCodeForSession(href); } catch (e1) {}
      try { history.replaceState({}, document.title, location.pathname || '/'); } catch (e3) {}
    }
    for (var tries = 0; tries < 8; tries++) {
      var res = await sb.auth.getSession();
      if (res && res.data && res.data.session) { applySession(res.data.session); return true; }
      await new Promise(function (r) { setTimeout(r, 200); });
    }
  } catch (e) {}
  return !!store.user();
}
function wireAuthListener() {
  if (!sb || window._vbAuthWired) return;
  window._vbAuthWired = true;
  sb.auth.onAuthStateChange(function (event, session) {
    if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) {
      applySession(session); if (event === 'SIGNED_IN') enterApp();
    }
    if (event === 'SIGNED_OUT') { localStorage.removeItem('vb_user'); showLanding(); }
  });
}
function startAutoUpdateCheck() {
  var ver = window.VERBY_VERSION || '0';
  setInterval(function () {
    fetch('/index.html?vcheck=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (html) {
      var m = html.match(/VERBY_VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (m && m[1] && m[1] !== ver) { localStorage.setItem('vb_app_version', ''); location.reload(); }
    }).catch(function () {});
  }, 45000);
}
(async function boot() {
  runUpdateScreen(async function () {
    wireAuthListener();
    var ok = false;
    try { ok = await resolveAuthSession(); } catch (e) {}
    if ((ok || store.user()) && checkSessionTimeout()) enterApp();
    else if (!store.user()) showLanding();
    startAutoUpdateCheck();
  });
})();
