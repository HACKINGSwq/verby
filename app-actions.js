function saveChar() {
  var name = (document.getElementById('cn').value || '').trim();
  var greeting = (document.getElementById('cg').value || '').trim();
  if (!name || !greeting) return alert('Name + Begruessung');
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
    owner: store.user().email
  };
  var list = store.chars();
  list.unshift(item);
  store.setChars(list);
  store.setThreads(item.id, [{ id: 'main', title: 'Hauptchat', updated: Date.now() }]);
  store.setChats(item.id, 'main', [{ role: 'bot', text: greeting, ts: Date.now() }]);
  window._cPhotoData = null;
  store.addXp(10);
  alert('Gespeichert');
  window._prof = item;
  render('profile');
}
function deleteChar(id) {
  if (!confirm('Loeschen?')) return;
  store.setChars(store.chars().filter(function (c) { return c.id !== id; }));
  store.setFavs(store.favs().filter(function (x) { return x !== id; }));
  render('home');
}
function toggleFav(id) {
  var f = store.favs();
  var i = f.indexOf(id);
  if (i >= 0) f.splice(i, 1); else f.push(id);
  store.setFavs(f);
  if (window._prof && window._prof.id === id) render('profile');
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
  if (!h) return alert('Handle ungueltig');
  var u = store.user();
  u.handle = h;
  store.setUser(u);
  queueCloudSync();
  alert('@' + h);
  render('settings');
}
function saveOpenAIKey() {
  var ok = ((document.getElementById('oakey') || {}).value || '').trim();
  var ck = ((document.getElementById('clkey') || {}).value || '').trim();
  if (ok) VERBY_AI.setOpenAIKey(ok);
  if (ck) VERBY_AI.setClaudeKey(ck);
  VERBY_AI.setModel(document.getElementById('aimodel').value);
  VERBY_AI.setStyle(document.getElementById('aistyle').value);
  alert('Gespeichert');
  render('settings');
}
function clearOpenAIKey() {
  VERBY_AI.setOpenAIKey('');
  VERBY_AI.setClaudeKey('');
  alert('Keys geloescht');
  render('settings');
}
