/* Sidebar HUD: inner-life meters, ministry stats, discipleship roster, warnings. */
(function (root) {
  'use strict';

  const U = root.Utils;

  const METERS = [
    {
      key: 'spirit', name: 'Secret Place Overflow', cls: 'fill-spirit',
      note: (v) => (v < 25
        ? 'The well is nearly dry. Preaching now will sound hollow.'
        : v < 45
          ? 'Low. Return to the Prayer Room before you stand up to speak.'
          : v < 70
            ? 'Steady, but leaking. Pray before the next message.'
            : 'Overflowing. What you carry is not your own.'),
    },
    {
      key: 'doctrine', name: 'Biblical Depth & Sound Doctrine', cls: 'fill-doctrine',
      note: (v) => (v < 25
        ? 'You are guessing at the text. Misquotes are likely.'
        : v < 45
          ? 'Thin. Hard questions will expose it.'
          : v < 70
            ? 'Adequate for simple themes; deeper ones will strain you.'
            : 'You handle the Word carefully. Difficult texts are safe in your hands.'),
    },
    {
      key: 'compassion', name: 'Humility & Compassion', cls: 'fill-compassion',
      note: (v) => (v < 25
        ? 'Harsh. Even correct words are landing as contempt.'
        : v < 45
          ? 'Cooling. People feel the difference before they can name it.'
          : v < 70
            ? 'Kind enough. Watch it under pressure.'
            : 'Warm. Hardened hearts are opening to you.'),
    },
  ];

  const HUD = {
    node: null,
    game: null,
    lastRender: 0,

    init(node, game) {
      this.node = node;
      this.game = game;
      this.build();
    },

    build() {
      this.node.innerHTML = `
        <div class="card" id="innerCard">
          <h2>Inner Life <span id="overflowTag"></span></h2>
          <div id="meterList"></div>
        </div>
        <div class="card">
          <h2>Ministry</h2>
          <div class="stat-grid" id="statGrid"></div>
          <div id="warningSlot" style="margin-top:9px"></div>
        </div>
        <div class="card">
          <h2>Those You Are Discipling <span id="rosterCount"></span></h2>
          <div class="roster" id="roster"></div>
        </div>
      `;
      this.meterList = this.node.querySelector('#meterList');
      this.statGrid = this.node.querySelector('#statGrid');
      this.roster = this.node.querySelector('#roster');
      this.rosterCount = this.node.querySelector('#rosterCount');
      this.warningSlot = this.node.querySelector('#warningSlot');
      this.overflowTag = this.node.querySelector('#overflowTag');

      METERS.forEach((m) => {
        const wrap = U.el('div', 'meter');
        const head = U.el('div', 'meter-head');
        head.appendChild(U.el('span', 'name', m.name));
        const val = U.el('span', 'val');
        head.appendChild(val);
        const track = U.el('div', 'meter-track');
        const fill = U.el('div', `meter-fill ${m.cls}`);
        track.appendChild(fill);
        const note = U.el('div', 'meter-note');
        wrap.appendChild(head);
        wrap.appendChild(track);
        wrap.appendChild(note);
        this.meterList.appendChild(wrap);
        m._val = val; m._fill = fill; m._note = note;
      });

      const burnout = U.el('div', 'meter');
      burnout.innerHTML = `
        <div class="meter-head"><span class="name">Burnout / Pride Warning</span><span class="val" id="burnoutVal"></span></div>
        <div class="meter-track"><div class="meter-fill fill-burnout" id="burnoutFill"></div></div>
        <div class="meter-note" id="burnoutNote"></div>
      `;
      this.meterList.appendChild(burnout);
      this.burnoutVal = burnout.querySelector('#burnoutVal');
      this.burnoutFill = burnout.querySelector('#burnoutFill');
      this.burnoutNote = burnout.querySelector('#burnoutNote');
    },

    render(state, force) {
      if (!state) return;
      const now = performance.now();
      if (!force && now - this.lastRender < 110) return;
      this.lastRender = now;

      const m = state.meters;

      METERS.forEach((def) => {
        const v = m[def.key];
        def._fill.style.width = `${v.toFixed(1)}%`;
        def._val.textContent = `${Math.round(v)}%`;
        def._note.textContent = def.note(v);
      });

      this.overflowTag.textContent = root.InnerLife.overflowLabel(m.spirit);
      this.overflowTag.style.color = m.spirit < 30 ? '#e0928a' : m.spirit < 60 ? '#e8cf9f' : '#a9d0a9';

      this.burnoutFill.style.width = `${m.burnout.toFixed(1)}%`;
      this.burnoutFill.classList.toggle('danger', m.burnout > 65);
      this.burnoutVal.textContent = `${Math.round(m.burnout)}%`;
      this.burnoutNote.textContent = m.burnout > 80
        ? 'Critical. You are preaching from an empty tank and it is showing.'
        : m.burnout > 60
          ? 'High. Rest, family, or repentance — soon.'
          : m.burnout > 35
            ? 'Climbing. Something is being driven by ego or exhaustion.'
            : 'Low. You are working from rest, not for it.';

      const s = state.stats;
      const d = root.Discipleship.summary(state);
      this.statGrid.innerHTML = `
        <div class="stat"><div class="k">Decisions</div><div class="v">${s.decisions}</div></div>
        <div class="stat"><div class="k">Discipled</div><div class="v">${s.rooted}<small> / ${d.total}</small></div></div>
        <div class="stat"><div class="k">Conversations</div><div class="v">${s.conversations}</div></div>
        <div class="stat"><div class="k">Sermons</div><div class="v">${s.sermons}</div></div>
      `;

      this.warningSlot.replaceChildren();
      if (d.drifting > 0) {
        const w = U.el('div', 'warn-banner severe');
        w.textContent = `${d.drifting} new believer${d.drifting > 1 ? 's are' : ' is'} drifting. They will fall away without follow-up.`;
        this.warningSlot.appendChild(w);
      } else if (d.unmentored > 0 && d.total > 0) {
        const w = U.el('div', 'warn-banner');
        w.textContent = `${d.unmentored} believer${d.unmentored > 1 ? 's have' : ' has'} no mentor yet.`;
        this.warningSlot.appendChild(w);
      } else if (m.spirit < 25) {
        const w = U.el('div', 'warn-banner severe');
        w.textContent = 'Empty ministry. The Secret Place is not optional — go pray before you preach again.';
        this.warningSlot.appendChild(w);
      } else if (m.burnout > 65) {
        const w = U.el('div', 'warn-banner');
        w.textContent = 'Burnout is high. Rest or take an evening with family.';
        this.warningSlot.appendChild(w);
      }

      const rosterList = root.Discipleship.roster(state);
      this.rosterCount.textContent = rosterList.length ? `${rosterList.length}` : '';
      this.roster.replaceChildren();
      if (!rosterList.length) {
        this.roster.appendChild(U.el('div', 'roster-empty', 'No one yet. Evangelism births them; follow-up keeps them.'));
      } else {
        rosterList.forEach((p) => {
          const row = U.el('div', 'roster-row');
          const dot = U.el('span', 'dot');
          dot.style.background = {
            newborn: '#c9a86a', growing: '#a9d0a9', rooted: '#7fc8d8',
            mentor: '#f0cd82', drifting: '#c96a7a',
          }[p.stage] || '#888';
          row.appendChild(dot);
          row.appendChild(U.el('span', 'who', p.name));
          row.appendChild(U.el('span', 'stage', `${U.stageLabel(p.stage)} ${Math.round(p.progress)}%`));
          row.addEventListener('click', () => this.game.openDisciple(p.id));
          row.style.cursor = 'pointer';
          this.roster.appendChild(row);
        });
      }
    },
  };

  root.HUD = HUD;
})(window);
