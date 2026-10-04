/* Verby v7.9 — Actions: save/delete char, fav, forum, keys, backup */
function saveChar() {
  var name = (document.getElementById('cn').value || '').trim();
  var greeting = (document.getElementById('cg').value || '').trim();
  if (!name || !greeting) return alert('Name + Begrüßung nötig');
  var item = {
    id: 'c' + Date.now(),
    name: name,
    greeting: greeting,
    short: (document.getElementById('cs').value || '').trim(),
    lore: (document.getElementById('cl').value || '').trim(),
    tags: (document.getElementById('ctags').value || '').trim(),
    category: document.getElementById('cc').value,
    emoji: '✨',
    photo: window._cPhotoData || null,
    owner: store.user().email,
    created: Date.now()
  };
  var list = store.chars();
  list.unshift(item);
  store.setChars(list);
  store.setThreads(item.id, [{ id: 'main', title: 'Hauptchat', updated: Date.now() }]);
  store.setChats(item.id, 'main', [{ role: 'bot', text: greeting, ts: Date.now() }]);
  window._cPhotoData = null;
  store.addXp(10);
  haptic();
  window._prof = item;
  render('profile');
}
function deleteChar(id) {
  if (!confirm('Charakter wirklich löschen?')) return;
  store.setChars(store.chars().filter(function (c) { return c.id !== id; }));
  store.setFavs(store.favs().filter(function (x) { return x !== id; }));
  try {
    Object.keys(localStorage).forEach(function (k) {
      if (k.indexOf('vb_chat_' + id) === 0 || k === 'vb_threads_' + id || k === 'vb_mem_' + id) localStorage.removeItem(k);
    });
  } catch (e) {}
  render('home');
}
function toggleFav(id) {
  var f = store.favs();
  var i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  store.setFavs(f);
  haptic();
  if (window._prof && window._prof.id === id) render('profile');
}
function shareChar(id) {
  var c = store.chars().find(function (x) { return x.id === id; });
  if (!c) return;
  var url = location.origin + '/?char=' + encodeURIComponent(id);
  var text = c.name + ' auf Verby — ' + (c.short || c.greeting || '').slice(0, 80);
  if (navigator.share) {
    navigator.share({ title: c.name, text: text, url: url }).catch(function () {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function () { alert('Link kopiert'); }).catch(function () { prompt('Link:', url); });
  } else prompt('Link:', url);
}
function postForumReply(tid) {
  var text = ((document.getElementById('forumReply') || {}).value || '').trim();
  if (!text) return;
  var data = ensureForumSeed();
  data.posts[tid] = data.posts[tid] || [];
  data.posts[tid].push({ id: 'p' + Date.now(), author: store.user().name, bot: false, ts: Date.now(), body: text });
  store.setForum(data);
  window._forumThread = tid;
  render('forum-thread');
}
function saveHandle() {
  var h = ((document.getElementById('handleIn') || {}).value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  if (!h || h.length < 3) return alert('Handle min. 3 Zeichen (a-z, 0-9, _)');
  var u = store.user();
  u.handle = h;
  store.setUser(u);
  queueCloudSync();
  alert('@' + h + ' gespeichert');
  render('settings');
}
function saveOpenAIKey() {
  var ok = ((document.getElementById('oakey') || {}).value || '').trim();
  var ck = ((document.getElementById('clkey') || {}).value || '').trim();
  if (ok) VERBY_AI.setOpenAIKey(ok);
  if (ck) VERBY_AI.setClaudeKey(ck);
  var m = document.getElementById('aimodel');
  var s = document.getElementById('aistyle');
  if (m) VERBY_AI.setModel(m.value);
  if (s) VERBY_AI.setStyle(s.value);
  alert('Gespeichert — leer = Server-Keys');
  render('settings');
}
function clearOpenAIKey() {
  VERBY_AI.setOpenAIKey('');
  VERBY_AI.setClaudeKey('');
  alert('Lokale Keys gelöscht');
  render('settings');
}
function exportBackup() {
  var data = {
    v: window.VERBY_VERSION || '7.9',
    ts: Date.now(),
    user: store.user(),
    chars: store.chars(),
    favs: store.favs(),
    forum: store.forum(),
    memories: {}
  };
  store.chars().forEach(function (c) {
    data.memories[c.id] = store.memory(c.id);
    data['threads_' + c.id] = store.threads(c.id);
    (store.threads(c.id) || [{ id: 'main' }]).forEach(function (t) {
      data['chat_' + c.id + '_' + t.id] = store.chats(c.id, t.id);
    });
  });
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'verby-backup-' + Date.now() + '.json';
  a.click();
}
function importBackup() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'application/json,.json';
  inp.onchange = function (e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        if (data.chars) store.setChars(data.chars);
        if (data.favs) store.setFavs(data.favs);
        if (data.forum) store.setForum(data.forum);
        if (data.memories) Object.keys(data.memories).forEach(function (id) { store.setMemory(id, data.memories[id]); });
        Object.keys(data).forEach(function (k) {
          if (k.indexOf('threads_') === 0) {
            var cid = k.slice(8);
            store.setThreads(cid, data[k]);
          }
          if (k.indexOf('chat_') === 0) {
            var parts = k.slice(5).split('_');
            var cid2 = parts[0];
            var tid = parts.slice(1).join('_') || 'main';
            store.setChats(cid2, tid, data[k]);
          }
        });
        alert('Import OK');
        render('home');
      } catch (err) { alert('Import fehlgeschlagen: ' + err.message); }
    };
    r.readAsText(f);
  };
  inp.click();
}
function deleteAccount() {
  if (!confirm('Alle lokalen Daten löschen?')) return;
  if (!confirm('Wirklich unwiderruflich?')) return;
  var keep = ['vb_app_version'];
  Object.keys(localStorage).forEach(function (k) {
    if (k.indexOf('vb_') === 0 && keep.indexOf(k) < 0) localStorage.removeItem(k);
  });
  try { if (sb) sb.auth.signOut(); } catch (e) {}
  alert('Daten gelöscht');
  showLanding();
}
