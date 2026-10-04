const DEV = 'ninofox015@gmail.com';
const SIDE_NAV = [
  { v: 'home', l: 'Home', ico: '🏠' },
  { v: 'chats', l: 'Chats', ico: '💬' },
  { v: 'discover', l: 'Discover', ico: '✨' },
  { v: 'create', l: 'Create', ico: '＋' },
  { v: 'forum', l: 'Forum', ico: '📋' },
  { v: 'settings', l: 'Settings', ico: '⚙️' }
];
const BOTTOM_NAV = [
  { v: 'home', l: 'Home', ico: '🏠' },
  { v: 'discover', l: 'Discover', ico: '✨' },
  { v: 'create', l: 'Create', ico: '＋' },
  { v: 'chats', l: 'Chats', ico: '💬' },
  { v: 'settings', l: 'Profil', ico: '👤' }
];
const VERBY_AI = {
  model: localStorage.getItem('vb_ai_model') || 'gpt-4o-mini',
  style: localStorage.getItem('vb_ai_style') || 'novel',
  getOpenAIKey: function () { return localStorage.getItem('vb_openai_key') || ''; },
  setOpenAIKey: function (k) { if (k) localStorage.setItem('vb_openai_key', k.trim()); else localStorage.removeItem('vb_openai_key'); },
  getClaudeKey: function () { return localStorage.getItem('vb_claude_key') || ''; },
  setClaudeKey: function (k) { if (k) localStorage.setItem('vb_claude_key', k.trim()); else localStorage.removeItem('vb_claude_key'); },
  setModel: function (m) { this.model = m; localStorage.setItem('vb_ai_model', m); },
  setStyle: function (s) { this.style = s; localStorage.setItem('vb_ai_style', s); },
  isClaude: function (m) { return String(m || this.model).indexOf('claude') === 0; },
  hasAnyKey: function () { return this.isClaude() ? !!this.getClaudeKey() : !!this.getOpenAIKey(); },
  useServerKeys: function () { return localStorage.getItem('vb_server_keys') === '1'; }
};
const AI_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet' },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude Haiku' }
];
const AI_STYLES = [
  { id: 'novel', label: 'Romanhaft (c.ai)' },
  { id: 'natural', label: 'Natürlich' },
  { id: 'short', label: 'Kurz' },
  { id: 'dramatic', label: 'Dramatisch' }
];
const CATS = ['Alle', 'Fantasy', 'Romance', 'Sci-Fi', 'Horror', 'Slice of Life', 'Abenteuer'];
const store = {
  user: function () { return JSON.parse(localStorage.getItem('vb_user') || 'null'); },
  setUser: function (u) { localStorage.setItem('vb_user', JSON.stringify(u)); },
  chars: function () { return JSON.parse(localStorage.getItem('vb_chars') || '[]'); },
  setChars: function (c) { localStorage.setItem('vb_chars', JSON.stringify(c)); queueCloudSync(); },
  flags: function () { return JSON.parse(localStorage.getItem('vb_flags') || '{"devs":[],"audit":[]}'); },
  setFlags: function (f) { localStorage.setItem('vb_flags', JSON.stringify(f)); },
  threads: function (cid) { return JSON.parse(localStorage.getItem('vb_threads_' + cid) || '[]'); },
  setThreads: function (cid, t) { localStorage.setItem('vb_threads_' + cid, JSON.stringify(t)); },
  chats: function (cid, tid) { return JSON.parse(localStorage.getItem('vb_chat_' + cid + '_' + (tid || 'main')) || '[]'); },
  setChats: function (cid, tid, m) { localStorage.setItem('vb_chat_' + cid + '_' + (tid || 'main'), JSON.stringify(m.slice(-200))); queueCloudSync(); },
  memory: function (cid) { return localStorage.getItem('vb_mem_' + cid) || ''; },
  setMemory: function (cid, t) { localStorage.setItem('vb_mem_' + cid, t || ''); },
  notifs: function () { return JSON.parse(localStorage.getItem('vb_notifs') || '[]'); },
  setNotifs: function (n) { localStorage.setItem('vb_notifs', JSON.stringify(n.slice(0, 60))); },
  theme: function () { return localStorage.getItem('vb_theme') || 'dark'; },
  setTheme: function (t) { localStorage.setItem('vb_theme', t); },
  favs: function () { return JSON.parse(localStorage.getItem('vb_favs') || '[]'); },
  setFavs: function (f) { localStorage.setItem('vb_favs', JSON.stringify(f)); },
  forum: function () { return JSON.parse(localStorage.getItem('vb_forum') || 'null'); },
  setForum: function (f) { localStorage.setItem('vb_forum', JSON.stringify(f)); },
  credits: function () { if (isDev()) return 999999; return parseInt(localStorage.getItem('vb_credits') || '200', 10); },
  setCredits: function (n) { localStorage.setItem('vb_credits', String(n)); },
  level: function () { return parseInt(localStorage.getItem('vb_level') || '1', 10); },
  addXp: function (n) {
    var xp = parseInt(localStorage.getItem('vb_xp') || '0', 10) + n;
    var lvl = store.level();
    while (xp >= lvl * 50) { xp -= lvl * 50; lvl++; }
    localStorage.setItem('vb_xp', String(xp));
    localStorage.setItem('vb_level', String(lvl));
  }
};
function isDev(u) {
  u = u || store.user();
  if (!u) return false;
  return (u.email || '').toLowerCase() === DEV || (store.flags().devs || []).indexOf((u.email || '').toLowerCase()) >= 0;
}
function esc(t) { var d = document.createElement('div'); d.textContent = t == null ? '' : String(t); return d.innerHTML; }
function haptic() { try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {} }
function applyTheme() {
  document.documentElement.setAttribute('data-theme', store.theme() === 'light' ? 'light' : 'dark');
}
applyTheme();
let sb = null;
try {
  if (window.supabase && window.VERBY_SB) {
    sb = window.supabase.createClient(window.VERBY_SB.url, window.VERBY_SB.key, {
      auth: { detectSessionInUrl: true, flowType: 'pkce', persistSession: true, autoRefreshToken: true, storage: window.localStorage }
    });
  }
} catch (e) { console.warn(e); }
var _syncTimer = null;
function queueCloudSync() {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(cloudSync, 2000);
}
async function cloudSync() {
  if (!sb || !store.user()) return;
  try {
    var uid = store.user().id;
    if (!uid) return;
    await sb.from('verby_profiles').upsert({
      user_id: uid,
      handle: store.user().handle || null,
      display_name: store.user().name,
      data: { favs: store.favs(), level: store.level() },
      updated_at: new Date().toISOString()
    });
    var chars = store.chars().filter(function (c) { return c.owner === store.user().email || !c.owner; }).slice(0, 40);
    for (var i = 0; i < chars.length; i++) {
      await sb.from('verby_chars').upsert({
        id: chars[i].id,
        user_id: uid,
        payload: chars[i],
        updated_at: new Date().toISOString()
      });
    }
  } catch (e) { /* tables may not exist yet */ }
}
function redirectTo() { return location.origin + (location.pathname || '/'); }
async function oauthLogin(provider) {
  if (!sb) return alert('Supabase nicht geladen');
  try {
    var r = await sb.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: redirectTo(), queryParams: { access_type: 'offline', prompt: 'select_account' } }
    });
    if (r.error) throw r.error;
  } catch (e) { alert(String(e.message || e)); }
}
async function loginEmail() {
  var email = ((document.getElementById('a-email') || {}).value || '').trim().toLowerCase();
  var name = ((document.getElementById('a-name') || {}).value || '').trim() || email.split('@')[0];
  var pass = ((document.getElementById('a-pass') || {}).value || '');
  if (!email.includes('@') || pass.length < 6) return alert('E-Mail + Passwort (min 6)');
  if (!sb) return alert('Supabase fehlt');
  try {
    var session = null;
    var si = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (!si.error && si.data.session) session = si.data.session;
    else {
      var su = await sb.auth.signUp({ email: email, password: pass, options: { data: { name: name }, emailRedirectTo: redirectTo() } });
      if (su.error) throw su.error;
      session = su.data.session;
      if (!session) return alert('Account erstellt — ggf. E-Mail bestaetigen');
    }
    applySession(session); enterApp();
  } catch (e) { alert(String(e.message || e)); }
}
function applySession(session) {
  if (!session || !session.user) return;
  var u = session.user;
  var prev = store.user() || {};
  var nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name)) || (u.email && u.email.split('@')[0]) || 'User';
  store.setUser({
    email: u.email || nm + '@oauth.user',
    name: nm,
    id: u.id,
    handle: prev.handle || ('u' + String(u.id || '').slice(-6))
  });
  localStorage.setItem('vb_last_active', String(Date.now()));
  queueCloudSync();
}
function hideAll() {
  ['landing', 'auth', 'app', 'chat', 'page'].forEach(function (id) {
    var e = document.getElementById(id);
    if (!e) return;
    e.classList.remove('on');
    e.style.display = 'none';
  });
}
function showLanding() {
  if (store.user()) return enterApp();
  if (location.href.indexOf('code=') >= 0) return;
  hideAll();
  var e = document.getElementById('landing');
  e.classList.add('on'); e.style.display = 'block';
}
function goAuth() {
  if (store.user()) return enterApp();
  if (location.href.indexOf('code=') >= 0) return;
  hideAll();
  var e = document.getElementById('auth');
  e.classList.add('on'); e.style.display = 'grid';
}
function buildNav() {
  var side = document.getElementById('sideNav');
  var bot = document.getElementById('bottomNav');
  if (side) {
    side.innerHTML = '<div class="brand logo">Verby<span>.</span></div>' + SIDE_NAV.map(function (n) {
      return '<button class="ni" data-v="' + n.v + '" type="button"><span>' + n.ico + '</span> ' + n.l + '</button>';
    }).join('');
  }
  if (bot) {
    bot.innerHTML = BOTTOM_NAV.map(function (n) {
      return '<button data-v="' + n.v + '" type="button"><span class="ico">' + n.ico + '</span>' + n.l + '</button>';
    }).join('');
  }
  document.querySelectorAll('[data-v]').forEach(function (b) {
    if (!b.closest('#sideNav') && !b.closest('#bottomNav')) return;
    b.onclick = function () { haptic(); render(b.getAttribute('data-v')); };
  });
}
function setNavOn(view) {
  document.querySelectorAll('#sideNav [data-v], #bottomNav [data-v]').forEach(function (b) {
    var v = b.getAttribute('data-v');
    var on = v === view || (view === 'profile' && v === 'discover') || (view === 'forum-thread' && v === 'forum');
    b.classList.toggle('on', on);
  });
}
function enterApp() {
  hideAll();
  ensureForumSeed();
  buildNav();
  var e = document.getElementById('app');
  e.classList.add('on'); e.style.display = 'flex';
  render('home');
}
function showPage(which) {
  hideAll();
  var el = document.getElementById('page');
  el.classList.add('on'); el.style.display = 'block';
  var back = '<button class="btn btn-g" type="button" onclick="' + (store.user() ? 'enterApp()' : 'showLanding()') + '">← Zurueck</button>';
  if (which === 'updates') {
    el.innerHTML = back + '<h1 class="h2" style="margin-top:16px">Changelog</h1>' + (window.VERBY_CHANGELOG || []).map(function (x) {
      return '<div class="card"><b>v' + esc(x.v) + '</b><p class="muted">' + esc(x.t) + '</p><p style="margin-top:8px;font-size:14px;line-height:1.5">' + esc(x.detail || '') + '</p></div>';
    }).join('');
  }
}
function ensureForumSeed() {
  var data = store.forum();
  var ver = window.VERBY_VERSION || '0';
  if (!data) data = { categories: [{ id: 'changelogs', name: 'Changelogs', desc: 'Updates' }, { id: 'community', name: 'Community', desc: 'Talk' }], threads: [], posts: {} };
  (window.VERBY_CHANGELOG || []).forEach(function (log) {
    if (data.threads.some(function (t) { return t.version === log.v; })) return;
    var tid = 't_' + log.v.replace(/\./g, '_');
    data.threads.unshift({ id: tid, cat: 'changelogs', title: 'v' + log.v + ' — ' + log.t, author: 'Discobot', bot: true, version: log.v, pinned: log.v === ver, ts: Date.now() });
    data.posts[tid] = [{ id: 'p' + Date.now(), author: 'Discobot', bot: true, ts: Date.now(), body: log.detail || log.t }];
  });
  store.setForum(data);
  return data;
}
function allChatSessions() {
  var out = [];
  store.chars().forEach(function (c) {
    var th = store.threads(c.id);
    if (!th.length) th = [{ id: 'main', title: 'Hauptchat', updated: 0 }];
    th.forEach(function (t) {
      var hist = store.chats(c.id, t.id);
      var last = hist.length ? hist[hist.length - 1] : null;
      out.push({
        charId: c.id,
        threadId: t.id,
        name: c.name,
        photo: c.photo,
        emoji: c.emoji,
        title: t.title || 'Chat',
        updated: t.updated || (last && last.ts) || 0,
        preview: last ? last.text : (c.greeting || '')
      });
    });
  });
  out.sort(function (a, b) { return b.updated - a.updated; });
  return out;
}
async function logout() {
  try { if (sb) await sb.auth.signOut(); } catch (e) {}
  localStorage.removeItem('vb_user');
  showLanding();
}
