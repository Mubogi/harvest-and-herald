/* Ministry Log: every entry carries a Scripture reminder. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const MAX_ENTRIES = 160;

  const Log = {
    entries: [],
    node: null,

    init(node) {
      this.node = node;
      this.render();
    },

    add(message, options) {
      const opts = options || {};
      const entry = {
        stamp: opts.stamp || '—',
        message,
        verse: opts.verse || '',
        tone: opts.tone || '',
        at: Date.now(),
      };
      this.entries.unshift(entry);
      if (this.entries.length > MAX_ENTRIES) this.entries.length = MAX_ENTRIES;
      this.render();
      return entry;
    },

    stampFor(state) {
      if (!state) return '—';
      return `D${state.day} ${U.formatClock(state.minutes)}`;
    },

    hydrate(entries) {
      this.entries = (entries || []).slice(0, MAX_ENTRIES);
      this.render();
    },

    clear() {
      this.entries = [];
      this.render();
    },

    render() {
      if (!this.node) return;
      const frag = document.createDocumentFragment();
      if (!this.entries.length) {
        const empty = U.el('div', 'log-entry');
        empty.appendChild(U.el('span', 'stamp', '—'));
        empty.appendChild(U.el('span', 'msg', 'The log is empty. Begin in the Prayer Room.'));
        empty.appendChild(U.el('span', 'verse', 'Psalm 127:1'));
        frag.appendChild(empty);
      } else {
        this.entries.forEach((entry) => {
          const row = U.el('div', `log-entry ${entry.tone}`.trim());
          row.appendChild(U.el('span', 'stamp', entry.stamp));
          row.appendChild(U.el('span', 'msg', entry.message));
          row.appendChild(U.el('span', 'verse', entry.verse || ''));
          frag.appendChild(row);
        });
      }
      this.node.replaceChildren(frag);
    },
  };

  root.Log = Log;
})(window);
