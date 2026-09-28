const DEV = 'ninofox015@gmail.com';
const CATS = ['Alle', 'Fantasy', 'Romance', 'Sci-Fi', 'Horror', 'Slice of Life', 'Abenteuer'];
const store = {
  user: () => JSON.parse(localStorage.getItem('vb_user') || 'null'),
  setUser: (u) => localStorage.setItem('vb_user', JSON.stringify(u)),
  chars: () => JSON.parse(localStorage.getItem('vb_chars') || '[]'),
  setChars: (c) => localStorage.setItem('vb_chars', JSON.stringify(c)),
  flags: () => JSON.parse(localStorage.getItem('vb_flags') || '{"devs":[],"frames":{}}'),
  setFlags: (f) => localStorage.setItem('vb_flags', JSON.stringify(f)),
  users: () => JSON.parse(localStorage.getItem('vb_users') || '[]'),
  setUsers: (u) => localStorage.setItem('vb_users', JSON.stringify(u)),
  chats: (id) => JSON.parse(localStorage.getItem('vb_chat_' + id) || '[]'),
  setChats: (id, m) => localStorage.setItem('vb_chat_' + id, JSON.stringify(m.slice(-120))),
  notifs: () => JSON.parse(localStorage.getItem('vb_notifs') || '[]'),
  setNotifs: (n) => localStorage.setItem('vb_notifs', JSON.stringify(n.slice(0, 50))),
  theme: () => localStorage.getItem('vb_theme') || 'midnight',
  setTheme: (t) => localStorage.setItem('vb_theme', t),
  gallery: () => JSON.parse(localStorage.getItem('vb_gallery') || '[]'),
  setGallery: (g) => localStorage.setItem('vb_gallery', JSON.stringify(g.slice(0, 40))),
  forum: () => JSON.parse(localStorage.getItem('vb_forum') || 'null'),
  setForum: (f) => localStorage.setItem('vb_forum', JSON.stringify(f))
};
function isDev(u) {
  u = u || store.user();
  if (!u) return false;
  const f = store.flags();
  return (u.email || '').toLowerCase() === DEV || (f.devs || []).includes((u.email || '').toLowerCase());
}
function esc(t) {
  const d = document.createElement('div');
  d.textContent = t || '';
  return d.innerHTML;
}
function haptic() { if (navigator.vibrate) navigator.vibrate(8); }
function applyTheme() { document.documentElement.setAttribute('data-theme', store.theme()); }
applyTheme();
(function purgeAdult() {
  try {
    localStorage.removeItem('vb_mode');
    const f = store.flags();
    if (f.nsfw) { delete f.nsfw; store.setFlags(f); }
    store.setChars(store.chars().map(function (c) { c.nsfw = false; return c; }));
  } catch (e) {}
})();
let sb = null;
try {
  if (window.supabase && window.VERBY_SB) {
    sb = window.supabase.createClient(window.VERBY_SB.url, window.VERBY_SB.key, {
      auth: { detectSessionInUrl: true, flowType: 'pkce' }
    });
  }
} catch (e) { console.warn(e); }
function redirectTo() { return window.location.origin + (window.location.pathname || '/'); }
async function oauthLogin(provider) {
  if (!sb) return alert('Supabase nicht geladen');
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: redirectTo(), queryParams: { access_type: 'offline', prompt: 'consent' } }
    });
    if (error) throw error;
  } catch (e) { alert(provider + ': ' + (e.message || e)); }
}
async function loginEmail() {
  const email = document.getElementById('a-email').value.trim().toLowerCase();
  const name = document.getElementById('a-name').value.trim() || email.split('@')[0];
  const pass = document.getElementById('a-pass').value;
  if (!email.includes('@')) return alert('E-Mail noetig');
  if (!pass || pass.length < 6) return alert('Passwort min. 6 Zeichen');
  if (!sb) return alert('Supabase nicht geladen');
  try {
    let session = null;
    const signIn = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (!signIn.error && signIn.data.session) session = signIn.data.session;
    else {
      const signUp = await sb.auth.signUp({
        email: email, password: pass,
        options: { data: { name: name }, emailRedirectTo: redirectTo() }
      });
      if (signUp.error) throw signUp.error;
      session = signUp.data.session;
      if (!session) { alert('Account erstellt. ggf. E-Mail bestaetigen.'); return; }
    }
    applySession(session); haptic(); enterApp();
  } catch (e) { alert('Login: ' + (e.message || e)); }
}
function applySession(session) {
  if (!session || !session.user) return;
  const u = session.user;
  const nm = (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name || u.user_metadata.user_name)) ||
    (u.email && u.email.split('@')[0]) || 'User';
  store.setUser({ email: u.email || nm + '@oauth.user', name: nm, frame: null, id: u.id });
  const users = store.users();
  if (!users.find(function (x) { return x.id === u.id || x.email === u.email; })) {
    users.push({ email: u.email, name: nm, created: Date.now(), frame: null, id: u.id });
    store.setUsers(users);
  }
}
function hideAll() {
  ['landing', 'auth', 'app', 'chat', 'page'].forEach(function (id) {
    const e = document.getElementById(id);
    if (!e) return;
    e.classList.remove('on');
    e.style.display = 'none';
  });
}
function showLanding() {
  hideAll();
  const e = document.getElementById('landing');
  e.classList.add('on'); e.style.display = 'block';
}
function goAuth() {
  if (store.user()) { enterApp(); return; }
  hideAll();
  const e = document.getElementById('auth');
  e.classList.add('on'); e.style.display = 'grid';
}
function enterApp() {
  hideAll();
  ensureForumSeed();
  const e = document.getElementById('app');
  e.classList.add('on'); e.style.display = 'flex';
  render('home');
}
function showPage(which) {
  hideAll();
  const el = document.getElementById('page');
  el.classList.add('on'); el.style.display = 'block';
  const back = '<button class="btn btn-g" onclick="' + (store.user() ? 'enterApp()' : 'showLanding()') + '">← Zurueck</button>';
  if (which === 'updates') {
    const logs = (window.VERBY_CHANGELOG || []).map(function (x) {
      return '<div class="card"><h3>v' + esc(x.v) + '</h3><p class="muted">' + esc(x.t) + '</p>' +
        (x.detail ? '<p style="margin-top:8px;font-size:14px;line-height:1.5">' + esc(x.detail) + '</p>' : '') + '</div>';
    }).join('');
    el.innerHTML = back + '<h1 style="margin:16px 0">Changelog</h1>' + logs;
  }
}
function frameClass(u) {
  if (!u) return '';
  const f = store.flags().frames || {};
  const fr = u.frame || f[(u.email || '').toLowerCase()];
  return fr ? 'frame-' + fr : '';
}
function pushNotif(title, body) {
  const n = store.notifs();
  n.unshift({ id: Date.now(), title: title, body: body, ts: Date.now() });
  store.setNotifs(n);
}
function ensureForumSeed() {
  var data = store.forum();
  var ver = window.VERBY_VERSION || '0';
  if (!data) {
    data = {
      categories: [
        { id: 'updates', name: 'Updates', desc: 'Offizielle Ankuendigungen und Product-News von Verby Staff.', color: '#ef4444' },
        { id: 'changelogs', name: 'Changelogs & Functions', desc: 'Jedes Release im Detail: neue Funktionen, Fixes und Verbesserungen.', color: '#f59e0b' },
        { id: 'community', name: 'Community Discussion', desc: 'Diskussionen, Feedback und Ideen der Community.', color: '#8b5cf6' }
      ],
      threads: [],
      posts: {},
      seededVersion: null
    };
  }
  var logs = window.VERBY_CHANGELOG || [];
  logs.slice().reverse().forEach(function (log) {
    var exists = data.threads.some(function (t) { return t.version === log.v; });
    if (!exists) {
      var tid = 't_' + log.v.replace(/\./g, '_');
      var now = Date.now();
      data.threads.unshift({
        id: tid, cat: 'changelogs', title: 'Verby v' + log.v + ' — ' + log.t,
        author: 'Discobot', bot: true, version: log.v, pinned: log.v === ver, ts: now, replies: 1
      });
      if (log.v === ver) {
        var tid2 = 'u_' + log.v.replace(/\./g, '_');
        if (!data.threads.some(function (t) { return t.id === tid2; })) {
          data.threads.unshift({
            id: tid2, cat: 'updates', title: '[Update] v' + log.v + ' ist live',
            author: 'Discobot', bot: true, version: log.v, pinned: true, ts: now + 1, replies: 1
          });
          data.posts[tid2] = [{
            id: 'p' + now + 'u', author: 'Discobot', bot: true, ts: now,
            body: 'Hallo Community,\n\nDiscobot meldet: Verby v' + log.v + ' wurde ausgerollt.\n\nKurz:\n' + log.t + '\n\nDetails unter „Changelogs & Functions“.\n\n— Discobot'
          }];
        }
      }
      var body = 'Hallo zusammen,\n\nDiscobot veroeffentlicht automatisch diesen Post zu Version ' + log.v + '.\n\n## Zusammenfassung\n' + log.t + '\n\n## Was sich geaendert hat\n' + (log.detail || log.t) + '\n\n';
      if (log.v === '4.0.0') {
        body += '## Highlights v4.0.0\n1. Adult-Modus komplett entfernt — nur noch Friendly.\n2. Charakter-Antworten nutzen Memory, Lore, Tags und Chatverlauf.\n3. Neues Verby Forum mit Kategorien.\n4. Discobot schreibt bei jedem Update automatisch Threads.\n5. Photo Editor und Charakter-Fotos bleiben.\n\n';
      }
      body += '## Hinweis\nFeedback gerne unter Community Discussion.\n\n— Discobot · Verby System';
      data.posts[tid] = [{ id: 'p' + now, author: 'Discobot', bot: true, ts: now, body: body }];
    }
  });
  data.seededVersion = ver;
  store.setForum(data);
  return data;
}
function forumData() { return ensureForumSeed(); }
function renderForumList(catId) {
  var data = forumData();
  var threads = data.threads.filter(function (t) { return !catId || t.cat === catId; });
  threads.sort(function (a, b) {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.ts - a.ts;
  });
  if (!threads.length) return '<div class="empty">Noch keine Threads.</div>';
  return threads.map(function (t) {
    var when = new Date(t.ts).toLocaleString('de-DE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    return '<div class="forum-thread" onclick="openForumThread(\'' + t.id + '\')">' +
      '<div><div class="tt">' + (t.pinned ? '📌 ' : '') + esc(t.title) + '</div>' +
      '<div class="muted" style="margin-top:4px">' + esc(t.author) + (t.bot ? ' · Bot' : '') + '</div></div>' +
      '<div class="meta">' + when + '</div></div>';
  }).join('');
}
function openForumThread(tid) { window._forumThread = tid; render('forum-thread'); }
function render(view) {
  document.querySelectorAll('.nb[data-v]').forEach(function (b) {
    b.classList.toggle('on', b.dataset.v === view || (view === 'forum-thread' && b.dataset.v === 'forum'));
  });
  const root = document.getElementById('view');
  if (!root) return;
  root.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  setTimeout(function () { renderReal(view); }, 120);
}
function renderReal(view) {
  const root = document.getElementById('view');
  const u = store.user();
  if (!root || !u) return;
  if (view === 'home') {
    const list = store.chars();
    root.innerHTML =
      '<div class="card row glass"><div class="avatar ' + frameClass(u) + '">' + (u.name || '?')[0].toUpperCase() +
      '</div><div class="grow"><div class="h2">Hey, ' + esc(u.name) + '</div>' +
      '<div class="muted">' + esc(u.email || '') + ' · Friendly</div></div></div>' +
      '<div class="section-title">Deine Charaktere</div>' +
      (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Noch keine Charaktere.</div>');
  }
  if (view === 'explore') {
    const cat = window._cat || 'Alle';
    let list = store.chars();
    if (cat !== 'Alle') list = list.filter(function (c) { return (c.category || 'Fantasy') === cat; });
    root.innerHTML =
      '<div class="h2">Explore</div><div class="cat-row">' +
      CATS.map(function (c) {
        return '<button class="cat ' + (c === cat ? 'on' : '') + '" onclick="window._cat=\'' + c + '\';render(\'explore\')">' + c + '</button>';
      }).join('') + '</div>' +
      (list.length ? list.map(function (c) { return charCard(c, true); }).join('') : '<div class="empty">Nichts hier.</div>');
  }
  if (view === 'forum') {
    var data = forumData();
    var tab = window._forumTab || 'home';
    var tabs = '<div class="forum-tabs">' +
      '<button class="forum-tab ' + (tab === 'home' ? 'on' : '') + '" onclick="window._forumTab=\'home\';render(\'forum\')">Uebersicht</button>' +
      data.categories.map(function (c) {
        return '<button class="forum-tab ' + (tab === c.id ? 'on' : '') + '" onclick="window._forumTab=\'' + c.id + '\';render(\'forum\')">' + esc(c.name) + '</button>';
      }).join('') + '</div>';
    if (tab === 'home') {
      root.innerHTML = '<div class="forum-wrap"><div class="h2">Verby Forum</div><p class="muted" style="margin-bottom:14px">Updates, Changelogs und Community — Discobot postet automatisch.</p>' + tabs +
        data.categories.map(function (c) {
          return '<div class="forum-cat"><div class="forum-cat-h"><div><h3>' + esc(c.name) + '</h3><p>' + esc(c.desc) + '</p></div></div>' + renderForumList(c.id) + '</div>';
        }).join('') + '</div>';
    } else {
      var cat = data.categories.find(function (c) { return c.id === tab; });
      root.innerHTML = '<div class="forum-wrap"><div class="h2">' + esc(cat ? cat.name : 'Forum') + '</div>' + tabs +
        '<div class="forum-cat">' + renderForumList(tab) + '</div></div>';
    }
  }
  if (view === 'forum-thread') {
    var data = forumData();
    var t = data.threads.find(function (x) { return x.id === window._forumThread; });
    var posts = (data.posts[window._forumThread] || []);
    if (!t) { root.innerHTML = '<div class="empty">Thread nicht gefunden.</div>'; return; }
    root.innerHTML =
      '<button class="btn btn-g" onclick="render(\'forum\')">← Forum</button>' +
      '<h2 style="margin:14px 0 8px;font-size:20px">' + esc(t.title) + '</h2>' +
      '<p class="muted" style="margin-bottom:16px">' + esc(t.author) + (t.bot ? ' · Discobot' : '') + '</p>' +
      posts.map(function (p) {
        return '<div class="forum-post"><b>' + esc(p.author) + '</b>' +
          (p.bot ? '<span class="bot-badge">BOT</span>' : '') +
          '<span class="muted" style="margin-left:8px;font-size:12px">' + new Date(p.ts).toLocaleString('de-DE') + '</span>' +
          '<div class="body">' + esc(p.body) + '</div></div>';
      }).join('');
  }
  if (view === 'create') {
    root.innerHTML =
      '<div class="card glass"><div class="h2">Charakter erstellen</div>' +
      '<div class="form-g"><label>Profilbild</label><div class="row"><div class="avatar lg" id="cPreview" style="width:72px;height:72px">✨</div>' +
      '<div class="grow"><input type="file" id="cPhoto" accept="image/*"></div></div></div>' +
      '<div class="form-g"><label>Name *</label><input id="cn"></div>' +
      '<div class="form-g"><label>Begruessung *</label><textarea id="cg"></textarea></div>' +
      '<div class="form-g"><label>Persoenlichkeit / Tags</label><input id="ctags" placeholder="freundlich, neugierig"></div>' +
      '<div class="form-g"><label>Kurzbeschreibung</label><input id="cs"></div>' +
      '<div class="form-g"><label>Memory / Lore</label><textarea id="cl"></textarea></div>' +
      '<div class="form-g"><label>Kategorie</label><select id="cc">' +
      CATS.filter(function (c) { return c !== 'Alle'; }).map(function (c) { return '<option>' + c + '</option>'; }).join('') +
      '</select></div><button class="btn btn-p" onclick="saveChar()">Speichern</button></div>';
    window._cPhotoData = null;
    var finp = document.getElementById('cPhoto');
    if (finp) {
      finp.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f || f.size > 2.5 * 1024 * 1024) return;
        var reader = new FileReader();
        reader.onload = function () {
          window._cPhotoData = reader.result;
          var prev = document.getElementById('cPreview');
          if (prev) { prev.textContent = ''; prev.style.backgroundImage = 'url(' + reader.result + ')'; prev.style.backgroundSize = 'cover'; }
        };
        reader.readAsDataURL(f);
      };
    }
  }
  if (view === 'photo') {
    root.innerHTML =
      '<div class="card glass"><div class="h2">Photo Editor</div>' +
      '<div class="form-g"><input type="file" id="peFile" accept="image/*"></div>' +
      '<canvas id="peCanvas" style="max-width:100%;border-radius:12px;border:1px solid var(--b);display:none;margin:8px 0"></canvas>' +
      '<div class="form-g"><label>Helligkeit</label><input type="range" id="peBright" min="50" max="150" value="100"></div>' +
      '<div class="form-g"><label>Kontrast</label><input type="range" id="peContrast" min="50" max="150" value="100"></div>' +
      '<div class="form-g"><label>Saettigung</label><input type="range" id="peSat" min="0" max="200" value="100"></div>' +
      '<button class="btn btn-g" onclick="peFlip()">Spiegeln</button> ' +
      '<button class="btn btn-p" onclick="peSave()">In Gallery</button> ' +
      '<button class="btn btn-g" onclick="peUseForChar()">Fuer Charakter</button></div>';
    window._peImg = null; window._peFlip = false;
    function peRedraw() {
      var canvas = document.getElementById('peCanvas');
      if (!canvas || !window._peImg) return;
      var img = window._peImg;
      var b = (document.getElementById('peBright').value || 100) / 100;
      var c = (document.getElementById('peContrast').value || 100) / 100;
      var s = (document.getElementById('peSat').value || 100) / 100;
      var maxW = Math.min(560, root.clientWidth - 40);
      var scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale; canvas.height = img.height * scale;
      canvas.style.display = 'block';
      var ctx = canvas.getContext('2d');
      ctx.save();
      ctx.filter = 'brightness(' + b + ') contrast(' + c + ') saturate(' + s + ')';
      if (window._peFlip) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
    window._peRedraw = peRedraw;
    document.getElementById('peFile').onchange = function (e) {
      var f = e.target.files && e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () { window._peImg = img; peRedraw(); };
        img.src = reader.result;
      };
      reader.readAsDataURL(f);
    };
    ['peBright', 'peContrast', 'peSat'].forEach(function (id) {
      var el = document.getElementById(id); if (el) el.oninput = peRedraw;
    });
  }
  if (view === 'gallery') {
    const g = store.gallery();
    root.innerHTML = '<div class="h2">Gallery</div>' + (g.length ? g.map(function (x) {
      var av = x.photo ? '<div class="avatar" style="background-image:url(' + x.photo + ');background-size:cover"></div>' : '<div class="avatar">' + (x.emoji || '🖼️') + '</div>';
      return '<div class="card row">' + av + '<div><b>' + esc(x.name) + '</b></div></div>';
    }).join('') : '<div class="empty">Leer</div>');
  }
  if (view === 'inbox') {
    const n = store.notifs();
    root.innerHTML = '<div class="h2">Inbox</div>' + (n.length ? n.map(function (x) {
      return '<div class="card"><b>' + esc(x.title) + '</b><p class="muted">' + esc(x.body) + '</p></div>';
    }).join('') : '<div class="empty">Keine</div>');
  }
  if (view === 'dev') {
    if (!isDev()) { root.innerHTML = '<div class="empty">Kein Dev-Zugriff.</div>'; return; }
    var f = store.flags();
    root.innerHTML =
      '<div class="card glass"><div class="h2">Dev Panel</div>' +
      '<p class="muted">Adult-Modus existiert nicht mehr (v4.0).</p>' +
      '<div class="form-g"><label>E-Mail</label><input id="de"></div>' +
      '<button class="btn btn-p" onclick="devAction(\'dev\')">Zum Dev</button> ' +
      '<button class="btn btn-d" onclick="devAction(\'undev\')">Dev entziehen</button>' +
      '<div class="form-g" style="margin-top:14px"><label>Rahmen</label><input id="fe"><select id="ff"><option value="">Kein</option><option value="gold">Gold</option><option value="purple">Lila</option><option value="cyan">Cyan</option></select></div>' +
      '<button class="btn btn-g" onclick="setFrame()">Setzen</button> ' +
      '<button class="btn btn-g" onclick="devExport()">Export</button> ' +
      '<button class="btn btn-d" onclick="devWipeChars()">Chars loeschen</button>' +
      '<p class="muted" style="margin-top:12px">Devs: ' + esc([DEV].concat(f.devs || []).join(', ')) + '</p></div>';
  }
  if (view === 'settings') {
    root.innerHTML =
      '<div class="card glass"><div class="h2">Settings</div><p class="muted">' + esc(u.email || '') + '</p>' +
      '<p class="muted">Version ' + (window.VERBY_VERSION || '') + ' · Friendly only</p>' +
      '<button class="btn btn-g" style="width:100%;margin-top:8px" onclick="showPage(\'updates\')">Changelog</button>' +
      '<button class="btn btn-d" style="width:100%;margin-top:12px" onclick="logout()">Logout</button></div>';
  }
  if (view === 'profile' && window._prof) {
    const c = window._prof;
    var avHtml = c.photo
      ? '<div class="avatar lg glow" style="margin:0 auto 12px;background-image:url(' + c.photo + ');background-size:cover"></div>'
      : '<div class="avatar lg glow" style="margin:0 auto 12px">' + (c.emoji || '✨') + '</div>';
    root.innerHTML = '<div style="text-align:center">' + avHtml +
      '<div class="h2">' + esc(c.name) + '</div><p class="muted">' + esc(c.short || '') + '</p>' +
      '<button class="btn btn-p" onclick="openChat(\'' + c.id + '\')">Chat</button></div>';
  }
}
function charCard(c, withProf) {
  const click = withProf
    ? "window._prof=store.chars().find(function(x){return x.id==='" + c.id + "'});render('profile')"
    : "openChat('" + c.id + "')";
  var avStyle = c.photo ? ' style="background-image:url(' + c.photo + ');background-size:cover;background-position:center"' : '';
  var avInner = c.photo ? '' : (c.emoji || '✨');
  return '<div class="card row" onclick="' + click + '"><div class="avatar"' + avStyle + '>' + avInner +
    '</div><div class="grow"><b>' + esc(c.name) + '</b><div class="muted">' + esc(c.short || c.category || '') + '</div></div></div>';
}
function saveChar() {
  const name = document.getElementById('cn').value.trim();
  const greeting = document.getElementById('cg').value.trim();
  if (!name || !greeting) return alert('Name + Begruessung');
  const list = store.chars();
  const item = {
    id: 'c' + Date.now(), name: name, greeting: greeting,
    short: document.getElementById('cs').value.trim(),
    lore: document.getElementById('cl').value.trim(),
    tags: (document.getElementById('ctags') && document.getElementById('ctags').value.trim()) || '',
    category: document.getElementById('cc').value, emoji: '✨',
    photo: window._cPhotoData || null, owner: store.user().email
  };
  list.unshift(item); store.setChars(list);
  const g = store.gallery();
  g.unshift({ name: name, emoji: '✨', photo: item.photo }); store.setGallery(g);
  window._cPhotoData = null; pushNotif('Charakter erstellt', name); haptic(); alert('Gespeichert'); render('home');
}
function devAction(type) {
  const e = document.getElementById('de').value.trim().toLowerCase();
  if (!e) return alert('E-Mail');
  const f = store.flags(); f.devs = f.devs || [];
  if (type === 'dev' && f.devs.indexOf(e) < 0) f.devs.push(e);
  if (type === 'undev') f.devs = f.devs.filter(function (x) { return x !== e; });
  store.setFlags(f); alert('OK'); render('dev');
}
function setFrame() {
  const e = document.getElementById('fe').value.trim().toLowerCase();
  const fr = document.getElementById('ff').value;
  if (!e) return;
  const f = store.flags(); f.frames = f.frames || {};
  if (fr) f.frames[e] = fr; else delete f.frames[e];
  store.setFlags(f); alert('OK');
}
function devExport() {
  var blob = new Blob([JSON.stringify({ users: store.users(), chars: store.chars(), flags: store.flags(), forum: store.forum() }, null, 2)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'verby-export.json'; a.click();
}
function devWipeChars() {
  if (!confirm('Alle Charaktere loeschen?')) return;
  store.setChars([]); render('dev');
}
async function logout() {
  try { if (sb) await sb.auth.signOut(); } catch (e) {}
  localStorage.removeItem('vb_user'); showLanding();
}
let cur = null;
function openChat(id) {
  cur = store.chars().find(function (c) { return c.id === id; });
  if (!cur) return;
  hideAll();
  const ch = document.getElementById('chat');
  ch.classList.add('on'); ch.style.display = 'flex';
  const av = document.getElementById('cAv');
  if (cur.photo) { av.textContent = ''; av.style.backgroundImage = 'url(' + cur.photo + ')'; av.style.backgroundSize = 'cover'; }
  else { av.textContent = cur.emoji || '✨'; av.style.backgroundImage = ''; }
  document.getElementById('cName').textContent = cur.name;
  document.getElementById('cSub').textContent = cur.short || cur.category || '';
  let hist = store.chats(cur.id);
  if (!hist.length) { hist = [{ role: 'bot', text: cur.greeting }]; store.setChats(cur.id, hist); }
  paintMsgs(hist); haptic();
}
function openProfileFromChat() {
  if (!cur) return;
  window._prof = cur;
  hideAll();
  document.getElementById('app').style.display = 'flex';
  document.getElementById('app').classList.add('on');
  render('profile');
}
function paintMsgs(hist) {
  const msgs = document.getElementById('msgs');
  msgs.innerHTML = hist.map(function (m) {
    return '<div class="msg ' + (m.role === 'user' ? 'me' : 'bot') + '">' + fmt(m.text) + '</div>';
  }).join('');
  msgs.scrollTop = 99999;
}
function fmt(t) {
  return esc(t).replace(/\*([^*]+)\*/g, '<span class="act">*$1*</span>').replace(/\n/g, '<br>');
}
document.getElementById('chatBack').onclick = function () { enterApp(); };
document.getElementById('send').onclick = sendMsg;
document.getElementById('inp').onkeypress = function (e) { if (e.key === 'Enter') sendMsg(); };
function sendMsg() {
  const t = document.getElementById('inp').value.trim();
  if (!t || !cur) return;
  document.getElementById('inp').value = '';
  haptic();
  let hist = store.chats(cur.id);
  hist.push({ role: 'user', text: t });
  document.getElementById('msgs').innerHTML += '<div class="msg me">' + fmt(t) + '</div><div class="typing-dots" id="ty"><span></span><span></span><span></span></div>';
  document.getElementById('msgs').scrollTop = 99999;
  setTimeout(function () {
    var ty = document.getElementById('ty'); if (ty) ty.remove();
    var reply = characterReply(cur, hist, t);
    hist.push({ role: 'bot', text: reply });
    store.setChats(cur.id, hist);
    document.getElementById('msgs').innerHTML += '<div class="msg bot">' + fmt(reply) + '</div>';
    document.getElementById('msgs').scrollTop = 99999;
  }, 450 + Math.random() * 400);
}
function characterReply(char, hist, userText) {
  var low = userText.toLowerCase();
  var tags = (char.tags || '').toLowerCase();
  var lore = char.lore || '';
  var name = char.name;
  var short = char.short || '';
  var hasAct = /\*[^*]+\*/.test(userText);
  if (lore && /(wer bist|erinner|weißt du|memory|über dich|stell dich)/.test(low))
    return buildInVoice(char, lore + (short ? '\n' + short : ''));
  if (/(wer bist|wie heisst|wie heißt)/.test(low))
    return buildInVoice(char, 'Ich bin ' + name + (short ? '. ' + short : '.') + (tags ? ' Man beschreibt mich oft als: ' + char.tags + '.' : ''));
  if (/(was magst|hobby|interess)/.test(low))
    return buildInVoice(char, tags ? 'Mich ziehen Dinge an, die zu ' + char.tags + ' passen. Was beschaeftigt dich?' : 'Was beschaeftigt dich gerade?');
  if (hasAct) return reactToAction(char, userText);
  if (/\?/.test(userText)) return answerQuestion(char, userText);
  var lastBot = '';
  for (var i = hist.length - 1; i >= 0; i--) { if (hist[i].role === 'bot') { lastBot = hist[i].text; break; } }
  return conversationalTurn(char, userText, lastBot);
}
function buildInVoice(char, content) {
  var tags = (char.tags || '').toLowerCase();
  if (/trocken|sarkast|dry/.test(tags)) return content.replace(/\.$/, '') + '. Mehr muss man dazu nicht sagen.';
  if (/freundlich|warm|kind/.test(tags)) return '*laechelt*\n' + content;
  if (/mysteri|dunkel|geheim/.test(tags)) return '…' + content;
  if (/energ|laut|hyper/.test(tags)) return content + '!!';
  return content;
}
function reactToAction(char, userText) {
  var act = (userText.match(/\*([^*]+)\*/g) || []).map(function (x) { return x.replace(/\*/g, ''); }).join(', ');
  var tags = (char.tags || '').toLowerCase();
  var lines = [];
  if (/schlag|slap|hit/i.test(act)) { lines.push('*weicht leicht aus*'); lines.push('Hey — alles gut bei dir?'); }
  else if (/umarm|hug|hold/i.test(act)) { lines.push('*erwidert die Geste vorsichtig*'); lines.push('Das ist unerwartet. Aber nicht unangenehm.'); }
  else if (/wink|wave/i.test(act)) { lines.push('*winkt zurueck*'); lines.push('Na, was gibt\'s?'); }
  else { lines.push('*reagiert auf: ' + act + '*'); lines.push('Ich hab das bemerkt. Was steckt dahinter?'); }
  if (/schuechtern|shy/.test(tags)) lines[1] = 'Oh… okay. Sag mir, wenn das zu viel war.';
  return lines.join('\n');
}
function answerQuestion(char, userText) {
  return buildInVoice(char, 'Gute Frage. Aus meiner Sicht als ' + char.name +
    (char.short ? ' (' + char.short + ')' : '') + ': Es kommt auf den Kontext an. Was denkst *du* dazu?');
}
function conversationalTurn(char, userText, lastBot) {
  var tags = (char.tags || '').toLowerCase();
  var openers = /freundlich|warm/.test(tags) ? ['Das verstehe ich.', 'Danke, dass du das teilst.']
    : /trocken|sarkast/.test(tags) ? ['Interessant.', 'Okay, notiert.']
    : /neugier/.test(tags) ? ['Oh?', 'Was steckt dahinter —']
    : ['Mhm.', 'Ich hoere.'];
  var opener = openers[Math.floor(Math.random() * openers.length)];
  var follow = ['Was bedeutet das fuer dich gerade?', 'Wie fuehlt sich das an?', 'Und was kommt als Naechstes?', 'Welcher Teil beschaeftigt dich am meisten?'];
  var pick = follow[Math.floor(Math.random() * follow.length)];
  if (lastBot && lastBot.indexOf(pick.slice(0, 12)) >= 0) pick = follow[(follow.indexOf(pick) + 1) % follow.length];
  var words = userText.split(/\s+/).filter(function (w) { return w.length > 4; }).slice(0, 3);
  var ref = words.length ? ' Du hast „' + words.join(' ') + '“ angesprochen — ' : ' ';
  return buildInVoice(char, opener + ref + pick);
}
function peFlip() { window._peFlip = !window._peFlip; if (window._peRedraw) window._peRedraw(); }
function peSave() {
  var canvas = document.getElementById('peCanvas');
  if (!canvas || !window._peImg) return alert('Erst Bild laden');
  var g = store.gallery();
  g.unshift({ name: 'Edit ' + new Date().toLocaleTimeString(), photo: canvas.toDataURL('image/jpeg', 0.88), emoji: '🖼️' });
  store.setGallery(g); alert('Gespeichert');
}
function peUseForChar() {
  var canvas = document.getElementById('peCanvas');
  if (!canvas || !window._peImg) return alert('Erst Bild laden');
  window._cPhotoData = canvas.toDataURL('image/jpeg', 0.88);
  alert('Foto gemerkt'); render('create');
}
document.querySelectorAll('.nb[data-v]').forEach(function (b) {
  b.onclick = function () { haptic(); render(b.dataset.v); };
});
window.addEventListener('online', function () { document.getElementById('offlineBar').classList.remove('on'); });
window.addEventListener('offline', function () { document.getElementById('offlineBar').classList.add('on'); });
if (!navigator.onLine) document.getElementById('offlineBar').classList.add('on');
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
function runUpdateScreen(then) {
  const prev = localStorage.getItem('vb_app_version');
  const ver = window.VERBY_VERSION || '0';
  if (prev === ver) { then(); return; }
  const ov = document.getElementById('updateOverlay');
  const bar = document.getElementById('updateBar');
  const sub = document.getElementById('updateSub');
  if (!ov) { then(); return; }
  ov.classList.add('on');
  if (sub) {
    var log = (window.VERBY_CHANGELOG || [])[0];
    sub.textContent = 'v' + ver + (log ? ' · ' + log.t.slice(0, 42) + '…' : '');
  }
  const maxMs = 7000, start = Date.now();
  const timer = setInterval(function () {
    const elapsed = Date.now() - start;
    let p = Math.min(100, (elapsed / maxMs) * 100);
    if (elapsed > 1200) p = Math.min(100, p + 10);
    if (bar) bar.style.width = p + '%';
    if (p >= 100 || elapsed >= maxMs) {
      clearInterval(timer);
      if (bar) bar.style.width = '100%';
      localStorage.setItem('vb_app_version', ver);
      try { ensureForumSeed(); } catch (e) {}
      setTimeout(function () { ov.classList.remove('on'); then(); }, 200);
    }
  }, 80);
}
(async function boot() {
  runUpdateScreen(async function () {
    try {
      if (sb) {
        const res = await sb.auth.getSession();
        if (res.data && res.data.session) { applySession(res.data.session); enterApp(); return; }
        sb.auth.onAuthStateChange(function (event, session) {
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            applySession(session); enterApp();
          }
          if (event === 'SIGNED_OUT') localStorage.removeItem('vb_user');
        });
      }
    } catch (e) {}
    if (store.user()) enterApp(); else showLanding();
  });
})();
