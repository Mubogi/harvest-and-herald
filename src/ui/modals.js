/* Modal plumbing: a tiny stack-based modal host with a small component vocabulary. */
(function (root) {
  'use strict';

  const U = root.Utils;

  const Modal = {
    root: null,
    stack: [],
    current: null,

    init(rootNode) {
      this.root = rootNode;
      this.root.addEventListener('click', (e) => {
        if (e.target === this.root && this.current && this.current.dismissible) this.close();
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.current && this.current.dismissible) this.close();
      });
    },

    /* opts: { title, sub, body(HTMLElement), actions:[{label, primary, onClick, keepOpen}], dismissible, onClose, width } */
    open(opts) {
      const body = U.el('div', 'modal-body');
      if (typeof opts.body === 'string') body.innerHTML = opts.body;
      else if (opts.body) body.appendChild(opts.body);

      const modal = U.el('div', 'modal');
      if (opts.width) modal.style.width = opts.width;

      const head = U.el('div', 'modal-head');
      const titleWrap = U.el('div');
      titleWrap.appendChild(U.el('h3', null, opts.title || ''));
      if (opts.sub) titleWrap.appendChild(U.el('div', 'sub', opts.sub));
      head.appendChild(titleWrap);

      const foot = U.el('div', 'modal-foot');
      const actions = opts.actions || [{ label: 'Close', primary: true }];

      const api = {
        modal, body, foot,
        dismissible: opts.dismissible !== false,
        onClose: opts.onClose,
        close: () => this.close(),
        setBody: (node) => {
          body.replaceChildren();
          if (typeof node === 'string') body.innerHTML = node;
          else if (node) body.appendChild(node);
        },
        setActions: (list) => {
          foot.replaceChildren();
          list.forEach((a) => foot.appendChild(this.makeButton(a)));
        },
        setTitle: (t, s) => {
          titleWrap.replaceChildren();
          titleWrap.appendChild(U.el('h3', null, t || ''));
          if (s) titleWrap.appendChild(U.el('div', 'sub', s));
        },
      };

      if (this.current && this.current.dismissible === false) {
        /* Non-dismissible modals must resolve before another opens. */
        return this.current;
      }

      actions.forEach((a) => foot.appendChild(this.makeButton(a)));
      modal.appendChild(head);
      modal.appendChild(body);
      modal.appendChild(foot);

      this.root.replaceChildren(modal);
      this.root.classList.remove('hidden');
      this.root.setAttribute('aria-hidden', 'false');
      this.current = api;
      this.stack.push(api);
      return api;
    },

    makeButton(action) {
      const btn = U.el('button', action.primary ? 'primary' : (action.ghost ? 'ghost' : ''), action.label);
      if (action.disabled) btn.disabled = true;
      btn.addEventListener('click', () => {
        if (action.onClick) action.onClick();
        if (!action.keepOpen) this.close();
      });
      return btn;
    },

    close() {
      const closing = this.current;
      this.current = null;
      this.stack.pop();
      this.root.classList.add('hidden');
      this.root.setAttribute('aria-hidden', 'true');
      this.root.replaceChildren();
      if (closing && closing.onClose) closing.onClose();
    },

    isOpen() {
      return !!this.current;
    },
  };

  root.Modal = Modal;
})(window);
