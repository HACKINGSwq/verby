const DEV = 'ninofox015@gmail.com';
const CATS = ['Alle', 'Fantasy', 'Romance', 'Sci-Fi', 'Horror', 'Slice of Life', 'Abenteuer'];
const store = {
  user: () => JSON.parse(localStorage.getItem('vb_user') || 'null'),
  setUser: (u) => localStorage.setItem('vb_user', JSON.stringify(u)),
  chars: () => JSON.parse(localStorage.getItem('vb_chars') || '[]'),
  setChars: (c) => localStorage.setItem('vb_chars', JSON.stringify(c)),
  mode: () => localStorage.getItem('vb_mode') || 'friendly',
  setMode: (m) => localStorage.setItem('vb_mode', m),
  flags: () => JSON.parse(localStorage.getItem('vb_flags') || '{"devs":[],"nsfw":[],"frames":{}}'),
  setFlags: (f) => localStorage.setItem('vb_flags', JSON.stringify(f)),
  users: () => JSON.parse(localStorage.getItem('vb_users') || '[]'),
  setUsers: (u) => localStorage.setItem('vb_users', JSON.stringify(u)),
  chats: (id) => JSON.parse(localStorage.getItem('vb_chat_' + id) || '[]'),
  setChats: (id, m) => localStorage.setItem('vb_chat_' + id, JSON.stringify(m.slice(-100))),
  notifs: () => JSON.parse(localStorage.getItem('vb_notifs') || '[]'),
  setNotifs: (n) => localStorage.setItem('vb_notifs', JSON.stringify(n.slice(0, 50))),
  theme: () => localStorage.getItem('vb_theme') || 'midnight',
  setTheme: (t) => localStorage.setItem('vb_theme', t),
  gallery: () => JSON.parse(localStorage.getItem('vb_gallery') || '[]'),
  setGallery: (g) => localStorage.setItem('vb_gallery', JSON.stringify(g.slice(0, 40))),
};
function isDev(u) {
  u = u || store.user();
  if (!u) return false;
  const f = store.flags();
  return (u.email || '').toLowerCase() === DEV || (f.devs || []).includes((u.email || '').toLowerCase());
}
function adultAllowed(u) {
  u = u || store.user();
  if (!u) return false;
  return isDev(u) || (store.flags().nsfw || []).includes((u.email || '').toLowerCase());
}
function esc(t) {
  const d = document.createElement('div');
  d.textContent = t || '';
  return d.innerHTML;
}
function haptic() {
  if (navigator.vibrate) navigator.vibrate(8);
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', store.theme());
}
applyTheme();
let sb = null;
try {
  if (window.supabase && window.VERBY_SB) {
    sb = window.supabase.createClient(window.VERBY_SB.url, window.VERBY_SB.key, {
      auth: { detectSessionInUrl: true, flowType: 'pkce' }
    });
  }
} catch (e) {
  console.warn('Supabase init', e);
}
function redirectTo() {
  return window.location.origin + (window.location.pathname || '/');
}
async function oauthLogin(provider) {
  if (!sb) {
    alert('Supabase nicht geladen. Seite neu laden.');
    return;
  }
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: redirectTo(),
        queryParams: { access_type: 'offline', prompt: 'consent' }
      }
    });
    if (error) throw error;
  } catch (e) {
    alert(
      provider + ' Login Fehler: ' + (e.message || e) +
      '\n\nIn Supabase → Authentication → Providers → Google aktivieren.' +
      '\nClient ID + Secret dort eintragen.' +
      '\nRedirect URL: ' + redirectTo()
    );
  }
}
async function loginEmail() {
  const email = document.getElementById('a-email').value.trim().toLowerCase();
  const name = document.getElementById('a-name').value.trim() || email.split('@')[0];
  const pass = document.getElementById('a-pass').value;
  if (!email.includes('@')) return alert('Gueltige E-Mail noetig');
  if (!pass || pass.length < 6) return alert('Passwort min. 6 Zeichen');
  if (!sb) return alert('Supabase nicht geladen');
  try {
    let session = null;
    const signIn = await sb.auth.signInWithPassword({ email: email, password: pass });
    if (!signIn.error && signIn.data.session) {
      session = signIn.data.session;
    } else {
      const signUp = await sb.auth.signUp({
        email: email,
        password: pass,
        options: { data: { name: name }, emailRedirectTo: redirectTo() }
      });
      if (signUp.error) throw signUp.error;
      session = signUp.data.session;
      if (!session) {
        alert('Account erstellt. Falls E-Mail-Bestaetigung an ist: Mail oeffnen, dann einloggen.');
        return;
      }
    }
    applySession(session);
    haptic();
    enterApp();
  } catch (e) {
    alert('Login: ' + (e.message || e));
  }
}
function applySession(session) {
  if (!session || !session.user) return;
  const u = session.user;
  const nm =
    (u.user_metadata && (u.user_metadata.full_name || u.user_metadata.name || u.user_metadata.user_name)) ||
    (u.email && u.email.split('@')[0]) ||
    'User';
  store.setUser({
    email: u.email || nm + '@oauth.user',
    name: nm,
    frame: null,
    id: u.id,
    provider: u.app_metadata && u.app_metadata.provider
  });
  const users = store.users();
  if (!users.find((x) => x.id === u.id || x.email === u.email)) {
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
  e.classList.add('on');
  e.style.display = 'block';
}
function goAuth() {
  if (store.user()) {
    enterApp();
    return;
  }
  hideAll();
  const e = document.getElementById('auth');
  e.classList.add('on');
  e.style.display = 'grid';
}
function enterApp() {
  hideAll();
  const e = document.getElementById('app');
  e.classList.add('on');
  e.style.display = 'flex';
  updateModePill();
  render('home');
}
function showPage(which) {
  hideAll();
  const el = document.getElementById('page');
  el.classList.add('on');
  el.style.display = 'block';
  const back =
    '<button class="btn btn-g" onclick="' +
    (store.user() ? 'enterApp()' : 'showLanding()') +
    '">← Zurueck</button>';
  if (which === 'about') {
    el.innerHTML =
      back +
      '<h1 style="margin:16px 0">Unternehmen</h1><div class="card glass"><p>Verby mit Supabase Auth.</p><p class="muted">Dev: ' +
      DEV +
      '</p></div>';
  }
  if (which === 'safety') {
    el.innerHTML =
      back +
      '<h1 style="margin:16px 0">Safety</h1><div class="card"><p class="muted">Friendly ist moderiert.</p></div>';
  }
  if (which === 'roadmap') {
    el.innerHTML =
      back +
      '<h1 style="margin:16px 0">Roadmap</h1><div class="card"><p class="muted">Photo Editor, Google OAuth, Supabase, PWA, Explore</p></div>';
  }
  if (which === 'updates') {
    const logs = (window.VERBY_CHANGELOG || [])
      .map(function (x) {
        return (
          '<div class="card"><h3>v' +
          esc(x.v) +
          '</h3><p class="muted">' +
          esc(x.t) +
          '</p></div>'
        );
      })
      .join('');
    el.innerHTML = back + '<h1 style="margin:16px 0">Changelog</h1>' + logs;
  }
}
function updateModePill() {
  const m = store.mode();
  const pill = document.getElementById('modePill');
  if (!pill) return;
  pill.textContent = m === 'adult' ? 'Adult' : 'Friendly';
  pill.classList.toggle('adult', m === 'adult');
  if (!adultAllowed() && m === 'adult') {
    store.setMode('friendly');
    pill.textContent = 'Friendly';
    pill.classList.remove('adult');
  }
}
function visibleChars() {
  const list = store.chars();
  return store.mode() === 'friendly' ? list.filter(function (c) { return !c.nsfw; }) : list;
}
function moderate(text) {
  if (store.mode() !== 'friendly') return text;
  if (/\b(sex|fick|nackt|porn|nsfw)\b/gi.test(text)) return '*laechelt*\nLass uns freundlich bleiben.';
  return text;
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
function skeleton() {
  return '<div>' + [1, 2, 3].map(function () { return '<div class="skel skel-card"></div>'; }).join('') + '</div>';
}
function render(view) {
  document.querySelectorAll('.nb[data-v]').forEach(function (b) {
    b.classList.toggle('on', b.dataset.v === view);
  });
  const root = document.getElementById('view');
  if (!root) return;
  root.innerHTML = skeleton();
  setTimeout(function () { renderReal(view); }, 180);
}
function renderReal(view) {
  const root = document.getElementById('view');
  const u = store.user();
  if (!root || !u) return;
  if (view === 'home') {
    const list = visibleChars();
    let modeSel = '<select id="modeSel" style="width:auto;min-width:110px"><option value="friendly">Friendly</option>';
    if (adultAllowed()) modeSel += '<option value="adult">Adult</option>';
    modeSel += '</select>';
    root.innerHTML =
      '<div class="card row glass"><div class="avatar ' +
      frameClass(u) +
      '">' +
      (u.name || '?')[0].toUpperCase() +
      '</div><div class="grow"><div class="h2">Hey, ' +
      esc(u.name) +
      '</div><div class="muted">' +
      esc(u.email || '') +
      '</div></div>' +
      modeSel +
      '</div><div class="section-title">Deine Charaktere</div>' +
      (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Noch keine Charaktere.</div>');
    const sel = document.getElementById('modeSel');
    if (sel) {
      sel.value = store.mode();
      sel.onchange = function (e) {
        if (e.target.value === 'adult' && !adultAllowed()) {
          e.target.value = 'friendly';
          return;
        }
        store.setMode(e.target.value);
        updateModePill();
        render('home');
      };
    }
  }
  if (view === 'explore') {
    const cat = window._cat || 'Alle';
    let list = visibleChars();
    if (cat !== 'Alle') list = list.filter(function (c) { return (c.category || 'Fantasy') === cat; });
    root.innerHTML =
      '<div class="h2">Explore 2.0</div><div class="cat-row">' +
      CATS.map(function (c) {
        return (
          '<button class="cat ' +
          (c === cat ? 'on' : '') +
          '" onclick="window._cat=\'' +
          c +
          '\';render(\'explore\')">' +
          c +
          '</button>'
        );
      }).join('') +
      '</div>' +
      (list.length ? list.map(function (c) { return charCard(c, true); }).join('') : '<div class="empty">Nichts hier.</div>');
  }
  if (view === 'community') {
    const users = store.users().slice(-30).reverse();
    root.innerHTML =
      '<div class="h2">Community</div>' +
      (users.length
        ? users.map(function (x) {
            return (
              '<div class="card row"><div class="avatar ' +
              frameClass(x) +
              '">' +
              (x.name || '?')[0].toUpperCase() +
              '</div><div><b>' +
              esc(x.name) +
              '</b><div class="muted">' +
              esc(x.email || '') +
              '</div></div></div>'
            );
          }).join('')
        : '<div class="empty">Noch leer.</div>');
  }
  if (view === 'create') {
    root.innerHTML =
      '<div class="card glass"><div class="h2">Charakter erstellen</div>' +
      '<div class="form-g"><label>Profilbild</label>' +
      '<div class="row" style="gap:12px;align-items:center">' +
      '<div class="avatar lg" id="cPreview" style="width:72px;height:72px;font-size:28px">✨</div>' +
      '<div class="grow"><input type="file" id="cPhoto" accept="image/*" style="font-size:13px">' +
      '<p class="muted" style="margin-top:6px">JPG/PNG, max 2.5 MB</p></div></div></div>' +
      '<div class="form-g"><label>Name *</label><input id="cn"></div>' +
      '<div class="form-g"><label>Begruessung *</label><textarea id="cg"></textarea></div>' +
      '<div class="form-g"><label>Kurzbeschreibung</label><input id="cs"></div>' +
      '<div class="form-g"><label>Aussehen / Tags</label><input id="ctags" placeholder="z.B. blond, friendly"></div>' +
      '<div class="form-g"><label>Alter (optional)</label><input id="cage" type="number" min="1" max="999" placeholder="18+"></div>' +
      '<div class="form-g"><label>Kategorie</label><select id="cc">' +
      CATS.filter(function (c) { return c !== 'Alle'; }).map(function (c) { return '<option>' + c + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="form-g"><label>Memory / Lore</label><textarea id="cl"></textarea></div>' +
      (store.mode() === 'adult' && adultAllowed()
        ? '<label class="muted"><input type="checkbox" id="cnsfw"> Intern / Adult-Charakter</label><br><br>'
        : '') +
      '<button class="btn btn-p" onclick="saveChar()">Speichern</button> ' +
      '<button class="btn btn-g" onclick="render(\'photo\')">Zum Photo Editor</button></div>';
    window._cPhotoData = null;
    var finp = document.getElementById('cPhoto');
    if (finp) {
      finp.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        if (f.size > 2.5 * 1024 * 1024) {
          alert('Bild max. 2.5 MB');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          window._cPhotoData = reader.result;
          var prev = document.getElementById('cPreview');
          if (prev) {
            prev.textContent = '';
            prev.style.backgroundImage = 'url(' + reader.result + ')';
            prev.style.backgroundSize = 'cover';
            prev.style.backgroundPosition = 'center';
          }
        };
        reader.readAsDataURL(f);
      };
    }
  }
  if (view === 'inbox') {
    const n = store.notifs();
    root.innerHTML =
      '<div class="h2">Inbox</div>' +
      (n.length
        ? n.map(function (x) {
            return '<div class="card notif"><b>' + esc(x.title) + '</b><p class="muted">' + esc(x.body) + '</p></div>';
          }).join('')
        : '<div class="empty">Keine</div>');
  }
  if (view === 'gallery') {
    const g = store.gallery();
    root.innerHTML =
      '<div class="h2">Gallery</div>' +
      (g.length
        ? g.map(function (x) {
            var av = x.photo
              ? '<div class="avatar" style="background-image:url(' + x.photo + ');background-size:cover;background-position:center"></div>'
              : '<div class="avatar">' + (x.emoji || '🖼️') + '</div>';
            return '<div class="card row">' + av + '<div><b>' + esc(x.name) + '</b></div></div>';
          }).join('')
        : '<div class="empty">Leer</div>');
  }
  if (view === 'search') {
    root.innerHTML = '<div class="form-g"><input id="sq" placeholder="Suchen..."></div><div id="sr"></div>';
    const run = function () {
      const q = document.getElementById('sq').value.toLowerCase();
      document.getElementById('sr').innerHTML =
        visibleChars()
          .filter(function (c) { return c.name.toLowerCase().includes(q); })
          .map(function (c) { return charCard(c, true); })
          .join('') || '<p class="muted">—</p>';
    };
    document.getElementById('sq').oninput = run;
    run();
  }
  if (view === 'dev') {
    if (!isDev()) {
      root.innerHTML = '<div class="empty">Kein Dev-Zugriff.</div>';
      return;
    }
    var f = store.flags();
    var users = store.users();
    var chars = store.chars();
    root.innerHTML =
      '<div class="card glass"><div class="h2">Dev Panel</div>' +
      '<p class="muted">User: ' + users.length + ' · Chars: ' + chars.length + ' · Adult-Freigaben: ' + ((f.nsfw||[]).length) + '</p>' +
      '<div class="form-g"><label>E-Mail</label><input id="de" placeholder="user@mail.com"></div>' +
      '<button class="btn btn-p" onclick="devAction(\'dev\')">Zum Dev machen</button> ' +
      '<button class="btn btn-g" onclick="devAction(\'nsfw\')">Adult freischalten</button> ' +
      '<button class="btn btn-g" onclick="devAction(\'unnsfw\')">Adult entziehen</button> ' +
      '<button class="btn btn-d" onclick="devAction(\'undev\')">Dev entziehen</button>' +
      '<div class="form-g" style="margin-top:16px"><label>Profilrahmen</label><input id="fe" placeholder="email">' +
      '<select id="ff"><option value="">Kein</option><option value="gold">Gold</option><option value="purple">Lila</option><option value="cyan">Cyan</option></select></div>' +
      '<button class="btn btn-g" onclick="setFrame()">Rahmen setzen</button>' +
      '<div class="section-title" style="margin-top:20px">Tools</div>' +
      '<button class="btn btn-g" onclick="devExport()">Export JSON</button> ' +
      '<button class="btn btn-g" onclick="devImport()">Import JSON</button> ' +
      '<button class="btn btn-g" onclick="render(\'photo\')">Photo Editor</button> ' +
      '<button class="btn btn-d" onclick="devWipeChars()">Alle Chars loeschen</button>' +
      '<div class="section-title" style="margin-top:20px">Adult-Liste</div>' +
      '<div class="muted">' + esc((f.nsfw||[]).join(', ') || '—') + '</div>' +
      '<div class="section-title" style="margin-top:12px">Dev-Liste</div>' +
      '<div class="muted">' + esc([DEV].concat(f.devs||[]).join(', ')) + '</div></div>';
  }
  if (view === 'photo') {
    root.innerHTML =
      '<div class="card glass"><div class="h2">Photo Editor</div>' +
      '<p class="muted">Bild laden, anpassen, speichern. Lokal, ohne Server-Moderation.</p>' +
      '<div class="form-g"><label>Bild</label><input type="file" id="peFile" accept="image/*"></div>' +
      '<canvas id="peCanvas" style="max-width:100%;border-radius:12px;border:1px solid var(--b);display:none;margin:8px 0"></canvas>' +
      '<div class="form-g"><label>Helligkeit</label><input type="range" id="peBright" min="50" max="150" value="100"></div>' +
      '<div class="form-g"><label>Kontrast</label><input type="range" id="peContrast" min="50" max="150" value="100"></div>' +
      '<div class="form-g"><label>Saettigung</label><input type="range" id="peSat" min="0" max="200" value="100"></div>' +
      '<div class="form-g"><label>Zoom / Crop</label><input type="range" id="peZoom" min="100" max="200" value="100"></div>' +
      '<div class="form-g"><label>Schnell-Edit (Text)</label><input id="pePrompt" placeholder="z.B. heller, weicher, dramatisch"></div>' +
      '<button class="btn btn-g" onclick="peApplyPrompt()">Prompt anwenden</button> ' +
      '<button class="btn btn-g" onclick="peFlip()">Spiegeln</button> ' +
      '<button class="btn btn-p" onclick="peSave()">In Gallery speichern</button> ' +
      '<button class="btn btn-g" onclick="peUseForChar()">Als Charakter-Foto merken</button></div>';
    window._peImg = null;
    window._peFlip = false;
    var peFile = document.getElementById('peFile');
    function peRedraw() {
      var canvas = document.getElementById('peCanvas');
      if (!canvas || !window._peImg) return;
      var img = window._peImg;
      var b = (document.getElementById('peBright').value || 100) / 100;
      var c = (document.getElementById('peContrast').value || 100) / 100;
      var s = (document.getElementById('peSat').value || 100) / 100;
      var z = (document.getElementById('peZoom').value || 100) / 100;
      var maxW = Math.min(560, root.clientWidth - 40);
      var scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.style.display = 'block';
      var ctx = canvas.getContext('2d');
      ctx.save();
      ctx.filter = 'brightness(' + b + ') contrast(' + c + ') saturate(' + s + ')';
      if (window._peFlip) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      var dw = canvas.width * z;
      var dh = canvas.height * z;
      var ox = (canvas.width - dw) / 2;
      var oy = (canvas.height - dh) / 2;
      ctx.drawImage(img, ox, oy, dw, dh);
      ctx.restore();
    }
    window._peRedraw = peRedraw;
    if (peFile) {
      peFile.onchange = function (e) {
        var f = e.target.files && e.target.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            window._peImg = img;
            peRedraw();
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(f);
      };
    }
    ['peBright', 'peContrast', 'peSat', 'peZoom'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.oninput = peRedraw;
    });
  }
  if (view === 'settings') {
    root.innerHTML =
      '<div class="card glass"><div class="h2">Settings</div><p class="muted">' +
      esc(u.email || '') +
      '</p><p class="muted">Version ' +
      (window.VERBY_VERSION || '') +
      '</p>' +
      '<div class="form-g" style="margin-top:12px"><label>Theme</label>' +
      '<select id="th"><option value="midnight">Midnight</option><option value="neon">Neon</option><option value="soft">Soft</option></select></div>' +
      '<button class="btn btn-p" onclick="saveTheme()">Speichern</button>' +
      '<button class="btn btn-g" style="display:block;margin-top:8px;width:100%" onclick="showPage(\'updates\')">Changelog</button>' +
      '<button class="btn btn-d" style="display:block;margin-top:12px;width:100%" onclick="logout()">Logout</button></div>';
    document.getElementById('th').value = store.theme();
  }
  if (view === 'profile' && window._prof) {
    const c = window._prof;
    var avHtml = c.photo
      ? '<div class="avatar lg glow" style="margin:0 auto 12px;background-image:url(' + c.photo + ');background-size:cover;background-position:center"></div>'
      : '<div class="avatar lg glow" style="margin:0 auto 12px">' + (c.emoji || '✨') + '</div>';
    root.innerHTML =
      '<div style="text-align:center">' + avHtml +
      '<div class="h2">' + esc(c.name) + '</div>' +
      '<p class="muted">' + esc(c.short || '') + '</p>' +
      (c.age ? '<p class="muted">Alter: ' + esc(String(c.age)) + '</p>' : '') +
      (c.tags ? '<p class="muted">' + esc(c.tags) + '</p>' : '') +
      '<button class="btn btn-p" onclick="openChat(\'' + c.id + '\')">Chat</button></div>';
  }
}
function charCard(c, withProf) {
  const click = withProf
    ? "window._prof=store.chars().find(function(x){return x.id==='" + c.id + "'});render('profile')"
    : "openChat('" + c.id + "')";
  var avInner = c.photo ? '' : (c.emoji || '✨');
  var avStyle = c.photo
    ? ' style="background-image:url(' + c.photo + ');background-size:cover;background-position:center"'
    : '';
  return (
    '<div class="card row" onclick="' +
    click +
    '"><div class="avatar"' +
    avStyle +
    '>' +
    avInner +
    '</div><div class="grow"><b>' +
    esc(c.name) +
    '</b><div class="muted">' +
    esc(c.short || c.category || '') +
    (c.tags ? ' · ' + esc(c.tags) : '') +
    '</div></div></div>'
  );
}
function saveChar() {
  const name = document.getElementById('cn').value.trim();
  const greeting = document.getElementById('cg').value.trim();
  if (!name || !greeting) return alert('Name + Begruessung');
  const nsfwEl = document.getElementById('cnsfw');
  const nsfw = !!(nsfwEl && nsfwEl.checked);
  const list = store.chars();
  const photo = window._cPhotoData || null;
  const item = {
    id: 'c' + Date.now(),
    name: name,
    greeting: greeting,
    short: document.getElementById('cs').value.trim(),
    lore: document.getElementById('cl').value.trim(),
    tags: (document.getElementById('ctags') && document.getElementById('ctags').value.trim()) || '',
    age: (document.getElementById('cage') && document.getElementById('cage').value) || '',
    category: document.getElementById('cc').value,
    nsfw: nsfw,
    emoji: '✨',
    photo: photo,
    owner: store.user().email
  };
  list.unshift(item);
  store.setChars(list);
  const g = store.gallery();
  g.unshift({ name: name, emoji: '✨', note: item.category, photo: photo });
  store.setGallery(g);
  window._cPhotoData = null;
  pushNotif('Charakter erstellt', name);
  haptic();
  alert('Gespeichert' + (photo ? ' (mit Foto)' : ''));
  render('home');
}
function devAction(type) {
  const e = document.getElementById('de').value.trim().toLowerCase();
  if (!e) return alert('E-Mail eingeben');
  const f = store.flags();
  f.devs = f.devs || [];
  f.nsfw = f.nsfw || [];
  if (type === 'dev') {
    if (f.devs.indexOf(e) < 0) f.devs.push(e);
  }
  if (type === 'undev') {
    f.devs = f.devs.filter(function (x) { return x !== e; });
  }
  if (type === 'nsfw') {
    if (f.nsfw.indexOf(e) < 0) f.nsfw.push(e);
  }
  if (type === 'unnsfw') {
    f.nsfw = f.nsfw.filter(function (x) { return x !== e; });
  }
  store.setFlags(f);
  alert('OK: ' + type + ' → ' + e);
  render('dev');
}
function devExport() {
  var data = {
    users: store.users(),
    chars: store.chars(),
    flags: store.flags(),
    gallery: store.gallery()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'verby-export.json';
  a.click();
}
function devImport() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json';
  inp.onchange = function () {
    var f = inp.files && inp.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (data.users) store.setUsers(data.users);
        if (data.chars) store.setChars(data.chars);
        if (data.flags) store.setFlags(data.flags);
        if (data.gallery) store.setGallery(data.gallery);
        alert('Import OK');
        render('dev');
      } catch (e) {
        alert('Import fehlgeschlagen');
      }
    };
    r.readAsText(f);
  };
  inp.click();
}
function devWipeChars() {
  if (!confirm('Wirklich alle Charaktere loeschen?')) return;
  store.setChars([]);
  alert('Chars geloescht');
  render('dev');
}
function setFrame() {
  const e = document.getElementById('fe').value.trim().toLowerCase();
  const fr = document.getElementById('ff').value;
  if (!e) return;
  const f = store.flags();
  f.frames = f.frames || {};
  if (fr) f.frames[e] = fr;
  else delete f.frames[e];
  store.setFlags(f);
  alert('OK');
}
function saveTheme() {
  store.setTheme(document.getElementById('th').value);
  applyTheme();
  alert('Theme aktiv');
}
async function logout() {
  try {
    if (sb) await sb.auth.signOut();
  } catch (e) {}
  localStorage.removeItem('vb_user');
  showLanding();
}
let cur = null;
function openChat(id) {
  cur = store.chars().find(function (c) { return c.id === id; });
  if (!cur) return;
  if (cur.nsfw && store.mode() === 'friendly') return alert('Nicht verfuegbar');
  hideAll();
  const ch = document.getElementById('chat');
  ch.classList.add('on');
  ch.style.display = 'flex';
  const av = document.getElementById('cAv');
  if (cur.photo) {
    av.textContent = '';
    av.style.backgroundImage = 'url(' + cur.photo + ')';
    av.style.backgroundSize = 'cover';
    av.style.backgroundPosition = 'center';
  } else {
    av.textContent = cur.emoji || '✨';
    av.style.backgroundImage = '';
  }
  av.classList.add('glow');
  document.getElementById('cName').textContent = cur.name;
  document.getElementById('cSub').textContent = cur.short || cur.category || '';
  let hist = store.chats(cur.id);
  if (!hist.length) {
    hist = [{ role: 'bot', text: cur.greeting }];
    store.setChats(cur.id, hist);
  }
  paintMsgs(hist);
  haptic();
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
  msgs.innerHTML = hist
    .map(function (m) {
      return (
        '<div class="msg ' +
        (m.role === 'user' ? 'me' : 'bot') +
        '" data-t="' +
        esc(m.text).replace(/"/g, '"') +
        '">' +
        fmt(m.text) +
        '</div>'
      );
    })
    .join('');
  msgs.scrollTop = 99999;
}
function fmt(t) {
  return esc(t)
    .replace(/\*([^*]+)\*/g, '<span class="act">*$1*</span>')
    .replace(/\n/g, '<br>');
}
document.getElementById('chatBack').onclick = function () {
  document.getElementById('cAv').classList.remove('glow');
  enterApp();
};
document.getElementById('chatSearchBtn').onclick = function () {
  const b = document.getElementById('chatSearchBar');
  b.style.display = b.style.display === 'none' ? 'block' : 'none';
};
document.getElementById('chatQ').oninput = function (e) {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('#msgs .msg').forEach(function (el) {
    const t = (el.dataset.t || el.textContent).toLowerCase();
    el.classList.toggle('hit', q && t.indexOf(q) >= 0);
  });
};
document.getElementById('send').onclick = sendMsg;
document.getElementById('inp').onkeypress = function (e) {
  if (e.key === 'Enter') sendMsg();
};
function sendMsg() {
  const t = document.getElementById('inp').value.trim();
  if (!t || !cur) return;
  document.getElementById('inp').value = '';
  haptic();
  let hist = store.chats(cur.id);
  hist.push({ role: 'user', text: t });
  document.getElementById('msgs').innerHTML +=
    '<div class="msg me">' +
    fmt(t) +
    '</div><div class="typing-dots" id="ty"><span></span><span></span><span></span></div>';
  document.getElementById('msgs').scrollTop = 99999;
  setTimeout(function () {
    const ty = document.getElementById('ty');
    if (ty) ty.remove();
    let reply = localReply(t);
    reply = moderate(reply);
    hist.push({ role: 'bot', text: reply });
    store.setChats(cur.id, hist);
    document.getElementById('msgs').innerHTML += '<div class="msg bot">' + fmt(reply) + '</div>';
    document.getElementById('msgs').scrollTop = 99999;
  }, 500);
}
function localReply(t) {
  const low = t.toLowerCase();
  const hasAct = /\*[^*]+\*/.test(t);
  if (cur.lore && /erinner|memory|weißt/.test(low)) return '*nickt*\n' + cur.lore;
  if (/wer bist/.test(low)) return 'Ich bin ' + cur.name + '. ' + (cur.short || '');
  if (hasAct) return '*reagiert*\n*laechelt*\nWie geht es weiter?';
  const fb = ['*schaut dich an*\nErzaehl weiter.', '*nickt*\nInteressant…'];
  return fb[Math.floor(Math.random() * fb.length)];
}
document.querySelectorAll('.nb[data-v]').forEach(function (b) {
  b.onclick = function () {
    haptic();
    render(b.dataset.v);
  };
});
window.addEventListener('online', function () {
  document.getElementById('offlineBar').classList.remove('on');
});
window.addEventListener('offline', function () {
  document.getElementById('offlineBar').classList.add('on');
});
if (!navigator.onLine) document.getElementById('offlineBar').classList.add('on');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(function () {});
}
function peApplyPrompt() {
  var p = (document.getElementById('pePrompt') && document.getElementById('pePrompt').value || '').toLowerCase();
  if (!p) return alert('Prompt eingeben');
  var b = document.getElementById('peBright');
  var c = document.getElementById('peContrast');
  var s = document.getElementById('peSat');
  var z = document.getElementById('peZoom');
  if (/hell|bright|light/.test(p) && b) b.value = Math.min(150, Number(b.value) + 20);
  if (/dunkel|dark/.test(p) && b) b.value = Math.max(50, Number(b.value) - 20);
  if (/kontrast|dramatic|drama/.test(p) && c) c.value = Math.min(150, Number(c.value) + 25);
  if (/weich|soft|pastel/.test(p)) {
    if (c) c.value = 85;
    if (s) s.value = 90;
  }
  if (/bunt|vibrant|satt/.test(p) && s) s.value = 160;
  if (/grau|bw|mono/.test(p) && s) s.value = 0;
  if (/nah|zoom|close/.test(p) && z) z.value = 140;
  if (window._peRedraw) window._peRedraw();
  haptic();
}
function peFlip() {
  window._peFlip = !window._peFlip;
  if (window._peRedraw) window._peRedraw();
}
function peSave() {
  var canvas = document.getElementById('peCanvas');
  if (!canvas || !window._peImg) return alert('Erst Bild laden');
  var data = canvas.toDataURL('image/jpeg', 0.88);
  var g = store.gallery();
  g.unshift({ name: 'Edit ' + new Date().toLocaleTimeString(), emoji: '🖼️', photo: data, note: 'photo-editor' });
  store.setGallery(g);
  pushNotif('Photo Editor', 'Bild in Gallery gespeichert');
  alert('In Gallery gespeichert');
}
function peUseForChar() {
  var canvas = document.getElementById('peCanvas');
  if (!canvas || !window._peImg) return alert('Erst Bild laden');
  window._cPhotoData = canvas.toDataURL('image/jpeg', 0.88);
  alert('Foto gemerkt – unter Erstellen speichern');
  render('create');
}
function runUpdateScreen(then) {
  const prev = localStorage.getItem('vb_app_version');
  const ver = window.VERBY_VERSION || '0';
  if (prev === ver) {
    then();
    return;
  }
  const ov = document.getElementById('updateOverlay');
  const bar = document.getElementById('updateBar');
  const sub = document.getElementById('updateSub');
  if (!ov) {
    then();
    return;
  }
  ov.classList.add('on');
  if (sub) {
    sub.textContent =
      'v' +
      ver +
      (window.VERBY_CHANGELOG && window.VERBY_CHANGELOG[0]
        ? ' · ' + window.VERBY_CHANGELOG[0].t.slice(0, 48) + '…'
        : '');
  }
  const maxMs = 8000;
  const start = Date.now();
  const timer = setInterval(function () {
    const elapsed = Date.now() - start;
    let p = Math.min(100, (elapsed / maxMs) * 100);
    if (elapsed > 1500) p = Math.min(100, p + 12);
    if (bar) bar.style.width = p + '%';
    if (p >= 100 || elapsed >= maxMs) {
      clearInterval(timer);
      if (bar) bar.style.width = '100%';
      localStorage.setItem('vb_app_version', ver);
      setTimeout(function () {
        ov.classList.remove('on');
        then();
      }, 200);
    }
  }, 80);
}
(async function boot() {
  runUpdateScreen(async function () {
    try {
      if (sb) {
        const res = await sb.auth.getSession();
        const session = res.data && res.data.session;
        if (session) {
          applySession(session);
          enterApp();
          return;
        }
        sb.auth.onAuthStateChange(function (event, session) {
          if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
            applySession(session);
            enterApp();
          }
          if (event === 'SIGNED_OUT') {
            localStorage.removeItem('vb_user');
          }
        });
      }
    } catch (e) {
      console.warn(e);
    }
    if (store.user()) enterApp();
    else showLanding();
  });
})();
