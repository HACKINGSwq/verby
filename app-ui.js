/* Verby v7.9 — UI render: home, chats list, discover, create-studio, profile, forum, settings */
function render(view) {
  setNavOn(view);
  var root = document.getElementById('view');
  if (!root) return;
  root.innerHTML = '<div class="skel"></div><div class="skel"></div>';
  setTimeout(function () { renderReal(view); }, 50);
}

function charTile(c) {
  var ph = c.photo ? 'background-image:url(' + c.photo + ')' : '';
  var inner = c.photo ? '' : (c.emoji || '✨');
  return '<div class="char-tile" onclick="window._prof=store.chars().find(function(x){return x.id===\'' + c.id + '\'});render(\'profile\')">' +
    '<div class="ph" style="' + ph + '">' + inner + '</div>' +
    '<div class="meta"><b>' + esc(c.name) + '</b><span class="muted">' + esc(c.short || c.category || '') + '</span></div></div>';
}

function renderReal(view) {
  var root = document.getElementById('view');
  var u = store.user();
  if (!root || !u) return;

  if (view === 'home') {
    var list = store.chars();
    var sessions = allChatSessions().slice(0, 4);
    root.innerHTML =
      '<div class="h2">Hey, ' + esc(u.name) + '</div>' +
      '<p class="muted" style="margin-bottom:16px">@' + esc(u.handle || 'user') + ' · Lvl ' + store.level() +
      (isDev() ? ' · <span class="tag">Dev</span>' : '') + '</p>' +
      (sessions.length ? '<div class="section">Weiterchatten</div>' + sessions.map(function (s) {
        var av = s.photo ? 'style="background-image:url(' + s.photo + ')"' : '';
        return '<div class="card row chat-session" onclick="openChat(\'' + s.charId + '\',\'' + s.threadId + '\')">' +
          '<div class="avatar" ' + av + '>' + (s.photo ? '' : (s.emoji || '✨')) + '</div>' +
          '<div class="grow"><b>' + esc(s.name) + '</b><div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          esc((s.preview || '').slice(0, 70)) + '</div></div></div>';
      }).join('') : '') +
      '<div class="section">Deine Charaktere</div>' +
      (list.length ? '<div class="char-grid">' + list.map(charTile).join('') + '</div>' :
        '<div class="empty">Noch keine Charaktere.<br><button class="btn btn-p" style="margin-top:12px" type="button" onclick="render(\'create\')">Erstellen</button></div>');
  }

  if (view === 'chats') {
    var sessions = allChatSessions();
    root.innerHTML = '<div class="h2">Chats</div><p class="muted" style="margin-bottom:14px">Alle aktiven · zuletzt genutzt</p>' +
      (sessions.length ? sessions.map(function (s) {
        var av = s.photo ? 'style="background-image:url(' + s.photo + ')"' : '';
        var ago = s.updated ? relativeTime(s.updated) : '';
        return '<div class="card row chat-session" onclick="openChat(\'' + s.charId + '\',\'' + s.threadId + '\')">' +
          '<div class="avatar" ' + av + '>' + (s.photo ? '' : (s.emoji || '✨')) + '</div>' +
          '<div class="grow"><b>' + esc(s.name) + '</b>' +
          (s.title && s.title !== 'Hauptchat' ? ' <span class="muted" style="font-size:11px">· ' + esc(s.title) + '</span>' : '') +
          '<div class="muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          esc((s.preview || '').slice(0, 80)) + '</div></div>' +
          '<span class="muted" style="font-size:11px;flex-shrink:0">' + ago + '</span></div>';
      }).join('') : '<div class="empty">Keine Chats. Starte einen Charakter aus Discover oder Create.</div>');
  }

  if (view === 'discover') {
    var q = (window._search || '').toLowerCase();
    var cat = window._cat || 'Alle';
    var list = store.chars().filter(function (c) {
      if (cat !== 'Alle' && (c.category || 'Fantasy') !== cat) return false;
      if (!q) return true;
      return (c.name + ' ' + (c.tags || '') + ' ' + (c.short || '')).toLowerCase().indexOf(q) >= 0;
    });
    root.innerHTML = '<div class="h2">Discover</div>' +
      '<div class="form-g"><input id="searchQ" placeholder="Suchen…" value="' + esc(window._search || '') + '"></div>' +
      '<div class="chips" style="margin-bottom:12px">' + CATS.map(function (c) {
        return '<button class="chip" type="button" style="' + (c === cat ? 'border-color:var(--a);color:var(--a2)' : '') +
          '" onclick="window._cat=\'' + c + '\';render(\'discover\')">' + c + '</button>';
      }).join('') + '</div>' +
      (list.length ? '<div class="char-grid">' + list.map(charTile).join('') + '</div>' : '<div class="empty">Nichts gefunden.</div>');
    var sq = document.getElementById('searchQ');
    if (sq) sq.onkeydown = function (e) { if (e.key === 'Enter') { window._search = sq.value; render('discover'); } };
  }

  if (view === 'create') {
    root.innerHTML = '<div class="h2">Create Studio</div><div class="studio">' +
      '<div class="card">' +
      '<div class="form-g"><label>Profilbild</label><input type="file" id="cPhoto" accept="image/*"></div>' +
      '<div class="form-g"><label>Name *</label><input id="cn" oninput="studioPreview()" placeholder="z.B. Luna"></div>' +
      '<div class="form-g"><label>Begrüßung *</label><textarea id="cg" oninput="studioPreview()" placeholder="Hallo! Ich bin…"></textarea></div>' +
      '<div class="form-g"><label>Tagline</label><input id="cs" oninput="studioPreview()" placeholder="Kurzbeschreibung"></div>' +
      '<div class="form-g"><label>Tags</label><input id="ctags" placeholder="freundlich, mutig, magisch"></div>' +
      '<div class="form-g"><label>Lorebook / Memory</label><textarea id="cl" placeholder="Fakten, Welt, Beziehungen…"></textarea></div>' +
      '<div class="form-g"><label>Kategorie</label><select id="cc">' +
      CATS.filter(function (c) { return c !== 'Alle'; }).map(function (c) { return '<option>' + c + '</option>'; }).join('') +
      '</select></div>' +
      '<button class="btn btn-p" type="button" onclick="saveChar()">Speichern</button></div>' +
      '<div class="card profile-hero" id="studioPrev"><div class="avatar xl" id="spAv">✨</div>' +
      '<div class="h2" id="spName">Name</div><p class="bio" id="spBio">Tagline & Begrüßung erscheinen hier.</p></div></div>';
    window._cPhotoData = null;
    var finp = document.getElementById('cPhoto');
    if (finp) finp.onchange = function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f || f.size > 2.5 * 1024 * 1024) return alert('Max 2,5 MB');
      var r = new FileReader();
      r.onload = function () {
        window._cPhotoData = r.result;
        var av = document.getElementById('spAv');
        if (av) { av.textContent = ''; av.style.backgroundImage = 'url(' + r.result + ')'; }
      };
      r.readAsDataURL(f);
    };
  }

  if (view === 'forum') {
    var data = ensureForumSeed();
    root.innerHTML = '<div class="h2">Forum</div>' + data.threads.slice(0, 25).map(function (t) {
      return '<div class="card" style="cursor:pointer" onclick="window._forumThread=\'' + t.id + '\';render(\'forum-thread\')">' +
        '<b>' + esc(t.title) + '</b><div class="muted">' + esc(t.author) + (t.bot ? ' · Bot' : '') + '</div></div>';
    }).join('');
  }

  if (view === 'forum-thread') {
    var data = ensureForumSeed();
    var t = data.threads.find(function (x) { return x.id === window._forumThread; });
    var posts = (data.posts[window._forumThread] || []);
    if (!t) { root.innerHTML = '<div class="empty">Nicht gefunden</div>'; return; }
    root.innerHTML = '<button class="btn btn-g btn-sm" type="button" onclick="render(\'forum\')">← Forum</button>' +
      '<h2 class="h2" style="margin-top:12px">' + esc(t.title) + '</h2>' +
      posts.map(function (p) {
        return '<div class="card"><b>' + esc(p.author) + (p.bot ? ' <span class="tag">Bot</span>' : '') +
          '</b><p style="margin-top:8px;white-space:pre-wrap;line-height:1.5">' + esc(p.body) + '</p></div>';
      }).join('') +
      '<div class="card"><textarea id="forumReply" placeholder="Antwort…"></textarea>' +
      '<button class="btn btn-p" style="margin-top:8px" type="button" onclick="postForumReply(\'' + t.id + '\')">Senden</button></div>';
  }

  if (view === 'settings') {
    var hasKey = VERBY_AI.hasAnyKey();
    var devices = [];
    try { devices = JSON.parse(localStorage.getItem('vb_devices') || '[]'); } catch (e) {}
    root.innerHTML = '<div class="h2">Settings</div>' +
      '<div class="card"><p class="muted">' + esc(u.email || '') + ' · @' + esc(u.handle || '') + '</p>' +
      '<p class="muted">v' + esc(window.VERBY_VERSION || '') + ' · Credits ' + (isDev() ? '∞' : store.credits()) + '</p>' +
      '<div class="form-g" style="margin-top:12px"><label>Verby-ID</label><input id="handleIn" value="' + esc(u.handle || '') + '"></div>' +
      '<button class="btn btn-g btn-sm" type="button" onclick="saveHandle()">Handle speichern</button>' +
      '<div class="form-g" style="margin-top:12px"><label>Theme</label><select id="themeSel">' +
      '<option value="dark"' + (store.theme() === 'dark' ? ' selected' : '') + '>Dunkel</option>' +
      '<option value="light"' + (store.theme() === 'light' ? ' selected' : '') + '>Hell</option></select></div>' +
      '<button class="btn btn-g btn-sm" type="button" onclick="store.setTheme(document.getElementById(\'themeSel\').value);applyTheme();alert(\'OK\')">Theme speichern</button></div>' +
      '<div class="card"><div class="section" style="margin-top:0">Verby AI</div>' +
      '<p class="muted" style="margin-bottom:10px">Keys optional lokal — besser: Server-Env auf Vercel (OPENAI_API_KEY / ANTHROPIC_API_KEY).</p>' +
      '<div class="form-g"><label>OpenAI Key (optional)</label><input id="oakey" type="password" placeholder="sk-… leer = Server"></div>' +
      '<div class="form-g"><label>Claude Key (optional)</label><input id="clkey" type="password" placeholder="sk-ant-… leer = Server"></div>' +
      '<div class="form-g"><label>Modell</label><select id="aimodel">' +
      AI_MODELS.map(function (m) {
        return '<option value="' + m.id + '"' + (VERBY_AI.model === m.id ? ' selected' : '') + '>' + m.label + '</option>';
      }).join('') + '</select></div>' +
      '<div class="form-g"><label>Style (Default: Romanhaft)</label><select id="aistyle">' +
      AI_STYLES.map(function (s) {
        return '<option value="' + s.id + '"' + (VERBY_AI.style === s.id ? ' selected' : '') + '>' + s.label + '</option>';
      }).join('') + '</select></div>' +
      '<button class="btn btn-p btn-sm" type="button" onclick="saveOpenAIKey()">Speichern</button> ' +
      '<button class="btn btn-d btn-sm" type="button" onclick="clearOpenAIKey()">Keys löschen</button>' +
      '<p class="muted" style="margin-top:8px">' + (hasKey ? 'Client-Key aktiv' : 'Server-Key oder Offline-Fallback') + '</p></div>' +
      (devices.length ? '<div class="card"><div class="section" style="margin-top:0">Geräte</div>' +
        devices.slice(0, 8).map(function (d) {
          return '<div class="muted" style="margin-bottom:6px">' + esc(d.name || 'Device') + ' · ' + relativeTime(d.last) +
            '</div>';
        }).join('') + '</div>' : '') +
      '<div class="card">' +
      '<button class="btn btn-g" style="width:100%" type="button" onclick="exportBackup()">Backup exportieren</button>' +
      '<button class="btn btn-g" style="width:100%;margin-top:8px" type="button" onclick="importBackup()">Backup importieren</button>' +
      '<button class="btn btn-g" style="width:100%;margin-top:8px" type="button" onclick="showPage(\'updates\')">Changelog</button>' +
      '<button class="btn btn-g" style="width:100%;margin-top:8px" type="button" onclick="cloudSync().then(function(){alert(\'Sync versucht\')})">Cloud-Sync jetzt</button>' +
      '<button class="btn btn-d" style="width:100%;margin-top:8px" type="button" onclick="logout()">Logout</button>' +
      '<button class="btn btn-d" style="width:100%;margin-top:8px" type="button" onclick="deleteAccount()">Account-Daten löschen</button></div>';
  }

  if (view === 'profile' && window._prof) {
    var c = window._prof;
    var isFav = store.favs().indexOf(c.id) >= 0;
    var av = c.photo
      ? '<div class="avatar xl" style="margin:0 auto;background-image:url(' + c.photo + ')"></div>'
      : '<div class="avatar xl" style="margin:0 auto">' + (c.emoji || '✨') + '</div>';
    root.innerHTML = '<div class="card profile-hero">' + av +
      '<div class="h2" style="margin-top:14px">' + esc(c.name) + '</div>' +
      '<p class="bio">' + esc(c.short || c.greeting || '') + '</p>' +
      (c.tags ? '<div style="margin-bottom:12px">' + c.tags.split(',').map(function (t) {
        return '<span class="tag">' + esc(t.trim()) + '</span>';
      }).join('') + '</div>' : '') +
      '<div class="row" style="justify-content:center;flex-wrap:wrap;gap:8px">' +
      '<button class="btn btn-p" type="button" onclick="openChat(\'' + c.id + '\')">Chat starten</button>' +
      '<button class="btn btn-g" type="button" onclick="toggleFav(\'' + c.id + '\')">' + (isFav ? '★ Favorit' : '☆ Fav') + '</button>' +
      '<button class="btn btn-g" type="button" onclick="shareChar(\'' + c.id + '\')">Teilen</button>' +
      '<button class="btn btn-d" type="button" onclick="deleteChar(\'' + c.id + '\')">Löschen</button></div>' +
      (c.lore ? '<div style="text-align:left;margin-top:16px"><div class="section">Lorebook</div>' +
        '<p style="font-size:13px;white-space:pre-wrap;line-height:1.5">' + esc(c.lore) + '</p></div>' : '') +
      '</div>';
  }
}

function studioPreview() {
  var n = document.getElementById('cn');
  var g = document.getElementById('cg');
  var s = document.getElementById('cs');
  var spN = document.getElementById('spName');
  var spB = document.getElementById('spBio');
  if (spN) spN.textContent = (n && n.value) || 'Name';
  if (spB) spB.textContent = ((s && s.value) || (g && g.value) || 'Tagline & Begrüßung erscheinen hier.').slice(0, 200);
}

function relativeTime(ts) {
  var d = Date.now() - ts;
  if (d < 60000) return 'gerade';
  if (d < 3600000) return Math.floor(d / 60000) + ' Min';
  if (d < 86400000) return Math.floor(d / 3600000) + ' Std';
  if (d < 604800000) return Math.floor(d / 86400000) + ' T';
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}
