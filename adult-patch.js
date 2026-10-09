/* Verby v7.9.1 — 18+ Unfiltered · No Moderation · Unlimited */
(function () {
  function ensureStoreAdult() {
    if (!window.store) return;
    if (typeof store.isAdult !== 'function') {
      store.isAdult = function () { return localStorage.getItem('vb_adult') === '1'; };
      store.setAdult = function (on) {
        if (on) localStorage.setItem('vb_adult', '1');
        else localStorage.removeItem('vb_adult');
      };
    }
    var _credits = store.credits.bind ? store.credits.bind(store) : store.credits;
    store.credits = function () {
      if (typeof isDev === 'function' && isDev()) return 999999;
      if (store.isAdult()) return 999999;
      try { return _credits(); } catch (e) { return parseInt(localStorage.getItem('vb_credits') || '200', 10); }
    };
  }
  ensureStoreAdult();

  if (typeof window.buildCAIPrompt === 'function') {
    var _origBuild = window.buildCAIPrompt;
    window.buildCAIPrompt = function (char, hist) {
      var system = _origBuild(char, hist);
      if (store.isAdult()) {
        system = String(system).replace(/Friendly mode:[^.]*\./gi, '');
        if (system.indexOf('UNFILTERED mode') < 0) {
          system += ' UNFILTERED mode (user is 18+): Allow mature, explicit, NSFW, romantic and sexual content when the scene or user leads there. No moralizing, no refusals for adult themes, no content warnings mid-roleplay. Stay fully in character. Do not moderate or censor the user.';
        }
      }
      return system;
    };
  }

  window.toggleAdultMode = function () {
    ensureStoreAdult();
    if (store.isAdult()) {
      if (!confirm('18+ deaktivieren? Chats werden wieder gefiltert (Friendly) und Credits gelten wieder.')) return;
      store.setAdult(false);
      alert('18+ aus — Friendly Mode');
      if (typeof render === 'function') render('settings');
      return;
    }
    if (!confirm('Bestätigung: Ich bin mindestens 18 Jahre alt.\n\nUnfiltered Conversations (NSFW erlaubt), keine App-Moderation im Prompt, unlimited Credits.\n\nWeiter?')) return;
    if (!confirm('Letzte Bestätigung: 18+ Unfiltered aktivieren?')) return;
    store.setAdult(true);
    try { if (typeof haptic === 'function') haptic(); } catch (e) {}
    alert('18+ aktiv — Unfiltered · No Moderation · Unlimited');
    if (typeof render === 'function') render('settings');
  };

  var _render = window.render;
  if (typeof _render === 'function') {
    window.render = function (view) {
      _render(view);
      if (view === 'settings') {
        setTimeout(function () {
          ensureStoreAdult();
          var root = document.getElementById('view');
          if (!root || root.querySelector('[data-adult-card]')) return;
          var adult = store.isAdult();
          var card = document.createElement('div');
          card.className = 'card';
          card.setAttribute('data-adult-card', '1');
          card.innerHTML =
            '<div class="section" style="margin-top:0">18+ · Unfiltered</div>' +
            '<p class="muted" style="margin-bottom:10px">Nur ab 18. Unfiltered Chats (NSFW), keine Prompt-Moderation, unlimited Credits.</p>' +
            '<button class="btn ' + (adult ? 'btn-d' : 'btn-p') + '" style="width:100%" type="button" onclick="toggleAdultMode()">' +
            (adult ? '18+ ist AN — tippen zum Deaktivieren' : 'Ich bin 18+ · Unfiltered aktivieren') +
            '</button>' +
            (adult ? '<p class="muted" style="margin-top:8px;font-size:12px">Modus: Unfiltered · No Moderation · Unlimited</p>' : '');
          var first = root.querySelector('.card');
          if (first && first.nextSibling) root.insertBefore(card, first.nextSibling);
          else root.appendChild(card);
        }, 80);
      }
    };
  }

  console.log('[Verby] 18+ patch · adult=' + (window.store && store.isAdult ? store.isAdult() : false));
})();
