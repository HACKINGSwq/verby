// Verby v7.9 loader
(function(){
  function load(src){
    return new Promise(function(resolve, reject){
      var s = document.createElement('script');
      s.src = src + '?v=' + (window.VERBY_VERSION || '7.9.0') + '&t=' + Date.now();
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  load('app-core.js')
    .then(function(){ return load('app-ui.js'); })
    .then(function(){ return load('app-actions.js'); })
    .then(function(){ return load('app-chat.js'); })
    .catch(function(e){ console.error(e); alert('App-Load fehlgeschlagen'); });
})();
