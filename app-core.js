const DEV = 'ninofox015@gmail.com';
const NAV = [
  {v:'home',l:'Home'},{v:'feed',l:'Feed'},{v:'discover',l:'Discover'},{v:'forum',l:'Forum'},
  {v:'create',l:'Erstellen'},{v:'notifications',l:'Notifs'},{v:'leaderboard',l:'Ranks'},
  {v:'shop',l:'Shop'},{v:'seasons',l:'Seasons'},{v:'favs',l:'Favs'},{v:'photo',l:'Photo'},
  {v:'download',l:'Download'},{v:'docs',l:'Docs'},{v:'blog',l:'Blog'},{v:'dev',l:'Dev'},{v:'settings',l:'Settings'}
];
const VERBY_AI = {
  model: localStorage.getItem('vb_ai_model') || 'gpt-4o-mini',
  style: localStorage.getItem('vb_ai_style') || 'natural',
  getOpenAIKey: function () { return localStorage.getItem('vb_openai_key') || ''; },
  setOpenAIKey: function (k) { if (k) localStorage.setItem('vb_openai_key', k.trim()); else localStorage.removeItem('vb_openai_key'); },
  getClaudeKey: function () { return localStorage.getItem('vb_claude_key') || ''; },
  setClaudeKey: function (k) { if (k) localStorage.setItem('vb_claude_key', k.trim()); else localStorage.removeItem('vb_claude_key'); },
  setModel: function (m) { this.model = m; localStorage.setItem('vb_ai_model', m); },
  setStyle: function (s) { this.style = s; localStorage.setItem('vb_ai_style', s); },
  isClaude: function (m) { m = m || this.model; return String(m).indexOf('claude') === 0; },
  hasAnyKey: function () { return this.isClaude() ? !!this.getClaudeKey() : !!this.getOpenAIKey(); }
};
const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'ChatGPT · GPT-4o mini' },
  { id: 'gpt-4o', label: 'ChatGPT · GPT-4o' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude · Sonnet 4' },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude · Haiku 3.5' }
];
const AI_STYLES = [
  { id: 'natural', label: 'Natürlich' },
  { id: 'short', label: 'Kurz' },
  { id: 'novel', label: 'Romanhaft' },
  { id: 'dramatic', label: 'Dramatisch' }
];
const CATS = ['Alle', 'Fantasy', 'Romance', 'Sci-Fi', 'Horror', 'Slice of Life', 'Abenteuer'];
const BADGE_DEFS = [
  { id: 'first_char', name: 'Erster Charakter', test: function () { return store.chars().length >= 1; } },
  { id: 'chatty', name: 'Plaudertasche', test: function () { return store.stats().msgs >= 20; } },
  { id: 'creator', name: 'Creator', test: function () { return store.chars().length >= 5; } },
  { id: 'social', name: 'Sozial', test: function () { return (store.follows().length >= 3); } },
  { id: 'season1', name: 'Season 1 Starter', test: function () { return store.seasonXp() >= 10; } },
  { id: 'sharer', name: 'Teiler', test: function () { return store.stats().shares >= 1; } },
  { id: 'lvl5', name: 'Level 5', test: function () { return store.level() >= 5; } },
  { id: 'backup', name: 'Backup-Held', test: function () { return !!localStorage.getItem('vb_did_backup'); } }
];
const store = {
  user: function () { return JSON.parse(localStorage.getItem('vb_user') || 'null'); },
  setUser: function (u) { localStorage.setItem('vb_user', JSON.stringify(u)); },
  chars: function () { return JSON.parse(localStorage.getItem('vb_chars') || '[]'); },
  setChars: function (c) { localStorage.setItem('vb_chars', JSON.stringify(c)); },
  flags: function () { return JSON.parse(localStorage.getItem('vb_flags') || '{"devs":[],"frames":{},"audit":[],"featureFlags":{}}'); },
  setFlags: function (f) { localStorage.setItem('vb_flags', JSON.stringify(f)); },
  users: function () { return JSON.parse(localStorage.getItem('vb_users') || '[]'); },
  setUsers: function (u) { localStorage.setItem('vb_users', JSON.stringify(u)); },
  threads: function (cid) { return JSON.parse(localStorage.getItem('vb_threads_' + cid) || '[]'); },
  setThreads: function (cid, t) { localStorage.setItem('vb_threads_' + cid, JSON.stringify(t)); },
  chats: function (cid, tid) { return JSON.parse(localStorage.getItem('vb_chat_' + cid + '_' + (tid || 'main')) || '[]'); },
  setChats: function (cid, tid, m) { localStorage.setItem('vb_chat_' + cid + '_' + (tid || 'main'), JSON.stringify(m.slice(-150))); },
  notifs: function () { return JSON.parse(localStorage.getItem('vb_notifs') || '[]'); },
  setNotifs: function (n) { localStorage.setItem('vb_notifs', JSON.stringify(n.slice(0, 80))); },
  theme: function () { return localStorage.getItem('vb_theme') || 'dark'; },
  setTheme: function (t) { localStorage.setItem('vb_theme', t); },
  pack: function () { return localStorage.getItem('vb_pack') || 'default'; },
  setPack: function (p) { localStorage.setItem('vb_pack', p); },
  accent: function () { return localStorage.getItem('vb_accent') || ''; },
  setAccent: function (c) { if (c) localStorage.setItem('vb_accent', c); else localStorage.removeItem('vb_accent'); },
  gallery: function () { return JSON.parse(localStorage.getItem('vb_gallery') || '[]'); },
  setGallery: function (g) { localStorage.setItem('vb_gallery', JSON.stringify(g.slice(0, 40))); },
  forum: function () { return JSON.parse(localStorage.getItem('vb_forum') || 'null'); },
  setForum: function (f) { localStorage.setItem('vb_forum', JSON.stringify(f)); },
  favs: function () { return JSON.parse(localStorage.getItem('vb_favs') || '[]'); },
  setFavs: function (f) { localStorage.setItem('vb_favs', JSON.stringify(f)); },
  follows: function () { return JSON.parse(localStorage.getItem('vb_follows') || '[]'); },
  setFollows: function (f) { localStorage.setItem('vb_follows', JSON.stringify(f)); },
  badges: function () { return JSON.parse(localStorage.getItem('vb_badges') || '[]'); },
  setBadges: function (b) { localStorage.setItem('vb_badges', JSON.stringify(b)); },
  chatTags: function () { return JSON.parse(localStorage.getItem('vb_chat_tags') || '{}'); },
  setChatTags: function (t) { localStorage.setItem('vb_chat_tags', JSON.stringify(t)); },
  reports: function () { return JSON.parse(localStorage.getItem('vb_reports') || '[]'); },
  setReports: function (r) { localStorage.setItem('vb_reports', JSON.stringify(r.slice(0, 100))); },
  devices: function () { return JSON.parse(localStorage.getItem('vb_devices') || '[]'); },
  setDevices: function (d) { localStorage.setItem('vb_devices', JSON.stringify(d.slice(0, 20))); },
  stats: function () { return JSON.parse(localStorage.getItem('vb_stats') || '{"msgs":0,"shares":0}'); },
  setStats: function (s) { localStorage.setItem('vb_stats', JSON.stringify(s)); },
  seasonXp: function () { return parseInt(localStorage.getItem('vb_season_xp') || '0', 10); },
  setSeasonXp: function (n) { localStorage.setItem('vb_season_xp', String(n)); },
  credits: function () { var u = store.user(); if (u && isDev(u)) return 999999; return parseInt(localStorage.getItem('vb_credits') || '100', 10); },
  setCredits: function (n) { localStorage.setItem('vb_credits', String(n)); },
  level: function () { return parseInt(localStorage.getItem('vb_level') || '1', 10); },
  xp: function () { return parseInt(localStorage.getItem('vb_xp') || '0', 10); },
  addXp: function (n) {
    var xp = store.xp() + n; var lvl = store.level();
    while (xp >= lvl * 50) { xp -= lvl * 50; lvl++; }
    localStorage.setItem('vb_xp', String(xp)); localStorage.setItem('vb_level', String(lvl));
    store.setSeasonXp(store.seasonXp() + n); checkBadges();
  }
};
function isDev(u) { u = u || store.user(); if (!u) return false; var f = store.flags(); return (u.email || '').toLowerCase() === DEV || (f.devs || []).indexOf((u.email || '').toLowerCase()) >= 0; }
function flagOn(key) { var ff = (store.flags().featureFlags || {}); if (ff[key] === false) return false; return true; }
function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
function haptic() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', store.theme() === 'light' ? 'light' : 'dark');
  var pack = store.pack(); document.documentElement.setAttribute('data-pack', pack === 'default' ? '' : pack);
  var ac = store.accent(); if (ac) document.documentElement.style.setProperty('--a', ac);
  else document.documentElement.style.removeProperty('--a');
}
applyTheme();
(function purgeAdult() { try { localStorage.removeItem('vb_mode'); } catch (e) {} })();
let sb = null;
try {
  if (window.supabase && window.VERBY_SB) {
    sb = window.supabase.createClient(window.VERBY_SB.url, window.VERBY_SB.key, {
      auth: { detectSessionInUrl: true, flowType: 'pkce', persistSession: true, autoRefreshToken: true, storage: window.localStorage }
    });
  }
} catch (e) { console.warn(e); }
function redirectTo() { return window.location.origin + (window.location.pathname || '/'); }
async function oauthLogin(provider) {
  if (!sb) return alert('Supabase nicht geladen');
  try {
    var r = await sb.auth.signInWithOAuth({ provider: provider, options: { redirectTo: redirectTo(), queryParams: { access_type: 'offline', prompt: 'select_account' } } });
    if (r.error) throw r.error;
  } catch (e) { alert(provider + ': ' + (e.message || e)); }
}
async function loginEmail() {
  var email = ((document.getElementById('a-email') || {}).value || '').trim().toLowerCase();
  var name = ((document.getElementById('a-name') || {}).value || '').trim() || (email.split('@')[0] || 'User');
  var pass = ((document.getElementById('a-pass') || {}).value || '');
  if (!email.includes('@')) return alert('E-Mail noetig');
  if (!pass || pass.length < 6) return alert('Passwort min. 6');
  if (!sb) return alert('Supabase nicht geladen');
  try {
    var session = null;
    var signIn = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (!signIn.error && signIn.data.session) session = signIn.data.session;
    else {
      var signUp = await sb.auth.signUp({ email: email, password: pass, options: { data: { name: name }, emailRedirectTo: redirectTo() } });
      if (signUp.error) throw signUp.error;
      session = signUp.data.session;
      if (!session) { alert('Account erstellt. Ggf. E-Mail bestaetigen.'); return; }
    }
    applySession(session); touchSession(); registerDevice(); haptic(); enterApp();
  } catch (e) { alert('Login: ' + (e.message || e)); }
}
function applySession(session) {
  if (!session || !session.user) return;
  var u = session.user;
  var nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name || u.user_metadata.user_name)) || (u.email && u.email.split('@')[0]) || 'User';
  var prev = store.user() || {};
  var handle = prev.handle || ('user' + String(u.id || Date.now()).slice(-6));
  store.setUser({ email: u.email || (nm + '@oauth.user'), name: nm, frame: prev.frame || null, id: u.id, handle: handle, banner: prev.banner || null });
  var users = store.users();
  if (!users.find(function (x) { return x.id === u.id || x.email === u.email; })) {
    users.push({ email: u.email, name: nm, handle: handle, created: Date.now(), id: u.id });
    store.setUsers(users);
  }
  touchSession(); registerDevice();
}
function touchSession() { localStorage.setItem('vb_last_active', String(Date.now())); }
function registerDevice() {
  var ua = navigator.userAgent.slice(0, 80);
  var id = localStorage.getItem('vb_device_id') || ('d' + Date.now());
  localStorage.setItem('vb_device_id', id);
  var list = store.devices().filter(function (d) { return d.id !== id; });
  list.unshift({ id: id, ua: ua, last: Date.now() });
  store.setDevices(list);
}
function checkSessionTimeout() {
  var last = parseInt(localStorage.getItem('vb_last_active') || '0', 10);
  var maxMs = 14 * 24 * 60 * 60 * 1000;
  if (last && Date.now() - last > maxMs) { logoutEverywhere(true); return false; }
  touchSession(); return true;
}
function hideAll() {
  ['landing', 'auth', 'app', 'chat', 'page'].forEach(function (id) {
    var e = document.getElementById(id); if (!e) return; e.classList.remove('on'); e.style.display = 'none';
  });
}
function showLanding() {
  if (store.user()) { enterApp(); return; }
  if (location.href.indexOf('code=') >= 0 || location.href.indexOf('access_token') >= 0) return;
  hideAll(); var e = document.getElementById('landing'); e.classList.add('on'); e.style.display = 'block';
}
function goAuth() {
  if (store.user()) { enterApp(); return; }
  if (location.href.indexOf('code=') >= 0) return;
  hideAll(); var e = document.getElementById('auth'); e.classList.add('on'); e.style.display = 'grid';
}
function buildNav() {
  var html = NAV.map(function (n) { return '<button class="nb" data-v="' + n.v + '" type="button">' + n.l + '</button>'; }).join('');
  var top = document.getElementById('topNav'); var side = document.getElementById('sideNav');
  if (top) top.innerHTML = html;
  if (side) side.innerHTML = '<div class="logo" style="font-size:15px;margin:4px 8px 12px">Verby<span>.</span></div>' + html;
  document.querySelectorAll('.nb[data-v]').forEach(function (b) { b.onclick = function () { haptic(); render(b.dataset.v); }; });
}
function enterApp() {
  if (!checkSessionTimeout()) return;
  hideAll(); ensureForumSeed(); buildNav();
  var e = document.getElementById('app'); e.classList.add('on'); e.style.display = 'flex';
  render('home'); checkBadges();
}
function showPage(which) {
  hideAll(); var el = document.getElementById('page'); el.classList.add('on'); el.style.display = 'block';
  var back = '<button class="btn btn-g" type="button" onclick="' + (store.user() ? 'enterApp()' : 'showLanding()') + '">← Zurueck</button>';
  if (which === 'updates') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Changelog</h1>' + (window.VERBY_CHANGELOG || []).map(function (x) {
      return '<div class="card"><h3>v' + esc(x.v) + '</h3><p class="muted">' + esc(x.t) + '</p>' + (x.detail ? '<p style="margin-top:8px;font-size:14px;line-height:1.5">' + esc(x.detail) + '</p>' : '') + '</div>';
    }).join('');
  } else if (which === 'privacy') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Privacy</h1><div class="card"><p>Daten liegen primaer lokal und in Supabase Auth. Export/Delete unter Settings.</p></div>';
  } else if (which === 'terms') {
    el.innerHTML = back + '<h1 style="margin:16px 0">Terms</h1><div class="card"><p>Friendly-Nutzung. Kein Missbrauch.</p></div>';
  } else if (which === 'about') {
    el.innerHTML = back + '<h1 style="margin:16px 0">About</h1><div class="card"><p>Verby — Character-Chat mit Verby AI.</p></div>';
  }
}
function pushNotif(title, body) {
  var n = store.notifs(); n.unshift({ id: Date.now(), title: title, body: body, ts: Date.now(), read: false }); store.setNotifs(n);
}
function audit(action, detail) {
  var f = store.flags(); f.audit = f.audit || [];
  f.audit.unshift({ ts: Date.now(), action: action, detail: detail || '', by: (store.user() || {}).email });
  f.audit = f.audit.slice(0, 120); store.setFlags(f);
}
function checkBadges() {
  var have = store.badges(); var changed = false;
  BADGE_DEFS.forEach(function (b) {
    if (have.indexOf(b.id) >= 0) return;
    try { if (b.test()) { have.push(b.id); changed = true; pushNotif('Badge', b.name + ' freigeschaltet!'); } } catch (e) {}
  });
  if (changed) store.setBadges(have);
}
function ensureForumSeed() {
  var data = store.forum(); var ver = window.VERBY_VERSION || '0';
  if (!data) data = { categories: [
    { id: 'updates', name: 'Updates', desc: 'Ankuendigungen' },
    { id: 'changelogs', name: 'Changelogs & Functions', desc: 'Releases' },
    { id: 'community', name: 'Community', desc: 'Diskussion' }
  ], threads: [], posts: {}, seededVersion: null };
  (window.VERBY_CHANGELOG || []).slice().reverse().forEach(function (log) {
    if (data.threads.some(function (t) { return t.version === log.v; })) return;
    var tid = 't_' + log.v.replace(/\./g, '_'); var now = Date.now();
    data.threads.unshift({ id: tid, cat: 'changelogs', title: 'Verby v' + log.v + ' — ' + log.t, author: 'Discobot', bot: true, version: log.v, pinned: log.v === ver, ts: now });
    data.posts[tid] = [{ id: 'p' + now, author: 'Discobot', bot: true, ts: now, body: 'Hallo,\n\nv' + log.v + ': ' + log.t + '\n\n' + (log.detail || '') + '\n\n— Discobot' }];
  });
  data.seededVersion = ver; store.setForum(data); return data;
}
function forumData() { return ensureForumSeed(); }
function renderForumList(catId) {
  var data = forumData();
  var threads = data.threads.filter(function (t) { return !catId || t.cat === catId; });
  threads.sort(function (a, b) { return (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts; });
  if (!threads.length) return '<div class="empty">Keine Threads.</div>';
  return threads.map(function (t) {
    var when = new Date(t.ts).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '<div class="forum-thread" onclick="openForumThread(\'' + t.id + '\')"><div><div class="tt">' + (t.pinned ? '📌 ' : '') + esc(t.title) + '</div><div class="muted" style="margin-top:4px">' + esc(t.author) + (t.bot ? ' · Bot' : '') + '</div></div><div class="muted">' + when + '</div></div>';
  }).join('');
}
function openForumThread(tid) { window._forumThread = tid; render('forum-thread'); }
