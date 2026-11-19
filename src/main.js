/* Entry point. */
(function (root) {
  'use strict';

  function boot() {
    if (!document.getElementById('game').getContext) {
      document.body.innerHTML = '<p style="padding:40px;font-family:serif">This browser does not support HTML5 Canvas.</p>';
      return;
    }
    root.Game.init();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window);
