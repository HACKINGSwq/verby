const DEV = 'ninofox015@gmail.com';
const VERBY_OPENAI = {
  model: localStorage.getItem('vb_ai_model') || 'gpt-4o-mini',
  url: 'https://api.openai.com/v1/chat/completions',
  getKey: function () { return localStorage.getItem('vb_openai_key') || ''; },
  setKey: function (k) { if (k) localStorage.setItem('vb_openai_key', k.trim()); else localStorage.removeItem('vb_openai_key'); },
  setModel: function (m) { this.model = m; localStorage.setItem('vb_ai_model', m); }
};
const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini (schnell)' },
  { id: 'gpt-4o', label: 'GPT-4o (staerker)' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' }
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
  const email = (document.getElementById('a-email').value || '').trim().toLowerCase();
  const name = (document.getElementById('a-name').value || '').trim() || (email.split('@')[0] || 'User');
  const pass = document.getElementById('a-pass').value || '';
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
      if (!session) { alert('Account erstellt. Bitte ggf. E-Mail bestaetigen, dann erneut anmelden.'); return; }
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
function showLanding() { if (store.user()) { enterApp(); return; } hideAll(); const e = document.getElementById('landing'); e.classList.add('on'); e.style.display = 'block'; }
function goAuth() { if (store.user()) { enterApp(); return; } hideAll(); const e = document.getElementById('auth'); e.classList.add('on'); e.style.display = 'grid'; }
function enterApp() { hideAll(); ensureForumSeed(); const e = document.getElementById('app'); e.classList.add('on'); e.style.display = 'flex'; render('home'); }
function showPage(which) {
  hideAll(); const el = document.getElementById('page'); el.classList.add('on'); el.style.display = 'block';
  const back = '<button class="btn btn-g" type="button" onclick="' + (store.user() ? 'enterApp()' : 'showLanding()') + '">← Zurueck</button>';
  if (which === 'updates') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Changelog</h1>' + (window.VERBY_CHANGELOG || []).map(function (x) {
      return '<div class="card"><h3>v' + esc(x.v) + '</h3><p class="muted">' + esc(x.t) + '</p>' + (x.detail ? '<p style="margin-top:8px;font-size:14px;line-height:1.5">' + esc(x.detail) + '</p>' : '') + '</div>';
    }).join('');
  } else if (which === 'about') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Ueber Verby</h1><div class="card"><p>Verby ist eine Friendly Character-Chat-Plattform mit Forum, Photo Editor und OpenAI.</p></div>';
  } else if (which === 'safety') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Safety Center</h1><div class="card"><p>Friendly-Modus. Respektvoll chatten. Keine expliziten Inhalte.</p></div>';
  } else if (which === 'help') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Hilfe</h1><div class="card"><p><b>Login-Loop?</b> Hard-Refresh (Ctrl+Shift+R).</p><p style="margin-top:8px"><b>OpenAI?</b> Settings → API-Key.</p><p style="margin-top:8px"><b>Mehrere Chats?</b> Im Chat ⋮ → neu.</p></div>';
  }
}
function frameClass(u) { if (!u) return ''; const f = store.flags().frames || {}; const fr = u.frame || f[(u.email || '').toLowerCase()]; return fr ? 'frame-' + fr : ''; }
function pushNotif(title, body) { const n = store.notifs(); n.unshift({ id: Date.now(), title: title, body: body, ts: Date.now() }); store.setNotifs(n); }
function audit(action, detail) { const f = store.flags(); f.audit = f.audit || []; f.audit.unshift({ ts: Date.now(), action: action, detail: detail || '', by: (store.user() || {}).email }); f.audit = f.audit.slice(0, 100); store.setFlags(f); }
function ensureForumSeed() {
  var data = store.forum(); var ver = window.VERBY_VERSION || '0';
  if (!data) data = { categories: [{ id: 'updates', name: 'Updates', desc: 'Offizielle Ankuendigungen.' }, { id: 'changelogs', name: 'Changelogs & Functions', desc: 'Jedes Release im Detail.' }, { id: 'community', name: 'Community Discussion', desc: 'Feedback und Ideen.' }], threads: [], posts: {}, seededVersion: null };
  (window.VERBY_CHANGELOG || []).slice().reverse().forEach(function (log) {
    if (data.threads.some(function (t) { return t.version === log.v; })) return;
    var tid = 't_' + log.v.replace(/\./g, '_'); var now = Date.now();
    data.threads.unshift({ id: tid, cat: 'changelogs', title: 'Verby v' + log.v + ' — ' + log.t, author: 'Discobot', bot: true, version: log.v, pinned: log.v === ver, ts: now, replies: 1, likes: 0 });
    data.posts[tid] = [{ id: 'p' + now, author: 'Discobot', bot: true, ts: now, body: 'Hallo zusammen,\n\nDiscobot zu Version ' + log.v + '.\n\n## Zusammenfassung\n' + log.t + '\n\n## Details\n' + (log.detail || log.t) + '\n\n— Discobot' }];
    if (log.v === ver) {
      var tid2 = 'u_' + log.v.replace(/\./g, '_');
      if (!data.threads.some(function (t) { return t.id === tid2; })) {
        data.threads.unshift({ id: tid2, cat: 'updates', title: '[Update] v' + log.v + ' ist live', author: 'Discobot', bot: true, version: log.v, pinned: true, ts: now + 1, replies: 1, likes: 0 });
        data.posts[tid2] = [{ id: 'p' + now + 'u', author: 'Discobot', bot: true, ts: now, body: 'Hallo Community,\n\nDiscobot: Verby v' + log.v + ' ist live.\n\n' + log.t + '\n\n— Discobot' }];
      }
    }
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
    return '<div class="forum-thread" onclick="openForumThread(\'' + t.id + '\')"><div><div class="tt">' + (t.pinned ? '📌 ' : '') + esc(t.title) + '</div><div class="muted" style="margin-top:4px">' + esc(t.author) + (t.bot ? ' · Bot' : '') + ' · ❤️ ' + (t.likes || 0) + '</div></div><div class="meta">' + when + '</div></div>';
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
    root.innerHTML = '<div class="card row glass"><div class="avatar ' + frameClass(u) + '">' + (u.name || '?')[0].toUpperCase() + '</div><div class="grow"><div class="h2">Hey, ' + esc(u.name) + '</div><div class="muted">Lvl ' + lvl + ' · Credits: ' + (isDev() ? '∞' : cred) + ' · Friendly</div></div></div><div class="section-title">Deine Charaktere</div>' + (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Noch keine Charaktere.</div>');
  }
  if (view === 'explore') {
    const cat = window._cat || 'Alle'; let list = store.chars();
    if (cat !== 'Alle') list = list.filter(function (c) { return (c.category || 'Fantasy') === cat; });
    root.innerHTML = '<div class="h2">Explore</div><div class="cat-row">' + CATS.map(function (c) { return '<button class="cat ' + (c === cat ? 'on' : '') + '" type="button" onclick="window._cat=\'' + c + '\';render(\'explore\')">' + c + '</button>'; }).join('') + '</div>' + (list.length ? list.map(function (c) { return charCard(c, true); }).join('') : '<div class="empty">Nichts hier.</div>');
  }
  if (view === 'favs') {
    const ids = store.favs(); const list = store.chars().filter(function (c) { return ids.indexOf(c.id) >= 0; });
    root.innerHTML = '<div class="h2">Favoriten</div>' + (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Noch keine Favoriten.</div>');
  }
  if (view === 'forum') {
    var data = forumData(); var tab = window._forumTab || 'home';
    var tabs = '<div class="forum-tabs"><button class="forum-tab ' + (tab === 'home' ? 'on' : '') + '" type="button" onclick="window._forumTab=\'home\';render(\'forum\')">Uebersicht</button>' + data.categories.map(function (c) { return '<button class="forum-tab ' + (tab === c.id ? 'on' : '') + '" type="button" onclick="window._forumTab=\'' + c.id + '\';render(\'forum\')">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    if (tab === 'home') root.innerHTML = '<div class="forum-wrap"><div class="h2">Verby Forum</div><p class="muted" style="margin-bottom:14px">Discobot + Community.</p>' + tabs + data.categories.map(function (c) { return '<div class="forum-cat"><div class="forum-cat-h"><h3>' + esc(c.name) + '</h3><p>' + esc(c.desc) + '</p></div>' + renderForumList(c.id) + '</div>'; }).join('') + '</div>';
    else { var cat = data.categories.find(function (c) { return c.id === tab; }); root.innerHTML = '<div class="forum-wrap"><div class="h2">' + esc(cat ? cat.name : 'Forum') + '</div>' + tabs + '<div class="forum-cat">' + renderForumList(tab) + '</div></div>'; }
  }
  if (view === 'forum-thread') {
    var data = forumData(); var t = data.threads.find(function (x) { return x.id === window._forumThread; }); var posts = (data.posts[window._forumThread] || []);
    if (!t) { root.innerHTML = '<div class="empty">Thread nicht gefunden.</div>'; return; }
    root.innerHTML = '<button class="btn btn-g" type="button" onclick="render(\'forum\')">← Forum</button><h2 style="margin:14px 0 8px;font-size:20px">' + esc(t.title) + '</h2><p class="muted" style="margin-bottom:12px">' + esc(t.author) + (t.bot ? ' · Discobot' : '') + ' · <button class="btn-sm btn-g" type="button" onclick="likeThread(\'' + t.id + '\')">❤️ ' + (t.likes || 0) + '</button></p>' + posts.map(function (p) { return '<div class="forum-post"><b>' + esc(p.author) + '</b>' + (p.bot ? '<span class="bot-badge">BOT</span>' : '') + '<div class="body">' + esc(p.body) + '</div></div>'; }).join('') + '<div class="card" style="margin-top:12px"><div class="form-g"><label>Antwort</label><textarea id="forumReply"></textarea></div><button class="btn btn-p" type="button" onclick="postForumReply(\'' + t.id + '\')">Senden</button></div>';
  }
  if (view === 'create') {
    root.innerHTML = '<div class="card glass"><div class="h2">Charakter erstellen</div><div class="form-g"><label>Profilbild</label><div class="row"><div class="avatar lg" id="cPreview" style="width:72px;height:72px">✨</div><div class="grow"><input type="file" id="cPhoto" accept="image/*"></div></div></div><div class="form-g"><label>Name *</label><input id="cn"></div><div class="form-g"><label>Begruessung *</label><textarea id="cg"></textarea></div><div class="form-g"><label>Tags</label><input id="ctags" placeholder="freundlich, neugierig"></div><div class="form-g"><label>Kurzbeschreibung</label><input id="cs"></div><div class="form-g"><label>Memory / Lore</label><textarea id="cl"></textarea></div><div class="form-g"><label>Kategorie</label><select id="cc">' + CATS.filter(function (c) { return c !== 'Alle'; }).map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div><button class="btn btn-p" type="button" onclick="saveChar()">Speichern</button></div>';
    window._cPhotoData = null;
    var finp = document.getElementById('cPhoto');
    if (finp) finp.onchange = function (e) { var f = e.target.files && e.target.files[0]; if (!f || f.size > 2.5 * 1024 * 1024) return alert('Max 2,5 MB'); var reader = new FileReader(); reader.onload = function () { window._cPhotoData = reader.result; var prev = document.getElementById('cPreview'); if (prev) { prev.textContent = ''; prev.style.backgroundImage = 'url(' + reader.result + ')'; prev.style.backgroundSize = 'cover'; } }; reader.readAsDataURL(f); };
  }
  if (view === 'photo') {
    root.innerHTML = '<div class="card glass"><div class="h2">Photo Editor 2.0</div><div class="form-g"><input type="file" id="peFile" accept="image/*"></div><canvas id="peCanvas" style="max-width:100%;border-radius:12px;border:1px solid var(--b);display:none;margin:8px 0"></canvas><div class="form-g"><label>Helligkeit</label><input type="range" id="peBright" min="50" max="150" value="100"></div><div class="form-g"><label>Kontrast</label><input type="range" id="peContrast" min="50" max="150" value="100"></div><div class="form-g"><label>Saettigung</label><input type="range" id="peSat" min="0" max="200" value="100"></div><button class="btn btn-g" type="button" onclick="peFlip()">Spiegeln</button> <button class="btn btn-p" type="button" onclick="peSave()">In Gallery</button> <button class="btn btn-g" type="button" onclick="peUseForChar()">Fuer Charakter</button></div>';
    window._peImg = null; window._peFlip = false;
    function peRedraw() { var canvas = document.getElementById('peCanvas'); if (!canvas || !window._peImg) return; var img = window._peImg; var b = (document.getElementById('peBright').value || 100) / 100; var c = (document.getElementById('peContrast').value || 100) / 100; var s = (document.getElementById('peSat').value || 100) / 100; var maxW = Math.min(560, root.clientWidth - 40); var scale = Math.min(1, maxW / img.width); canvas.width = img.width * scale; canvas.height = img.height * scale; canvas.style.display = 'block'; var ctx = canvas.getContext('2d'); ctx.save(); ctx.filter = 'brightness(' + b + ') contrast(' + c + ') saturate(' + s + ')'; if (window._peFlip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); } ctx.drawImage(img, 0, 0, canvas.width, canvas.height); ctx.restore(); }
    window._peRedraw = peRedraw;
    document.getElementById('peFile').onchange = function (e) { var f = e.target.files && e.target.files[0]; if (!f) return; var reader = new FileReader(); reader.onload = function () { var img = new Image(); img.onload = function () { window._peImg = img; peRedraw(); }; img.src = reader.result; }; reader.readAsDataURL(f); };
    ['peBright', 'peContrast', 'peSat'].forEach(function (id) { var el = document.getElementById(id); if (el) el.oninput = peRedraw; });
  }
  if (view === 'download') {
    root.innerHTML = '<div class="h2">Download Center</div><div class="card"><h3>PWA installieren</h3><p class="muted" style="margin:8px 0">Handy: Browser-Menue → Zum Home-Bildschirm. Desktop: Install-Icon.</p></div><div class="card"><button class="btn btn-g" type="button" onclick="showPage(\'about\')">Ueber</button> <button class="btn btn-g" type="button" onclick="showPage(\'safety\')">Safety</button> <button class="btn btn-g" type="button" onclick="showPage(\'help\')">Hilfe</button></div>';
  }
  if (view === 'dev') {
    if (!isDev()) { root.innerHTML = '<div class="empty">Kein Dev-Zugriff.</div>'; return; }
    var f = store.flags();
    root.innerHTML = '<div class="card glass"><div class="h2">Dev Panel</div><p class="muted">Credits: ∞ · Audit aktiv</p><div class="form-g"><label>E-Mail</label><input id="de"></div><button class="btn btn-p" type="button" onclick="devAction(\'dev\')">Zum Dev</button> <button class="btn btn-d" type="button" onclick="devAction(\'undev\')">Dev entziehen</button><div class="form-g" style="margin-top:14px"><label>Rahmen</label><input id="fe"><select id="ff"><option value="">Kein</option><option value="gold">Gold</option><option value="purple">Lila</option><option value="cyan">Cyan</option></select></div><button class="btn btn-g" type="button" onclick="setFrame()">Setzen</button> <button class="btn btn-g" type="button" onclick="devExport()">Export</button> <button class="btn btn-d" type="button" onclick="devWipeChars()">Chars loeschen</button><div class="section-title" style="margin-top:16px">Audit</div>' + ((f.audit || []).slice(0, 8).map(function (a) { return '<div class="muted" style="font-size:12px">' + new Date(a.ts).toLocaleString('de-DE') + ' · ' + esc(a.action) + ' · ' + esc(a.detail) + '</div>'; }).join('') || '<div class="muted">Leer</div>') + '</div>';
  }
  if (view === 'settings') {
    var hasKey = !!VERBY_OPENAI.getKey(); var th = store.theme();
    root.innerHTML = '<div class="card glass"><div class="h2">Settings</div><p class="muted">' + esc(u.email || '') + '</p><p class="muted">Version ' + esc(window.VERBY_VERSION || '') + ' · Lvl ' + lvl + ' · Credits: ' + (isDev() ? '∞' : cred) + '</p><div class="form-g" style="margin-top:14px"><label>Theme</label><select id="themeSel"><option value="dark"' + (th === 'dark' ? ' selected' : '') + '>Dunkel</option><option value="light"' + (th === 'light' ? ' selected' : '') + '>Hell</option></select></div><button class="btn btn-g" type="button" onclick="saveTheme()">Theme speichern</button><div class="form-g" style="margin-top:14px"><label>OpenAI API Key (nur lokal)</label><input id="oakey" type="password" placeholder="sk-..." autocomplete="off"></div><div class="form-g"><label>AI-Modell</label><select id="aimodel">' + AI_MODELS.map(function (m) { return '<option value="' + m.id + '"' + (VERBY_OPENAI.model === m.id ? ' selected' : '') + '>' + m.label + '</option>'; }).join('') + '</select></div><button class="btn btn-p" type="button" onclick="saveOpenAIKey()">Key & Modell speichern</button> <button class="btn btn-d" type="button" onclick="clearOpenAIKey()">Key loeschen</button><p class="muted" style="margin-top:8px;font-size:12px">' + (hasKey ? 'Key aktiv' : 'Kein Key — Fallback') + '</p><button class="btn btn-g" style="width:100%;margin-top:12px" type="button" onclick="showPage(\'updates\')">Changelog</button><button class="btn btn-g" style="width:100%;margin-top:8px" type="button" onclick="showPage(\'help\')">Hilfe</button><button class="btn btn-d" style="width:100%;margin-top:12px" type="button" onclick="logout()">Logout</button></div>';
  }
  if (view === 'profile' && window._prof) {
    const c = window._prof; var isFav = store.favs().indexOf(c.id) >= 0;
    var avHtml = c.photo ? '<div class="avatar lg glow" style="margin:0 auto 12px;background-image:url(' + c.photo + ');background-size:cover"></div>' : '<div class="avatar lg glow" style="margin:0 auto 12px">' + (c.emoji || '✨') + '</div>';
    root.innerHTML = '<div style="text-align:center">' + avHtml + '<div class="h2">' + esc(c.name) + '</div><p class="muted">' + esc(c.short || '') + '</p><button class="btn btn-p" type="button" onclick="openChat(\'' + c.id + '\')">Chat</button> <button class="btn btn-g" type="button" onclick="toggleFav(\'' + c.id + '\')">' + (isFav ? '★ Favorit' : '☆ Favorit') + '</button> <button class="btn btn-d" type="button" onclick="deleteChar(\'' + c.id + '\')">Loeschen</button></div>';
  }
}
function charCard(c, withProf) {
  const click = withProf ? "window._prof=store.chars().find(function(x){return x.id==='" + c.id + "'});render('profile')" : "openChat('" + c.id + "')";
  var avStyle = c.photo ? ' style="background-image:url(' + c.photo + ');background-size:cover;background-position:center"' : '';
  var avInner = c.photo ? '' : (c.emoji || '✨');
  var fav = store.favs().indexOf(c.id) >= 0 ? ' ★' : '';
  return '<div class="card row" onclick="' + click + '"><div class="avatar"' + avStyle + '>' + avInner + '</div><div class="grow"><b>' + esc(c.name) + fav + '</b><div class="muted">' + esc(c.short || c.category || '') + '</div></div></div>';
}
function saveChar() {
  const name = document.getElementById('cn').value.trim(); const greeting = document.getElementById('cg').value.trim();
  if (!name || !greeting) return alert('Name + Begruessung noetig');
  const list = store.chars();
  const item = { id: 'c' + Date.now(), name: name, greeting: greeting, short: document.getElementById('cs').value.trim(), lore: document.getElementById('cl').value.trim(), tags: (document.getElementById('ctags') && document.getElementById('ctags').value.trim()) || '', category: document.getElementById('cc').value, emoji: '✨', photo: window._cPhotoData || null, owner: store.user().email };
  list.unshift(item); store.setChars(list);
  store.setThreads(item.id, [{ id: 'main', title: 'Hauptchat', updated: Date.now() }]);
  store.setChats(item.id, 'main', [{ role: 'bot', text: greeting }]);
  store.setGallery([{ name: name, emoji: '✨', photo: item.photo }].concat(store.gallery()));
  window._cPhotoData = null; pushNotif('Charakter erstellt', name); store.addXp(10); haptic(); alert('Gespeichert'); render('home');
}
function deleteChar(id) { if (!confirm('Charakter wirklich loeschen?')) return; store.setChars(store.chars().filter(function (c) { return c.id !== id; })); store.setFavs(store.favs().filter(function (x) { return x !== id; })); audit('delete_char', id); haptic(); render('home'); }
function toggleFav(id) { var f = store.favs(); var i = f.indexOf(id); if (i >= 0) f.splice(i, 1); else f.push(id); store.setFavs(f); if (window._prof && window._prof.id === id) render('profile'); else render('favs'); }
function likeThread(tid) { var data = forumData(); var t = data.threads.find(function (x) { return x.id === tid; }); if (t) { t.likes = (t.likes || 0) + 1; store.setForum(data); } openForumThread(tid); }
function postForumReply(tid) {
  var text = (document.getElementById('forumReply') && document.getElementById('forumReply').value || '').trim();
  if (!text) return alert('Text eingeben');
  var data = forumData(); data.posts[tid] = data.posts[tid] || [];
  data.posts[tid].push({ id: 'p' + Date.now(), author: (store.user() || {}).name || 'User', bot: false, ts: Date.now(), body: text });
  var t = data.threads.find(function (x) { return x.id === tid; }); if (t) t.replies = (t.replies || 0) + 1;
  store.setForum(data); store.addXp(5); openForumThread(tid);
}
function devAction(type) { const e = document.getElementById('de').value.trim().toLowerCase(); if (!e) return alert('E-Mail'); const f = store.flags(); f.devs = f.devs || []; if (type === 'dev' && f.devs.indexOf(e) < 0) f.devs.push(e); if (type === 'undev') f.devs = f.devs.filter(function (x) { return x !== e; }); store.setFlags(f); audit(type, e); alert('OK'); render('dev'); }
function setFrame() { const e = document.getElementById('fe').value.trim().toLowerCase(); const fr = document.getElementById('ff').value; if (!e) return; const f = store.flags(); f.frames = f.frames || {}; if (fr) f.frames[e] = fr; else delete f.frames[e]; store.setFlags(f); audit('set_frame', e + '=' + fr); alert('OK'); }
function devExport() { var blob = new Blob([JSON.stringify({ users: store.users(), chars: store.chars(), flags: store.flags(), forum: store.forum() }, null, 2)], { type: 'application/json' }); var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'verby-export.json'; a.click(); }
function devWipeChars() { if (!confirm('Alle Charaktere loeschen?')) return; store.setChars([]); audit('wipe_chars', ''); render('dev'); }
async function logout() { try { if (sb) await sb.auth.signOut(); } catch (e) {} localStorage.removeItem('vb_user'); showLanding(); }
function saveTheme() { var t = document.getElementById('themeSel').value; store.setTheme(t); applyTheme(); alert('Theme: ' + t); }
function saveOpenAIKey() { var k = document.getElementById('oakey').value.trim(); var m = document.getElementById('aimodel').value; if (k) { if (k.indexOf('sk-') !== 0) return alert('Gueltigen OpenAI Key einfuegen (sk-...)'); VERBY_OPENAI.setKey(k); } VERBY_OPENAI.setModel(m); alert('Gespeichert'); render('settings'); }
function clearOpenAIKey() { VERBY_OPENAI.setKey(''); alert('Key geloescht'); render('settings'); }
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
function updateTokenBar() { var el = document.getElementById('tokenBar'); if (!el) return; el.textContent = (!!VERBY_OPENAI.getKey() ? 'OpenAI · ' + VERBY_OPENAI.model : 'Lokaler Fallback') + ' · Credits: ' + (isDev() ? '∞' : store.credits()); }
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
  catch (e) { console.warn('OpenAI fallback', e); reply = e.name === 'AbortError' ? '*(Antwort abgebrochen)*' : characterReply(cur, hist, t); }
  generating = false; showSkip(false); var ty = document.getElementById('ty'); if (ty) ty.remove();
  hist = store.chats(cur.id, curThread); hist.push({ role: 'bot', text: reply }); store.setChats(cur.id, curThread, hist);
  var th = ensureThreads(cur.id); th.forEach(function (x) { if (x.id === curThread) x.updated = Date.now(); }); store.setThreads(cur.id, th);
  paintMsgs(hist); updateTokenBar();
}
async function openaiCharacterReply(char, hist, signal) {
  if (!VERBY_OPENAI.getKey()) throw new Error('Kein OpenAI Key — unter Settings eintragen');
  var system = 'Du bist der Charakter "' + char.name + '". Du bleibst IMMER in der Rolle. Antworte natuerlich, lebendig und auf Deutsch. Nutze *Sternchen* fuer Aktionen. Keine Meta-Kommentare als KI. Friendly-Modus: keine expliziten sexuellen Inhalte.';
  if (char.short) system += ' Kurzbeschreibung: ' + char.short + '.'; if (char.tags) system += ' Tags: ' + char.tags + '.'; if (char.lore) system += ' Lore: ' + char.lore + '.'; if (char.greeting) system += ' Begruessung: ' + char.greeting;
  var messages = [{ role: 'system', content: system }];
  hist.slice(-16).forEach(function (m) { messages.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }); });
  var res = await fetch(VERBY_OPENAI.url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + VERBY_OPENAI.getKey() }, body: JSON.stringify({ model: VERBY_OPENAI.model, messages: messages, temperature: 0.85, max_tokens: 450 }), signal: signal });
  if (!res.ok) throw new Error('OpenAI ' + res.status + ': ' + (await res.text()).slice(0, 200));
  var data = await res.json(); var text = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error('Leere Antwort'); return text.trim();
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
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
function runUpdateScreen(then) {
  const prev = localStorage.getItem('vb_app_version'); const ver = window.VERBY_VERSION || '0'; if (prev === ver) { then(); return; }
  const ov = document.getElementById('updateOverlay'); const bar = document.getElementById('updateBar'); const sub = document.getElementById('updateSub');
  if (!ov) { then(); return; } ov.classList.add('on');
  if (sub) { var log = (window.VERBY_CHANGELOG || [])[0]; sub.textContent = 'v' + ver + (log ? ' · ' + log.t.slice(0, 40) + '…' : ''); }
  const maxMs = 6500, start = Date.now();
  const timer = setInterval(function () {
    const elapsed = Date.now() - start; let p = Math.min(100, (elapsed / maxMs) * 100); if (elapsed > 1000) p = Math.min(100, p + 12);
    if (bar) bar.style.width = p + '%';
    if (p >= 100 || elapsed >= maxMs) { clearInterval(timer); if (bar) bar.style.width = '100%'; localStorage.setItem('vb_app_version', ver); try { ensureForumSeed(); } catch (e) {} setTimeout(function () { ov.classList.remove('on'); then(); }, 180); }
  }, 80);
}
(async function boot() {
  runUpdateScreen(async function () {
    try {
      if (sb) {
        const res = await sb.auth.getSession();
        if (res.data && res.data.session) {
          applySession(res.data.session); enterApp();
          sb.auth.onAuthStateChange(function (event, session) {
            if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')) { applySession(session); if (event === 'SIGNED_IN') enterApp(); }
            if (event === 'SIGNED_OUT') localStorage.removeItem('vb_user');
          });
          return;
        }
        sb.auth.onAuthStateChange(function (event, session) {
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) { applySession(session); enterApp(); }
          if (event === 'SIGNED_OUT') localStorage.removeItem('vb_user');
        });
      }
    } catch (e) { console.warn(e); }
    if (store.user()) enterApp(); else showLanding();
  });
})();
