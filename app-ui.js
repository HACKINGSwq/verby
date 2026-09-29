function render(view) {
  document.querySelectorAll('.nb[data-v]').forEach(function (b) {
    var on = b.dataset.v === view || (view === 'forum-thread' && b.dataset.v === 'forum') || ((view === 'profile' || view === 'user') && (b.dataset.v === 'discover' || b.dataset.v === 'explore'));
    b.classList.toggle('on', on);
  });
  var root = document.getElementById('view'); if (!root) return;
  root.innerHTML = '<div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  setTimeout(function () { renderReal(view); }, 90);
}
function charCard(c, withProf) {
  var click = withProf ? "window._prof=store.chars().find(function(x){return x.id==='" + c.id + "'});render('profile')" : "openChat('" + c.id + "')";
  var avStyle = c.photo ? ' style="background-image:url(' + c.photo + ');background-size:cover"' : '';
  var avInner = c.photo ? '' : (c.emoji || '✨');
  var fav = store.favs().indexOf(c.id) >= 0 ? ' ★' : '';
  return '<div class="card row" onclick="' + click + '"><div class="avatar"' + avStyle + '>' + avInner + '</div><div class="grow"><b>' + esc(c.name) + fav + '</b><div class="muted">' + esc(c.short || c.category || '') + '</div></div></div>';
}
function renderReal(view) {
  var root = document.getElementById('view'); var u = store.user(); if (!root || !u) return;
  var cred = store.credits(); var lvl = store.level();
  if (view === 'home') {
    var list = store.chars();
    root.innerHTML = '<div class="card glass"><div class="banner"></div><div class="row"><div class="avatar">' + (u.name || '?')[0].toUpperCase() + '</div><div class="grow"><div class="h2">Hey, ' + esc(u.name) + '</div><div class="muted">@' + esc(u.handle || 'user') + ' · Lvl ' + lvl + ' · Credits ' + (isDev() ? '∞' : cred) + '</div><div style="margin-top:6px">' + store.badges().slice(0, 4).map(function (id) { var b = BADGE_DEFS.find(function (x) { return x.id === id; }); return '<span class="badge-pill">' + esc(b ? b.name : id) + '</span>'; }).join('') + '</div></div></div></div><div class="section-title">Deine Charaktere</div>' + (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Noch keine Charaktere.</div>');
  }
  if (view === 'feed') {
    var items = store.notifs().slice(0, 12).map(function (n) { return '<div class="card"><b>' + esc(n.title) + '</b><div class="muted">' + esc(n.body) + '</div></div>'; }).join('');
    root.innerHTML = '<div class="h2">Feed</div>' + (items || '<div class="empty">Noch leer.</div>') + store.chars().slice(0, 5).map(function (c) { return charCard(c, true); }).join('');
  }
  if (view === 'discover' || view === 'explore') {
    var q = (window._search || '').toLowerCase(); var cat = window._cat || 'Alle';
    var list = store.chars().filter(function (c) {
      if (cat !== 'Alle' && (c.category || 'Fantasy') !== cat) return false;
      if (!q) return true;
      return (c.name + ' ' + (c.tags || '') + ' ' + (c.short || '')).toLowerCase().indexOf(q) >= 0;
    });
    root.innerHTML = '<div class="h2">Discover</div><div class="form-g"><input id="searchQ" placeholder="Suche…" value="' + esc(window._search || '') + '"></div><div class="cat-row">' + CATS.map(function (c) { return '<button class="cat ' + (c === cat ? 'on' : '') + '" type="button" onclick="window._cat=\'' + c + '\';render(\'discover\')">' + c + '</button>'; }).join('') + '</div>' + (list.length ? list.map(function (c) { return charCard(c, true); }).join('') : '<div class="empty">Nichts gefunden.</div>');
    var sq = document.getElementById('searchQ');
    if (sq) sq.onkeydown = function (e) { if (e.key === 'Enter') { window._search = sq.value; render('discover'); } };
  }
  if (view === 'notifications') {
    var n = store.notifs();
    root.innerHTML = '<div class="h2">Notifications</div>' + (n.length ? n.map(function (x) { return '<div class="card"><b>' + esc(x.title) + '</b><div class="muted">' + esc(x.body) + '</div></div>'; }).join('') : '<div class="empty">Keine.</div>');
  }
  if (view === 'leaderboard') {
    root.innerHTML = '<div class="h2">Leaderboard</div><div class="card row"><div style="width:28px;font-weight:700">1</div><div class="grow"><b>' + esc(u.name) + '</b><div class="muted">@' + esc(u.handle || 'user') + '</div></div><div>Lvl ' + lvl + '</div></div>';
  }
  if (view === 'shop') {
    root.innerHTML = '<div class="h2">Shop</div><div class="card"><b>Theme Pack Rose</b><button class="btn btn-p btn-sm" type="button" onclick="store.setPack(\'rose\');applyTheme();alert(\'Aktiv\')">Aktivieren</button></div><div class="card"><b>Theme Pack Aurora</b><button class="btn btn-p btn-sm" type="button" onclick="store.setPack(\'aurora\');applyTheme();alert(\'Aktiv\')">Aktivieren</button></div>';
  }
  if (view === 'seasons') {
    var sxp = store.seasonXp(); var tier = Math.min(10, Math.floor(sxp / 50) + 1);
    root.innerHTML = '<div class="h2">Season 1</div><div class="card"><p>Season XP: <b>' + sxp + '</b> · Tier ' + tier + '/10</p><div style="height:10px;background:var(--s3);border-radius:99px;margin-top:10px;overflow:hidden"><div style="height:100%;width:' + Math.min(100, (sxp % 50) * 2) + '%;background:var(--a)"></div></div></div>';
  }
  if (view === 'favs') {
    var ids = store.favs(); var list = store.chars().filter(function (c) { return ids.indexOf(c.id) >= 0; });
    root.innerHTML = '<div class="h2">Favoriten</div>' + (list.length ? list.map(function (c) { return charCard(c); }).join('') : '<div class="empty">Keine.</div>');
  }
  if (view === 'forum') {
    var data = forumData(); var tab = window._forumTab || 'home';
    var tabs = '<div class="forum-tabs"><button class="forum-tab ' + (tab === 'home' ? 'on' : '') + '" type="button" onclick="window._forumTab=\'home\';render(\'forum\')">Uebersicht</button>' + data.categories.map(function (c) { return '<button class="forum-tab ' + (tab === c.id ? 'on' : '') + '" type="button" onclick="window._forumTab=\'' + c.id + '\';render(\'forum\')">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    if (tab === 'home') root.innerHTML = '<div class="forum-wrap"><div class="h2">Forum</div>' + tabs + data.categories.map(function (c) { return '<div class="forum-cat"><div class="forum-cat-h"><h3>' + esc(c.name) + '</h3><p class="muted">' + esc(c.desc) + '</p></div>' + renderForumList(c.id) + '</div>'; }).join('') + '</div>';
    else { var cat = data.categories.find(function (c) { return c.id === tab; }); root.innerHTML = '<div class="forum-wrap"><div class="h2">' + esc(cat ? cat.name : 'Forum') + '</div>' + tabs + '<div class="forum-cat">' + renderForumList(tab) + '</div></div>'; }
  }
  if (view === 'forum-thread') {
    var data = forumData(); var t = data.threads.find(function (x) { return x.id === window._forumThread; }); var posts = (data.posts[window._forumThread] || []);
    if (!t) { root.innerHTML = '<div class="empty">Nicht gefunden.</div>'; return; }
    root.innerHTML = '<button class="btn btn-g" type="button" onclick="render(\'forum\')">← Forum</button><h2 style="margin:14px 0 8px;font-size:20px">' + esc(t.title) + '</h2>' + posts.map(function (p) { return '<div class="forum-post"><b>' + esc(p.author) + '</b>' + (p.bot ? '<span class="bot-badge">BOT</span>' : '') + '<div style="margin-top:8px;white-space:pre-wrap">' + esc(p.body) + '</div></div>'; }).join('') + '<div class="card"><div class="form-g"><label>Antwort</label><textarea id="forumReply"></textarea></div><button class="btn btn-p" type="button" onclick="postForumReply(\'' + t.id + '\')">Senden</button></div>';
  }
  if (view === 'create') {
    root.innerHTML = '<div class="card glass"><div class="h2">Charakter erstellen</div><div class="form-g"><label>Profilbild</label><div class="row"><div class="avatar lg" id="cPreview" style="width:72px;height:72px">✨</div><div class="grow"><input type="file" id="cPhoto" accept="image/*"></div></div></div><div class="form-g"><label>Name *</label><input id="cn"></div><div class="form-g"><label>Begruessung *</label><textarea id="cg"></textarea></div><div class="form-g"><label>Tags</label><input id="ctags"></div><div class="form-g"><label>Kurz</label><input id="cs"></div><div class="form-g"><label>Lorebook 3.0</label><textarea id="cl"></textarea></div><div class="form-g"><label>Kategorie</label><select id="cc">' + CATS.filter(function (c) { return c !== 'Alle'; }).map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></div><button class="btn btn-p" type="button" onclick="saveChar()">Speichern</button></div>';
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
    root.innerHTML = '<div class="h2">Download-Center 2.0</div><div class="card"><b>PWA</b><p class="muted">Browser → Install / Zum Home-Bildschirm</p></div><div class="card"><b>Desktop / Mobile App</b><p class="muted">Geplant (Tauri / Capacitor). PWA nutzen.</p></div>';
  }
  if (view === 'docs') {
    root.innerHTML = '<div class="h2">Docs</div><div class="card"><b>Verby-ID</b><p class="muted">Settings → Handle.</p></div><div class="card"><b>Teilen</b><p class="muted">Profil → Teilen.</p></div><div class="card"><b>Security</b><p class="muted"><a href="/security.txt" style="color:var(--link)">security.txt</a></p></div>';
  }
  if (view === 'blog') {
    root.innerHTML = '<div class="h2">Blog</div><div class="card"><b>v6.0 Mega-Update</b><p class="muted">Teilen, Smart-Replies, Seasons, Security, neues Design.</p></div>';
  }
  if (view === 'moderation') {
    if (!isDev()) { root.innerHTML = '<div class="empty">Nur Mods/Devs.</div>'; return; }
    var reps = store.reports();
    root.innerHTML = '<div class="h2">Moderation</div>' + (reps.length ? reps.map(function (r) { return '<div class="card"><b>' + esc(r.type) + '</b> · ' + esc(r.target) + '<div class="muted">' + esc(r.reason) + '</div></div>'; }).join('') : '<div class="empty">Keine Reports.</div>');
  }
  if (view === 'dev') {
    if (!isDev()) { root.innerHTML = '<div class="empty">Kein Dev-Zugriff.</div>'; return; }
    var ff = store.flags().featureFlags || {};
    root.innerHTML = '<div class="card glass"><div class="h2">Dev Panel</div><div class="form-g"><label>E-Mail → Dev</label><input id="de"></div><button class="btn btn-p" type="button" onclick="devAction(\'dev\')">Zum Dev</button> <button class="btn btn-d" type="button" onclick="devAction(\'undev\')">Entziehen</button><div class="section-title">Flags</div>' + ['smartReplies','share','seasons','shop'].map(function (k) { return '<label class="row" style="margin:6px 0"><input type="checkbox" ' + (ff[k] !== false ? 'checked' : '') + ' onchange="toggleFlag(\'' + k + '\',this.checked)"> ' + k + '</label>'; }).join('') + '<button class="btn btn-d" style="margin-top:12px" type="button" onclick="devWipeChars()">Chars loeschen</button></div>';
  }
  if (view === 'settings') {
    var hasKey = VERBY_AI.isClaude() ? !!VERBY_AI.getClaudeKey() : !!VERBY_AI.getOpenAIKey();
    var th = store.theme(); var pack = store.pack();
    root.innerHTML = '<div class="card glass"><div class="h2">Settings</div><p class="muted">' + esc(u.email || '') + ' · @' + esc(u.handle || '') + '</p><p class="muted">v' + esc(window.VERBY_VERSION || '') + '</p><div class="form-g" style="margin-top:12px"><label>Verby-ID</label><input id="handleIn" value="' + esc(u.handle || '') + '"></div><button class="btn btn-g" type="button" onclick="saveHandle()">Handle speichern</button><div class="form-g" style="margin-top:12px"><label>Theme</label><select id="themeSel"><option value="dark"' + (th === 'dark' ? ' selected' : '') + '>Dunkel</option><option value="light"' + (th === 'light' ? ' selected' : '') + '>Hell</option></select></div><div class="form-g"><label>Theme-Pack</label><select id="packSel"><option value="default">Default</option><option value="aurora"' + (pack === 'aurora' ? ' selected' : '') + '>Aurora</option><option value="rose"' + (pack === 'rose' ? ' selected' : '') + '>Rose</option><option value="nord"' + (pack === 'nord' ? ' selected' : '') + '>Nord</option><option value="midnight"' + (pack === 'midnight' ? ' selected' : '') + '>Midnight</option></select></div><div class="form-g"><label>Accent</label><input id="accentIn" type="color" value="' + (store.accent() || '#8b5cf6') + '"></div><button class="btn btn-g" type="button" onclick="saveThemePack()">Design speichern</button><div class="form-g" style="margin-top:14px"><label>OpenAI Key</label><input id="oakey" type="password" placeholder="sk-proj-..." autocomplete="off"></div><div class="form-g"><label>Claude Key</label><input id="clkey" type="password" placeholder="sk-ant-..." autocomplete="off"></div><div class="form-g"><label>Modell</label><select id="aimodel">' + AI_MODELS.map(function (m) { return '<option value="' + m.id + '"' + (VERBY_AI.model === m.id ? ' selected' : '') + '>' + m.label + '</option>'; }).join('') + '</select></div><div class="form-g"><label>Style-Preset</label><select id="aistyle">' + AI_STYLES.map(function (s) { return '<option value="' + s.id + '"' + (VERBY_AI.style === s.id ? ' selected' : '') + '>' + s.label + '</option>'; }).join('') + '</select></div><button class="btn btn-p" type="button" onclick="saveOpenAIKey()">Keys speichern</button> <button class="btn btn-d" type="button" onclick="clearOpenAIKey()">Keys loeschen</button><p class="muted" style="margin-top:8px;font-size:12px">' + (hasKey ? 'Key aktiv' : 'Verby AI lokal') + '</p><div class="section-title">Backup / GDPR</div><button class="btn btn-g" type="button" onclick="exportBackup()">Backup</button> <button class="btn btn-g" type="button" onclick="importBackup()">Import</button> <button class="btn btn-d" type="button" onclick="deleteAccount()">Daten loeschen</button><div class="section-title">Session</div><button class="btn btn-d" type="button" onclick="logoutEverywhere()">Ueberall abmelden</button><button class="btn btn-g" style="width:100%;margin-top:12px" type="button" onclick="showPage(\'updates\')">Changelog</button><button class="btn btn-g" style="width:100%;margin-top:8px" type="button" onclick="showPage(\'privacy\')">Privacy</button><button class="btn btn-d" style="width:100%;margin-top:12px" type="button" onclick="logout()">Logout</button></div>';
  }
  if (view === 'profile' && window._prof) {
    var c = window._prof; var isFav = store.favs().indexOf(c.id) >= 0;
    var following = store.follows().indexOf(c.owner || c.id) >= 0;
    var avHtml = c.photo ? '<div class="avatar lg glow" style="margin:0 auto 12px;background-image:url(' + c.photo + ');background-size:cover"></div>' : '<div class="avatar lg glow" style="margin:0 auto 12px">' + (c.emoji || '✨') + '</div>';
    root.innerHTML = '<div class="card" style="text-align:center;overflow:hidden"><div class="banner"></div>' + avHtml + '<div class="h2">' + esc(c.name) + '</div><p class="muted">' + esc(c.short || '') + '</p><p class="muted" style="font-size:12px">' + esc(c.tags || '') + '</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px"><button class="btn btn-p" type="button" onclick="openChat(\'' + c.id + '\')">Chat</button><button class="btn btn-g" type="button" onclick="toggleFav(\'' + c.id + '\')">' + (isFav ? '★ Fav' : '☆ Fav') + '</button><button class="btn btn-g" type="button" onclick="shareChar(\'' + c.id + '\')">Teilen</button><button class="btn btn-g" type="button" onclick="toggleFollow(\'' + (c.owner || c.id) + '\')">' + (following ? 'Following' : 'Follow') + '</button><button class="btn btn-d" type="button" onclick="reportTarget(\'character\',\'' + c.id + '\')">Report</button><button class="btn btn-d" type="button" onclick="deleteChar(\'' + c.id + '\')">Loeschen</button></div>' + (c.lore ? '<div style="text-align:left;margin-top:14px"><div class="section-title">Lorebook</div><p style="font-size:13px;white-space:pre-wrap">' + esc(c.lore) + '</p></div>' : '') + '</div>';
  }
}
