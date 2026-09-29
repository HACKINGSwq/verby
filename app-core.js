const DEV = 'ninofox015@gmail.com';
const VERBY_AI = {
  model: localStorage.getItem('vb_ai_model') || 'gpt-4o-mini',
  getOpenAIKey: function () { return localStorage.getItem('vb_openai_key') || ''; },
  setOpenAIKey: function (k) { if (k) localStorage.setItem('vb_openai_key', k.trim()); else localStorage.removeItem('vb_openai_key'); },
  getClaudeKey: function () { return localStorage.getItem('vb_claude_key') || ''; },
  setClaudeKey: function (k) { if (k) localStorage.setItem('vb_claude_key', k.trim()); else localStorage.removeItem('vb_claude_key'); },
  setModel: function (m) { this.model = m; localStorage.setItem('vb_ai_model', m); },
  isClaude: function (m) { m = m || this.model; return String(m).indexOf('claude') === 0; },
  hasAnyKey: function () { if (this.isClaude()) return !!this.getClaudeKey(); return !!this.getOpenAIKey(); }
};
const VERBY_OPENAI = VERBY_AI;
const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'ChatGPT · GPT-4o mini', provider: 'openai' },
  { id: 'gpt-4o', label: 'ChatGPT · GPT-4o', provider: 'openai' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude · Sonnet 4', provider: 'claude' },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude · Haiku 3.5 (schnell)', provider: 'claude' }
];
const CATS = ['Alle', 'Fantasy', 'Romance', 'Sci-Fi', 'Horror', 'Slice of Life', 'Abenteuer'];
const store = {
  user: () => JSON.parse(localStorage.getItem('vb_user') || 'null'),
  setUser: (u) => localStorage.setItem('vb_user', JSON.stringify(u)),
  chars: () => JSON.parse(localStorage.getItem('vb_chars') || '[]'),
  setChars: (c) => localStorage.setItem('vb_chars', JSON.stringify(c)),
  flags: () => JSON.parse(localStorage.getItem('vb_flags') || '{"devs":[],"frames":{},"audit":[]}'),
  setFlags: (f) => localStorage.setItem('vb_flags', JSON.stringify(f)),
  users: () => JSON.parse(localStorage.getItem('vb_users') || '[]'),
  setUsers: (u) => localStorage.setItem('vb_users', JSON.stringify(u)),
  threads: (cid) => JSON.parse(localStorage.getItem('vb_threads_' + cid) || '[]'),
  setThreads: (cid, t) => localStorage.setItem('vb_threads_' + cid, JSON.stringify(t)),
  chats: (cid, tid) => JSON.parse(localStorage.getItem('vb_chat_' + cid + '_' + (tid || 'main')) || '[]'),
  setChats: (cid, tid, m) => localStorage.setItem('vb_chat_' + cid + '_' + (tid || 'main'), JSON.stringify(m.slice(-150))),
  notifs: () => JSON.parse(localStorage.getItem('vb_notifs') || '[]'),
  setNotifs: (n) => localStorage.setItem('vb_notifs', JSON.stringify(n.slice(0, 50))),
  theme: () => localStorage.getItem('vb_theme') || 'dark',
  setTheme: (t) => localStorage.setItem('vb_theme', t),
  gallery: () => JSON.parse(localStorage.getItem('vb_gallery') || '[]'),
  setGallery: (g) => localStorage.setItem('vb_gallery', JSON.stringify(g.slice(0, 40))),
  forum: () => JSON.parse(localStorage.getItem('vb_forum') || 'null'),
  setForum: (f) => localStorage.setItem('vb_forum', JSON.stringify(f)),
  favs: () => JSON.parse(localStorage.getItem('vb_favs') || '[]'),
  setFavs: (f) => localStorage.setItem('vb_favs', JSON.stringify(f)),
  credits: () => { const u = store.user(); if (u && isDev(u)) return 999999; return parseInt(localStorage.getItem('vb_credits') || '100', 10); },
  setCredits: (n) => localStorage.setItem('vb_credits', String(n)),
  level: () => parseInt(localStorage.getItem('vb_level') || '1', 10),
  xp: () => parseInt(localStorage.getItem('vb_xp') || '0', 10),
  addXp: (n) => { let xp = store.xp() + n; let lvl = store.level(); while (xp >= lvl * 50) { xp -= lvl * 50; lvl++; } localStorage.setItem('vb_xp', String(xp)); localStorage.setItem('vb_level', String(lvl)); }
};
function isDev(u) { u = u || store.user(); if (!u) return false; const f = store.flags(); return (u.email || '').toLowerCase() === DEV || (f.devs || []).includes((u.email || '').toLowerCase()); }
function esc(t) { const d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
function haptic() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
function applyTheme() { document.documentElement.setAttribute('data-theme', store.theme() === 'light' ? 'light' : 'dark'); }
applyTheme();
(function purgeAdult() { try { localStorage.removeItem('vb_mode'); const f = store.flags(); if (f.nsfw) { delete f.nsfw; store.setFlags(f); } store.setChars(store.chars().map(function (c) { c.nsfw = false; return c; })); } catch (e) {} })();
let sb = null;
try { if (window.supabase && window.VERBY_SB) { sb = window.supabase.createClient(window.VERBY_SB.url, window.VERBY_SB.key, { auth: { detectSessionInUrl: true, flowType: 'pkce', persistSession: true, autoRefreshToken: true, storage: window.localStorage } }); } } catch (e) { console.warn(e); }
function redirectTo() { return window.location.origin + (window.location.pathname || '/'); }
async function oauthLogin(provider) {
  if (!sb) return alert('Supabase nicht geladen');
  try {
    const { error } = await sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: redirectTo(), queryParams: { access_type: 'offline', prompt: 'select_account' } } });
    if (error) throw error;
  } catch (e) { alert(provider + ': ' + (e.message || e)); }
}
async function loginEmail() {
  const emailEl = document.getElementById('a-email'); const nameEl = document.getElementById('a-name'); const passEl = document.getElementById('a-pass');
  const email = (emailEl && emailEl.value || '').trim().toLowerCase();
  const name = (nameEl && nameEl.value || '').trim() || (email.split('@')[0] || 'User');
  const pass = passEl && passEl.value || '';
  if (!email.includes('@')) return alert('E-Mail noetig');
  if (!pass || pass.length < 6) return alert('Passwort min. 6 Zeichen');
  if (!sb) return alert('Supabase nicht geladen');
  try {
    let session = null;
    const signIn = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (!signIn.error && signIn.data.session) session = signIn.data.session;
    else {
      const signUp = await sb.auth.signUp({ email: email, password: pass, options: { data: { name: name }, emailRedirectTo: redirectTo() } });
      if (signUp.error) throw signUp.error;
      session = signUp.data.session;
      if (!session) { alert('Account erstellt. Bitte ggf. E-Mail bestaetigen.'); return; }
    }
    applySession(session); haptic(); enterApp();
  } catch (e) { alert('Login: ' + (e.message || e)); }
}
function applySession(session) {
  if (!session || !session.user) return;
  const u = session.user;
  const nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name || u.user_metadata.user_name)) || (u.email && u.email.split('@')[0]) || 'User';
  store.setUser({ email: u.email || (nm + '@oauth.user'), name: nm, frame: null, id: u.id });
  const users = store.users();
  if (!users.find(function (x) { return x.id === u.id || x.email === u.email; })) {
    users.push({ email: u.email, name: nm, created: Date.now(), frame: null, id: u.id });
    store.setUsers(users);
  }
}
function hideAll() {
  ['landing', 'auth', 'app', 'chat', 'page'].forEach(function (id) {
    const e = document.getElementById(id); if (!e) return; e.classList.remove('on'); e.style.display = 'none';
  });
}
function showLanding() {
  if (store.user()) { enterApp(); return; }
  if (window.location.href.indexOf('code=') >= 0 || window.location.href.indexOf('access_token') >= 0) return;
  hideAll(); const e = document.getElementById('landing'); e.classList.add('on'); e.style.display = 'block';
}
function goAuth() {
  if (store.user()) { enterApp(); return; }
  if (window.location.href.indexOf('code=') >= 0) return;
  hideAll(); const e = document.getElementById('auth'); e.classList.add('on'); e.style.display = 'grid';
}
function enterApp() { hideAll(); ensureForumSeed(); const e = document.getElementById('app'); e.classList.add('on'); e.style.display = 'flex'; render('home'); }
function showPage(which) {
  hideAll(); const el = document.getElementById('page'); el.classList.add('on'); el.style.display = 'block';
  const back = '<button class="btn btn-g" type="button" onclick="' + (store.user() ? 'enterApp()' : 'showLanding()') + '">← Zurueck</button>';
  if (which === 'updates') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Changelog</h1>' + (window.VERBY_CHANGELOG || []).map(function (x) {
      return '<div class="card"><h3>v' + esc(x.v) + '</h3><p class="muted">' + esc(x.t) + '</p>' + (x.detail ? '<p style="margin-top:8px;font-size:14px;line-height:1.5">' + esc(x.detail) + '</p>' : '') + '</div>';
    }).join('');
  } else if (which === 'about') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Ueber Verby</h1><div class="card"><p>Friendly Character-Chat mit Verby AI (ChatGPT + Claude).</p></div>';
  } else if (which === 'safety') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Safety Center</h1><div class="card"><p>Friendly-Modus. Respektvoll chatten.</p></div>';
  } else if (which === 'help') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Hilfe</h1><div class="card"><p><b>Login:</b> Nur Google — einmal reicht, Session bleibt.</p><p style="margin-top:8px"><b>Updates:</b> laden automatisch, kein Ctrl+Shift+R noetig.</p><p style="margin-top:8px"><b>AI:</b> Settings → Keys speichern.</p></div>';
  }
}
function frameClass(u) { if (!u) return ''; const f = store.flags().frames || {}; const fr = u.frame || f[(u.email || '').toLowerCase()]; return fr ? 'frame-' + fr : ''; }
function pushNotif(title, body) { const n = store.notifs(); n.unshift({ id: Date.now(), title: title, body: body, ts: Date.now() }); store.setNotifs(n); }
function audit(action, detail) { const f = store.flags(); f.audit = f.audit || []; f.audit.unshift({ ts: Date.now(), action: action, detail: detail || '', by: (store.user() || {}).email }); f.audit = f.audit.slice(0, 100); store.setFlags(f); }
function ensureForumSeed() {
  var data = store.forum(); var ver = window.VERBY_VERSION || '0';
  if (!data) data = { categories: [{ id: 'updates', name: 'Updates', desc: 'Ankuendigungen.' }, { id: 'changelogs', name: 'Changelogs & Functions', desc: 'Releases.' }, { id: 'community', name: 'Community Discussion', desc: 'Feedback.' }], threads: [], posts: {}, seededVersion: null };
  (window.VERBY_CHANGELOG || []).slice().reverse().forEach(function (log) {
    if (data.threads.some(function (t) { return t.version === log.v; })) return;
    var tid = 't_' + log.v.replace(/\./g, '_'); var now = Date.now();
    data.threads.unshift({ id: tid, cat: 'changelogs', title: 'Verby v' + log.v + ' — ' + log.t, author: 'Discobot', bot: true, version: log.v, pinned: log.v === ver, ts: now, replies: 1, likes: 0 });
    data.posts[tid] = [{ id: 'p' + now, author: 'Discobot', bot: true, ts: now, body: 'Hallo,\n\nv' + log.v + ': ' + log.t + '\n\n' + (log.detail || '') + '\n\n— Discobot' }];
  });
  data.seededVersion = ver; store.setForum(data); return data;
}
function forumData() { return ensureForumSeed(); }
function renderForumList(catId) {
  var data = forumData();
  var threads = data.threads.filter(function (t) { return !catId || t.cat === catId; });
  threads.sort(function (a, b) { if (a.pinned && !b.pinned) return -1; if (!a.pinned && b.pinned) return 1; return b.ts - a.ts; });
  if (!threads.length) return '<div class="empty">Noch keine Threads.</div>';
  return threads.map(function (t) {
    var when = new Date(t.ts).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '<div class="forum-thread" onclick="openForumThread(\'' + t.id + '\')"><div><div class="tt">' + (t.pinned ? '📌 ' : '') + esc(t.title) + '</div><div class="muted" style="margin-top:4px">' + esc(t.author) + (t.bot ? ' · Bot' : '') + '</div></div><div class="meta">' + when + '</div></div>';
  }).join('');
}
function openForumThread(tid) { window._forumThread = tid; render('forum-thread'); }
function render(view) {
  document.querySelectorAll('.nb[data-v]').forEach(function (b) { b.classList.toggle('on', b.dataset.v === view || (view === 'forum-thread' && b.dataset.v === 'forum') || (view === 'profile' && b.dataset.v === 'explore')); });
  const root = document.getElementById('view'); if (!root) return;
  root.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  setTimeout(function () { renderReal(view); }, 100);
}
function renderReal(view) {
  const root = document.getElementById('view'); const u = store.user(); if (!root || !u) return;
  const cred = store.credits(); const lvl = store.level();
  if (view === 'home') {
    const list = store.chars();
    root.innerHTML = '<div class="card row glass"><div class="avatar ' + frameClass(u) + '">' + (u.name || '?')[0].toUpperCase() + '</div><div class="grow"><div class="h2">Hey, ' + esc(u.name) + '</div><div class="muted">Lvl ' + lvl + ' · Credits: ' + (isDev() ? '∞' : cred) + '</div></div></div><div class="section-title">Deine Charaktere</div>' + (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Noch keine Charaktere.</div>');
  }
  if (view === 'explore') {
    const cat = window._cat || 'Alle'; let list = store.chars();
    if (cat !== 'Alle') list = list.filter(function (c) { return (c.category || 'Fantasy') === cat; });
    root.innerHTML = '<div class="h2">Explore</div><div class="cat-row">' + CATS.map(function (c) { return '<button class="cat ' + (c === cat ? 'on' : '') + '" type="button" onclick="window._cat=\'' + c + '\';render(\'explore\')">' + c + '</button>'; }).join('') + '</div>' + (list.length ? list.map(function (c) { return charCard(c, true); }).join('') : '<div class="empty">Nichts hier.</div>');
  }
  if (view === 'favs') {
    const ids = store.favs(); const list = store.chars().filter(function (c) { return ids.indexOf(c.id) >= 0; });
    root.innerHTML = '<div class="h2">Favoriten</div>' + (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Keine Favoriten.</div>');
  }
  if (view === 'forum') {
    var data = forumData(); var tab = window._forumTab || 'home';
    var tabs = '<div class="forum-tabs"><button class="forum-tab ' + (tab === 'home' ? 'on' : '') + '" type="button" onclick="window._forumTab=\'home\';render(\'forum\')">Uebersicht</button>' + data.categories.map(function (c) { return '<button class="forum-tab ' + (tab === c.id ? 'on' : '') + '" type="button" onclick="window._forumTab=\'' + c.id + '\';render(\'forum\')">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    if (tab === 'home') root.innerHTML = '<div class="forum-wrap"><div class="h2">Verby Forum</div>' + tabs + data.categories.map(function (c) { return '<div class="forum-cat"><div class="forum-cat-h"><h3>' + esc(c.name) + '</h3><p>' + esc(c.desc) + '</p></div>' + renderForumList(c.id) + '</div>'; }).join('') + '</div>';
    else { var cat = data.categories.find(function (c) { return c.id === tab; }); root.innerHTML = '<div class="forum-wrap"><div class="h2">' + esc(cat ? cat.name : 'Forum') + '</div>' + tabs + '<div class="forum-cat">' + renderForumList(tab) + '</div></div>'; }
  }
  if (view === 'forum-thread') {
    var data = forumData(); var t = data.threads.find(function (x) { return x.id === window._forumThread; }); var posts = (data.posts[window._forumThread] || []);
    if (!t) { root.innerHTML = '<div class="empty">Nicht gefunden.</div>'; return; }
    root.innerHTML = '<button class="btn btn-g" type="button" onclick="render(\'forum\')">← Forum</button><h2 style="margin:14px 0 8px;font-size:20px">' + esc(t.title) + '</h2>' + posts.map(function (p) { return '<div class="forum-post"><b>' + esc(p.author) + '</b>' + (p.bot ? '<span class="bot-badge">BOT</span>' : '') + '<div class="body">' + esc(p.body) + '</div></div>'; }).join('') + '<div class="card" style="margin-top:12px"><div class="form-g"><label>Antwort</label><textarea id="forumReply"></textarea></div><button class="btn btn-p" type="button" onclick="postForumReply(\'' + t.id + '\')">Senden</button></div>';
  }
  if (view === 'create') {
    root.innerHTML = '<div class="card glass"><div class="h2">Charakter erstellen</div><div class="form-g"><label>Profilbild</label><div class="row"><div class="avatar lg" id="cPreview" style="width:72px;height:72px">✨</div><div class="grow"><input type="file" id="cPhoto" accept="image/*"></div></div></div><div class="form-g"><label>Name *</label><input id="cn"></div><div class="form-g"><label>Begruessung *</label><textarea id="cg"></textarea></div><div class="form-g"><label>Tags</label><input id="ctags"></div><div class="form-g"><label>Kurzbeschreibung</label><input id="cs"></div><div class="form-g"><label>Lore</label><textarea id="cl"></textarea></div><div class="form-g"><label>Kategorie</label><select id="cc">' + CATS.filter(function (c) { return c !== 'Alle'; }).map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div><button class="btn btn-p" type="button" onclick="saveChar()">Speichern</button></div>';
    window._cPhotoData = null;
    var finp = document.getElementById('cPhoto');
    if (finp) finp.onchange = function (e) { var f = e.target.files && e.target.files[0]; if (!f || f.size > 2.5 * 1024 * 1024) return alert('Max 2,5 MB'); var reader = new FileReader(); reader.onload = function () { window._cPhotoData = reader.result; var prev = document.getElementById('cPreview'); if (prev) { prev.textContent = ''; prev.style.backgroundImage = 'url(' + reader.result + ')'; prev.style.backgroundSize = 'cover'; } }; reader.readAsDataURL(f); };
  }
  if (view === 'photo') {
    root.innerHTML = '<div class="card glass"><div class="h2">Photo Editor</div><div class="form-g"><input type="file" id="peFile" accept="image/*"></div><canvas id="peCanvas" style="max-width:100%;border-radius:12px;border:1px solid var(--b);display:none;margin:8px 0"></canvas><div class="form-g"><label>Helligkeit</label><input type="range" id="peBright" min="50" max="150" value="100"></div><div class="form-g"><label>Kontrast</label><input type="range" id="peContrast" min="50" max="150" value="100"></div><div class="form-g"><label>Saettigung</label><input type="range" id="peSat" min="0" max="200" value="100"></div><button class="btn btn-g" type="button" onclick="peFlip()">Spiegeln</button> <button class="btn btn-p" type="button" onclick="peSave()">Gallery</button> <button class="btn btn-g" type="button" onclick="peUseForChar()">Fuer Charakter</button></div>';
    window._peImg = null; window._peFlip = false;
    function peRedraw() { var canvas = document.getElementById('peCanvas'); if (!canvas || !window._peImg) return; var img = window._peImg; var b = (document.getElementById('peBright').value || 100) / 100; var c = (document.getElementById('peContrast').value || 100) / 100; var s = (document.getElementById('peSat').value || 100) / 100; var maxW = Math.min(560, root.clientWidth - 40); var scale = Math.min(1, maxW / img.width); canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.style.display = 'block'; var ctx = canvas.getContext('2d'); ctx.save(); ctx.filter = 'brightness(' + b + ') contrast(' + c + ') saturate(' + s + ')'; if (window._peFlip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } ctx.drawImage(img, 0, 0, canvas.width, canvas.height); ctx.restore(); }
    window._peRedraw = peRedraw;
    document.getElementById('peFile').onchange = function (e) { var f = e.target.files && e.target.files[0]; if (!f) return; var reader = new FileReader(); reader.onload = function () { var img = new Image(); img.onload = function () { window._peImg = img; peRedraw(); }; img.src = reader.result; }; reader.readAsDataURL(f); };
    ['peBright', 'peContrast', 'peSat'].forEach(function (id) { var el = document.getElementById(id); if (el) el.oninput = peRedraw; });
  }
  if (view === 'download') {
    root.innerHTML = '<div class="h2">Download</div><div class="card"><p class="muted">PWA: Browser → Zum Home-Bildschirm.</p><button class="btn btn-g" type="button" onclick="showPage(\'help\')">Hilfe</button></div>';
  }
  if (view === 'dev') {
    if (!isDev()) { root.innerHTML = '<div class="empty">Kein Dev-Zugriff.</div>'; return; }
    root.innerHTML = '<div class="card glass"><div class="h2">Dev Panel</div><p class="muted">Credits: ∞</p><div class="form-g"><label>E-Mail</label><input id="de"></div><button class="btn btn-p" type="button" onclick="devAction(\'dev\')">Zum Dev</button> <button class="btn btn-d" type="button" onclick="devAction(\'undev\')">Entziehen</button><button class="btn btn-d" type="button" onclick="devWipeChars()">Chars loeschen</button></div>';
  }
  if (view === 'settings') {
    var hasKey = VERBY_AI.isClaude() ? !!VERBY_AI.getClaudeKey() : !!VERBY_AI.getOpenAIKey(); var th = store.theme();
    root.innerHTML = '<div class="card glass"><div class="h2">Settings</div><p class="muted">' + esc(u.email || '') + '</p><p class="muted">v' + esc(window.VERBY_VERSION || '') + ' · Credits: ' + (isDev() ? '∞' : cred) + '</p><div class="form-g" style="margin-top:14px"><label>Theme</label><select id="themeSel"><option value="dark"' + (th === 'dark' ? ' selected' : '') + '>Dunkel</option><option value="light"' + (th === 'light' ? ' selected' : '') + '>Hell</option></select></div><button class="btn btn-g" type="button" onclick="saveTheme()">Theme speichern</button><div class="form-g" style="margin-top:14px"><label>ChatGPT / OpenAI Key</label><input id="oakey" type="password" placeholder="sk-proj-..." autocomplete="off"></div><div class="form-g"><label>Claude Key</label><input id="clkey" type="password" placeholder="sk-ant-..." autocomplete="off"></div><div class="form-g"><label>AI-Modell</label><select id="aimodel">' + AI_MODELS.map(function (m) { return '<option value="' + m.id + '"' + (VERBY_AI.model === m.id ? ' selected' : '') + '>' + m.label + '</option>'; }).join('') + '</select></div><button class="btn btn-p" type="button" onclick="saveOpenAIKey()">Keys & Modell speichern</button> <button class="btn btn-d" type="button" onclick="clearOpenAIKey()">Keys loeschen</button><p class="muted" style="margin-top:8px;font-size:12px">' + (hasKey ? 'Key aktiv' : 'Kein Key — Verby AI lokal') + '</p><button class="btn btn-g" style="width:100%;margin-top:12px" type="button" onclick="showPage(\'updates\')">Changelog</button><button class="btn btn-d" style="width:100%;margin-top:12px" type="button" onclick="logout()">Logout</button></div>';
  }
  if (view === 'profile' && window._prof) {
    const c = window._prof; var isFav = store.favs().indexOf(c.id) >= 0;
    var avHtml = c.photo ? '<div class="avatar lg glow" style="margin:0 auto 12px;background-image:url(' + c.photo + ');background-size:cover"></div>' : '<div class="avatar lg glow" style="margin:0 auto 12px">' + (c.emoji || '✨') + '</div>';
    root.innerHTML = '<div style="text-align:center">' + avHtml + '<div class="h2">' + esc(c.name) + '</div><p class="muted">' + esc(c.short || '') + '</p><button class="btn btn-p" type="button" onclick="openChat(\'' + c.id + '\')">Chat</button> <button class="btn btn-g" type="button" onclick="toggleFav(\'' + c.id + '\')">' + (isFav ? '★' : '☆') + '</button> <button class="btn btn-d" type="button" onclick="deleteChar(\'' + c.id + '\')">Loeschen</button></div>';
  }
}
function charCard(c, withProf) {
  const click = withProf ? "window._prof=store.chars().find(function(x){return x.id==='" + c.id + "'});render('profile')" : "openChat('" + c.id + "')";
  var avStyle = c.photo ? ' style="background-image:url(' + c.photo + ');background-size:cover"' : '';
  var avInner = c.photo ? '' : (c.emoji || '✨');
  var fav = store.favs().indexOf(c.id) >= 0 ? ' ★' : '';
  return '<div class="card row" onclick="' + click + '"><div class="avatar"' + avStyle + '>' + avInner + '</div><div class="grow"><b>' + esc(c.name) + fav + '</b><div class="muted">' + esc(c.short || c.category || '') + '</div></div></div>';
}
function saveChar() {
  const name = document.getElementById('cn').value.trim(); const greeting = document.getElementById('cg').value.trim();
  if (!name || !greeting) return alert('Name + Begruessung');
  const list = store.chars();
  const item = { id: 'c' + Date.now(), name: name, greeting: greeting, short: document.getElementById('cs').value.trim(), lore: document.getElementById('cl').value.trim(), tags: (document.getElementById('ctags') && document.getElementById('ctags').value.trim()) || '', category: document.getElementById('cc').value, emoji: '✨', photo: window._cPhotoData || null, owner: store.user().email };
  list.unshift(item); store.setChars(list);
  store.setThreads(item.id, [{ id: 'main', title: 'Hauptchat', updated: Date.now() }]);
  store.setChats(item.id, 'main', [{ role: 'bot', text: greeting }]);
  window._cPhotoData = null; store.addXp(10); haptic(); alert('Gespeichert'); render('home');
}
function deleteChar(id) { if (!confirm('Charakter loeschen?')) return; store.setChars(store.chars().filter(function (c) { return c.id !== id; })); store.setFavs(store.favs().filter(function (x) { return x !== id; })); audit('delete_char', id); render('home'); }
function toggleFav(id) { var f = store.favs(); var i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); store.setFavs(f); if (window._prof && window._prof.id === id) render('profile'); else render('favs'); }
function postForumReply(tid) {
  var text = (document.getElementById('forumReply') && document.getElementById('forumReply').value || '').trim();
  if (!text) return alert('Text eingeben');
  var data = forumData(); data.posts[tid] = data.posts[tid] || [];
  data.posts[tid].push({ id: 'p' + Date.now(), author: (store.user() || {}).name || 'User', bot: false, ts: Date.now(), body: text });
  store.setForum(data); openForumThread(tid);
}
function devAction(type) { const e = document.getElementById('de').value.trim().toLowerCase(); if (!e) return alert('E-Mail'); const f = store.flags(); f.devs = f.devs || []; if (type === 'dev' && f.devs.indexOf(e) < 0) f.devs.push(e); if (type === 'undev') f.devs = f.devs.filter(function (x) { return x !== e; }); store.setFlags(f); audit(type, e); alert('OK'); render('dev'); }
function devWipeChars() { if (!confirm('Alle loeschen?')) return; store.setChars([]); render('dev'); }
async function logout() { try { if (sb) await sb.auth.signOut(); } catch (e) {} localStorage.removeItem('vb_user'); showLanding(); }
function saveTheme() { store.setTheme(document.getElementById('themeSel').value); applyTheme(); alert('OK'); }
function saveOpenAIKey() {
  var ok = (document.getElementById('oakey') && document.getElementById('oakey').value || '').trim();
  var ck = (document.getElementById('clkey') && document.getElementById('clkey').value || '').trim();
  var m = document.getElementById('aimodel').value;
  if (ok) { if (ok.indexOf('sk-') !== 0) return alert('OpenAI Key: sk-...'); VERBY_AI.setOpenAIKey(ok); }
  if (ck) { if (ck.indexOf('sk-ant-') !== 0) return alert('Claude Key: sk-ant-...'); VERBY_AI.setClaudeKey(ck); }
  VERBY_AI.setModel(m);
  alert('Gespeichert (nur dieser Browser)');
  render('settings');
}
function clearOpenAIKey() { VERBY_AI.setOpenAIKey(''); VERBY_AI.setClaudeKey(''); alert('Keys geloescht'); render('settings'); }
