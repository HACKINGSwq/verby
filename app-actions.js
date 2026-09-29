function saveChar() {
  var name = document.getElementById('cn').value.trim();
  var greeting = document.getElementById('cg').value.trim();
  if (!name || !greeting) return alert('Name + Begruessung');
  var tags = (document.getElementById('ctags') && document.getElementById('ctags').value.trim()) || '';
  var short = document.getElementById('cs').value.trim();
  var lore = document.getElementById('cl').value.trim();
  if (!tags) tags = autoTags(name + ' ' + short + ' ' + lore + ' ' + greeting);
  var list = store.chars();
  var item = {
    id: 'c' + Date.now(), name: name, greeting: greeting, short: short, lore: lore, tags: tags,
    category: document.getElementById('cc').value, emoji: '✨', photo: window._cPhotoData || null,
    owner: store.user().email, shareCode: 'VB' + Math.random().toString(36).slice(2, 8).toUpperCase()
  };
  list.unshift(item); store.setChars(list);
  store.setThreads(item.id, [{ id: 'main', title: 'Hauptchat', updated: Date.now(), tag: 'RP' }]);
  store.setChats(item.id, 'main', [{ role: 'bot', text: greeting, ts: Date.now() }]);
  window._cPhotoData = null; store.addXp(10); haptic(); pushNotif('Charakter', name + ' erstellt'); alert('Gespeichert'); render('home');
}
function autoTags(text) {
  var t = (text || '').toLowerCase(); var tags = [];
  if (/magie|elf|drache|ritter/.test(t)) tags.push('fantasy');
  if (/liebe|herz|roman/.test(t)) tags.push('romance');
  if (/weltall|roboter|cyber/.test(t)) tags.push('sci-fi');
  if (/freund|alltag|schule/.test(t)) tags.push('slice of life');
  if (/dunkel|grusel|geist/.test(t)) tags.push('horror');
  if (/abenteuer|reise|quest/.test(t)) tags.push('abenteuer');
  return tags.join(', ');
}
function shareChar(id) {
  var c = store.chars().find(function (x) { return x.id === id; }); if (!c) return;
  if (!c.shareCode) { c.shareCode = 'VB' + Math.random().toString(36).slice(2, 8).toUpperCase(); store.setChars(store.chars()); }
  var payload = btoa(unescape(encodeURIComponent(JSON.stringify({
    name: c.name, greeting: c.greeting, short: c.short, lore: c.lore, tags: c.tags, category: c.category, emoji: c.emoji, shareCode: c.shareCode
  }))));
  try { navigator.clipboard.writeText(c.shareCode + '\n' + payload); } catch (e) {}
  var st = store.stats(); st.shares = (st.shares || 0) + 1; store.setStats(st); checkBadges();
  prompt('Share-Code / Import-String:', payload);
}
function toggleFollow(id) {
  var f = store.follows(); var i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else { f.push(id); pushNotif('Follow', 'Du folgst jetzt ' + id); }
  store.setFollows(f); checkBadges(); if (window._prof) render('profile');
}
function reportTarget(type, target) {
  var reason = prompt('Report-Grund:'); if (!reason) return;
  var r = store.reports();
  r.unshift({ id: 'r' + Date.now(), type: type, target: target, reason: reason, by: (store.user() || {}).email, ts: Date.now() });
  store.setReports(r); audit('report', type + ':' + target); alert('Report gesendet'); pushNotif('Report', 'Danke — wir pruefen das.');
}
function deleteChar(id) {
  if (!confirm('Charakter loeschen?')) return;
  store.setChars(store.chars().filter(function (c) { return c.id !== id; }));
  store.setFavs(store.favs().filter(function (x) { return x !== id; }));
  audit('delete_char', id); render('home');
}
function toggleFav(id) {
  var f = store.favs(); var i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  store.setFavs(f); haptic(); if (window._prof && window._prof.id === id) render('profile'); else render('favs');
}
function postForumReply(tid) {
  var text = ((document.getElementById('forumReply') || {}).value || '').trim();
  if (!text) return alert('Text');
  var data = forumData(); data.posts[tid] = data.posts[tid] || [];
  data.posts[tid].push({ id: 'p' + Date.now(), author: (store.user() || {}).name || 'User', bot: false, ts: Date.now(), body: text });
  store.setForum(data); openForumThread(tid);
}
function devAction(type) {
  var e = ((document.getElementById('de') || {}).value || '').trim().toLowerCase(); if (!e) return alert('E-Mail');
  var f = store.flags(); f.devs = f.devs || [];
  if (type === 'dev' && f.devs.indexOf(e) < 0) f.devs.push(e);
  if (type === 'undev') f.devs = f.devs.filter(function (x) { return x !== e; });
  store.setFlags(f); audit(type, e); alert('OK'); render('dev');
}
function toggleFlag(key, on) {
  var f = store.flags(); f.featureFlags = f.featureFlags || {}; f.featureFlags[key] = !!on; store.setFlags(f); audit('flag', key + '=' + on);
}
function devWipeChars() { if (!confirm('Alle loeschen?')) return; store.setChars([]); render('dev'); }
async function logout() { try { if (sb) await sb.auth.signOut(); } catch (e) {} localStorage.removeItem('vb_user'); showLanding(); }
async function logoutEverywhere(silent) {
  try { if (sb) await sb.auth.signOut(); } catch (e) {}
  localStorage.removeItem('vb_user'); localStorage.removeItem('vb_last_active');
  if (!silent) alert('Ueberall abgemeldet');
  showLanding();
}
function saveHandle() {
  var h = ((document.getElementById('handleIn') || {}).value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (!h) return alert('Handle ungueltig');
  var u = store.user(); u.handle = h; store.setUser(u); alert('Handle: @' + h); render('settings');
}
function saveThemePack() {
  store.setTheme(document.getElementById('themeSel').value);
  store.setPack(document.getElementById('packSel').value);
  store.setAccent(document.getElementById('accentIn').value);
  applyTheme(); alert('Design gespeichert');
}
function saveOpenAIKey() {
  var ok = ((document.getElementById('oakey') || {}).value || '').trim();
  var ck = ((document.getElementById('clkey') || {}).value || '').trim();
  var m = document.getElementById('aimodel').value;
  var st = document.getElementById('aistyle').value;
  if (ok) { if (ok.indexOf('sk-') !== 0) return alert('OpenAI: sk-...'); VERBY_AI.setOpenAIKey(ok); }
  if (ck) { if (ck.indexOf('sk-ant-') !== 0) return alert('Claude: sk-ant-...'); VERBY_AI.setClaudeKey(ck); }
  VERBY_AI.setModel(m); VERBY_AI.setStyle(st);
  alert('Gespeichert'); render('settings');
}
function clearOpenAIKey() { VERBY_AI.setOpenAIKey(''); VERBY_AI.setClaudeKey(''); alert('Keys geloescht'); render('settings'); }
function exportBackup() {
  var data = {
    v: 6, user: store.user(), chars: store.chars(), favs: store.favs(), follows: store.follows(),
    badges: store.badges(), flags: store.flags(), stats: store.stats(), notifs: store.notifs()
  };
  var blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'verby-backup.json'; a.click();
  localStorage.setItem('vb_did_backup', '1'); checkBadges(); alert('Backup exportiert');
}
function importBackup() {
  var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json';
  inp.onchange = function () {
    var f = inp.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (data.chars) store.setChars(data.chars);
        if (data.favs) store.setFavs(data.favs);
        if (data.follows) store.setFollows(data.follows);
        if (data.badges) store.setBadges(data.badges);
        alert('Import OK'); render('home');
      } catch (e) { alert('Ungueltiges Backup'); }
    };
    r.readAsText(f);
  };
  inp.click();
}
function deleteAccount() {
  if (!confirm('Alle lokalen Verby-Daten loeschen?')) return;
  if (!confirm('Wirklich unwiderruflich?')) return;
  Object.keys(localStorage).forEach(function (k) { if (k.indexOf('vb_') === 0 || k.indexOf('sb-') === 0) localStorage.removeItem(k); });
  logoutEverywhere(true);
}
function openCmd() {
  var el = document.getElementById('cmdPalette'); el.classList.add('on');
  var inp = document.getElementById('cmdInput'); inp.value = ''; inp.focus(); drawCmd('');
}
function closeCmd() { document.getElementById('cmdPalette').classList.remove('on'); }
function drawCmd(q) {
  q = (q || '').toLowerCase();
  var items = NAV.map(function (n) { return { l: n.l, run: function () { closeCmd(); render(n.v); } }; });
  store.chars().forEach(function (c) {
    items.push({ l: 'Chat: ' + c.name, run: function () { closeCmd(); openChat(c.id); } });
  });
  items = items.filter(function (i) { return !q || i.l.toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
  document.getElementById('cmdRes').innerHTML = items.map(function (i, idx) {
    return '<div class="ri" data-i="' + idx + '">' + esc(i.l) + '</div>';
  }).join('');
  window._cmdItems = items;
  document.querySelectorAll('#cmdRes .ri').forEach(function (el) {
    el.onclick = function () { var it = window._cmdItems[parseInt(el.dataset.i, 10)]; if (it) it.run(); };
  });
}
document.addEventListener('keydown', function (e) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openCmd(); }
  if (e.key === 'Escape') closeCmd();
});
setTimeout(function () {
  var cmdInput = document.getElementById('cmdInput');
  if (cmdInput) cmdInput.addEventListener('input', function () { drawCmd(cmdInput.value); });
}, 0);
