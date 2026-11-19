/* Game controller: loop, input, actions, and all UI flows. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const St = root.State;
  const S = root.Scriptures;
  const P = root.Preaching;

  const Game = {
    state: null,
    town: null,
    lastTs: 0,
    acc: 0,
    paused: false,
    nearby: null,
    keys: {},
    cooldown: 0,
    busy: false,

    /* ---------- boot ---------- */
    init() {
      const canvas = document.getElementById('game');
      const seedParam = new URLSearchParams(location.search).get('seed');
      this.state = St.createState(seedParam ? Number(seedParam) : undefined);
      this.town = root.Town.buildTown(this.state.seed);
      root.game = this;

      root.Modal.init(document.getElementById('modalRoot'));
      root.Log.init(document.getElementById('logList'));
      root.HUD.init(document.getElementById('sidebar'), this);
      root.Renderer.init(canvas, this.state, this.town);

      this.bindInput(canvas);
      this.bindTopbar();
      this.buildActionBar();

      root.Log.add('You arrive in the district before sunrise. The town is asleep and the Prayer Room is unlocked.',
        { stamp: root.Log.stampFor(this.state), verse: 'Lamentations 3:23' });

      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);

      this.showIntro();
    },

    /* ---------- input ---------- */
    bindInput(canvas) {
      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const t = root.Renderer.tileAtPointer(e.clientX - rect.left, e.clientY - rect.top);
        root.Renderer.hoverTile = t;
        this.updateNearby();
      });

      canvas.addEventListener('click', (e) => {
        if (root.Modal.isOpen()) return;
        const rect = canvas.getBoundingClientRect();
        const t = root.Renderer.tileAtPointer(e.clientX - rect.left, e.clientY - rect.top);

        /* Clicking a person walks to them, then opens the encounter on arrival. */
        const target = this.personAt(t.col, t.row);
        if (target) {
          this.walkTo(target.x, target.y, () => {
            this.nearby = target;
            root.Renderer.nearbyId = target.id;
            this.updatePrompt();
            this.interact();
          });
          return;
        }
        this.tryMove(t.col, t.row);
      });

      window.addEventListener('keydown', (e) => {
        if (root.Modal.isOpen()) return;
        const k = e.key.toLowerCase();
        const moves = { w: [0, -1], arrowup: [0, -1], s: [0, 1], arrowdown: [0, 1], a: [-1, 0], arrowleft: [-1, 0], d: [1, 0], arrowright: [1, 0] };
        if (moves[k]) {
          e.preventDefault();
          this.step(moves[k][0], moves[k][1]);
          return;
        }
        if (k === 'e' || k === ' ') {
          e.preventDefault();
          if (k === ' ') { this.setSpeed(this.state.speed === 0 ? 1 : 0); return; }
          this.interact();
        }
        if (k === 'p') this.openPreach();
        if (k === 'r') this.openInnerLife();
        if (k === 'k') this.openHeartCheck();
        if (k === 'f') this.openFollowUp();
      });
    },

    bindTopbar() {
      document.querySelectorAll('#speedControls button').forEach((btn) => {
        btn.addEventListener('click', () => this.setSpeed(Number(btn.dataset.speed)));
      });
      document.getElementById('btnSave').addEventListener('click', () => this.doSave());
      document.getElementById('btnLoad').addEventListener('click', () => this.doLoad());
      document.getElementById('btnHelp').addEventListener('click', () => this.showHelp());
    },

    setSpeed(v) {
      this.state.speed = v;
      document.querySelectorAll('#speedControls button').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.speed) === v);
      });
    },

    /* ---------- movement ---------- */
    personAt(col, row) {
      let best = null;
      let bestDist = 1.1;
      this.state.people.forEach((person) => {
        if (person.resolved && person.stage !== 'drifting') return;
        const d = U.distance(col, row, person.x, person.y);
        if (d < bestDist) { bestDist = d; best = person; }
      });
      return best;
    },

    /* Breadth-first path around buildings. The town is small, so this is cheap. */
    findPath(fromCol, fromRow, toCol, toRow) {
      const size = this.town.size;
      const key = (c, r) => `${c},${r}`;
      const goal = key(toCol, toRow);
      const queue = [[fromCol, fromRow]];
      const cameFrom = new Map([[key(fromCol, fromRow), null]]);
      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

      while (queue.length) {
        const [c, r] = queue.shift();
        if (key(c, r) === goal) break;
        for (const [dc, dr] of dirs) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nr < 0 || nc >= size || nr >= size) continue;
          const k = key(nc, nr);
          if (cameFrom.has(k)) continue;
          if (root.Town.isBlocked(nc, nr, this.town.buildings)) continue;
          cameFrom.set(k, [c, r]);
          queue.push([nc, nr]);
        }
      }
      if (!cameFrom.has(goal)) return null;

      const path = [];
      let cur = [toCol, toRow];
      while (cur) {
        path.unshift(cur);
        cur = cameFrom.get(key(cur[0], cur[1]));
      }
      return path.slice(1);
    },

    /* Walk the path one tile at a time, then fire the callback. */
    walkTo(col, row, onArrive) {
      clearTimeout(this.walkTimer);
      const p = this.state.player;
      if (U.distance(p.col, p.row, col, row) < 1.6) {
        if (onArrive) onArrive();
        return;
      }
      const path = this.findPath(p.col, p.row, Math.round(col), Math.round(row));
      if (!path || !path.length) {
        this.toast('You cannot find a way through.', 'warn');
        return;
      }

      let i = 0;
      const stepOnce = () => {
        if (i >= path.length) {
          if (onArrive) onArrive();
          return;
        }
        const [nc, nr] = path[i++];
        p.col = nc;
        p.row = nr;
        this.state.minutes += 2;
        this.updateNearby(true);
        this.walkTimer = setTimeout(stepOnce, 75);
      };
      stepOnce();
    },

    tryMove(col, row) {
      if (root.Modal.isOpen()) return;
      const size = this.town.size;
      if (col < 0 || row < 0 || col >= size || row >= size) return;
      if (root.Town.isBlocked(col, row, this.town.buildings)) return;
      this.state.player.col = col;
      this.state.player.row = row;
      this.state.minutes += 3;
      this.updateNearby(true);
    },

    step(dc, dr) {
      const p = this.state.player;
      this.tryMove(p.col + dc, p.row + dr);
    },

    updateNearby(force) {
      const p = this.state.player;
      let best = null;
      let bestDist = 2.2;
      this.state.people.forEach((person) => {
        if (person.resolved && person.stage !== 'drifting') return;
        const d = U.distance(p.col, p.row, person.x, person.y);
        if (d < bestDist) { bestDist = d; best = person; }
      });
      const changed = (best && best.id) !== (this.nearby && this.nearby.id);
      this.nearby = best;
      root.Renderer.nearbyId = best ? best.id : null;

      const zone = root.Town.zoneAt(p.col, p.row);
      document.getElementById('zoneBadge').textContent = zone.name;

      if (changed || force) this.updatePrompt();
    },

    updatePrompt() {
      const prompt = document.getElementById('prompt');
      const person = this.nearby;
      if (!person) {
        prompt.classList.add('hidden');
        return;
      }
      const need = root.Encounters.needInfo(person.need);
      const isBeliever = ['newborn', 'growing', 'rooted', 'mentor', 'drifting'].includes(person.stage);
      prompt.classList.remove('hidden');
      prompt.textContent = isBeliever
        ? `${person.name} — ${U.stageLabel(person.stage)} · press E to disciple`
        : `${person.name} — ${need.label} · press E to talk`;
    },

    interact() {
      if (!this.nearby) {
        this.toast('No one nearby. Walk up to a person first.', 'warn');
        return;
      }
      const person = this.nearby;
      if (['newborn', 'growing', 'rooted', 'mentor', 'drifting'].includes(person.stage)) {
        this.openDisciple(person.id);
      } else {
        this.openEncounter(person.id);
      }
    },

    /* ---------- action bar ---------- */
    buildActionBar() {
      const bar = document.getElementById('actionBar');
      const defs = [
        { label: 'Prayer Room', hint: 'Pray, fast, repent, study', fn: () => this.openInnerLife() },
        { label: 'Preach / Teach', hint: 'Prepare and deliver a message (P)', fn: () => this.openPreach() },
        { label: 'Follow-Up', hint: 'Disciple new believers (F)', fn: () => this.openFollowUp() },
        { label: 'Heart Check', hint: 'Reflection summary (K)', fn: () => this.openHeartCheck() },
        { label: 'End Day', hint: 'Go home and rest', fn: () => this.endDay() },
      ];
      defs.forEach((d) => {
        const b = U.el('button', null, d.label);
        b.title = d.hint;
        b.addEventListener('click', d.fn);
        bar.appendChild(b);
      });
    },

    /* ---------- toasts ---------- */
    toast(message, tone) {
      const host = document.getElementById('toasts');
      const node = U.el('div', `toast ${tone || ''}`.trim(), message);
      host.appendChild(node);
      setTimeout(() => {
        node.style.transition = 'opacity .4s ease, transform .4s ease';
        node.style.opacity = '0';
        node.style.transform = 'translateX(16px)';
        setTimeout(() => node.remove(), 420);
      }, 4200);
    },

    log(message, kind, tone) {
      root.Log.add(message, {
        stamp: root.Log.stampFor(this.state),
        verse: S.verseFor(kind),
        tone: tone || 'good',
      });
    },

    /* ---------- inner life ---------- */
    openInnerLife() {
      const state = this.state;
      const m = state.meters;

      const build = () => {
        const wrap = U.el('div');
        wrap.innerHTML = `
          <div class="verse-box">
            "But when you pray, go into your room and shut the door and pray to your Father who is in secret."
            <cite>Matthew 6:6</cite>
          </div>
          <p style="margin-bottom:6px">The Secret Place is where the ministry is actually built. Everything you do out there draws down what you store up in here.</p>
          <div class="section-label">Current Condition <span class="hint">${root.InnerLife.overflowLabel(m.spirit)} overflow</span></div>
          <div style="font-size:12.5px;color:#b9a992;line-height:1.6">
            Secret Place <b style="color:#8fdfe8">${Math.round(m.spirit)}%</b> &middot;
            Doctrine <b style="color:#b4b9f0">${Math.round(m.doctrine)}%</b> &middot;
            Compassion <b style="color:#e6b3d4">${Math.round(m.compassion)}%</b> &middot;
            Burnout <b style="color:#e0a53f">${Math.round(m.burnout)}%</b>
          </div>
        `;
        const list = U.el('div', 'choice-list');
        list.style.marginTop = '14px';

        const acts = [
          { id: 'pray', title: 'Pray', sub: '45 min · refills the well, lowers burnout', fn: root.InnerLife.pray },
          { id: 'fast', title: 'Prayer and Fasting', sub: '3 hrs · the deepest refill there is', fn: root.InnerLife.fast },
          { id: 'repent', title: 'Repent', sub: '30 min · breaks pride loose, restores tenderness', fn: root.InnerLife.repent },
          { id: 'study', title: 'Study the Word', sub: '60 min · builds doctrine so you do not misquote', fn: root.InnerLife.study },
          { id: 'serve', title: 'Serve Someone Practical', sub: '60 min · builds compassion with your hands', fn: root.InnerLife.serve },
          { id: 'rest', title: 'Rest', sub: '2.5 hrs · obedience, not laziness', fn: root.InnerLife.rest },
          { id: 'family', title: 'Be Home With Family', sub: '2 hrs · the ministry you are tempted to skip', fn: root.InnerLife.family },
        ];

        acts.forEach((a) => {
          const btn = U.el('button', 'choice');
          btn.innerHTML = `<span class="tone wise">${U.escapeHtml(a.title)}</span>${U.escapeHtml(a.sub)}`;
          btn.addEventListener('click', () => {
            const res = a.fn(state);
            if (res.ok) {
              this.log(res.message, a.id, res.tone);
              this.toast(res.message, res.tone);
              root.HUD.render(state, true);
              api.setBody(build());
            } else {
              this.toast(res.message, 'warn');
            }
          });
          list.appendChild(btn);
        });

        wrap.appendChild(list);
        return wrap;
      };

      const api = root.Modal.open({
        title: 'The Secret Place',
        sub: '1 Corinthians 9:27 — discipline the body, or the preaching disqualifies the preacher',
        body: build(),
        actions: [{ label: 'Return to the Town', primary: true }],
      });
    },

    /* ---------- encounters ---------- */
    openEncounter(personId) {
      const state = this.state;
      const person = state.people.find((p) => p.id === personId);
      if (!person) return;
      const session = root.Encounters.createSession(person);
      const need = root.Encounters.needInfo(person.need);

      const api = root.Modal.open({
        title: person.name,
        sub: `${need.label} — you do not know that yet. Listen first.`,
        body: U.el('div'),
        dismissible: true,
        actions: [{ label: 'Walk Away', ghost: true }],
      });

      const renderStep = () => {
        if (session.step >= session.def.steps.length) {
          finish();
          return;
        }
        const stepDef = session.def.steps[session.step];
        const wrap = U.el('div');

        if (session.step === 0) {
          const open = U.el('p');
          open.style.fontStyle = 'italic';
          open.style.color = '#c4b6a2';
          open.textContent = session.def.open;
          wrap.appendChild(open);
        }

        const prev = session.history[session.history.length - 1];
        if (prev) {
          const res = U.el('div', 'verse-box');
          res.style.borderLeftColor = '#7d6a55';
          res.style.background = 'rgba(80,66,52,.2)';
          res.style.color = '#d9cbb8';
          res.style.fontStyle = 'normal';
          res.textContent = prev.choice.result;
          wrap.appendChild(res);
        }

        const ask = U.el('p');
        ask.style.fontWeight = '600';
        ask.style.color = '#e8dcc8';
        ask.textContent = stepDef.ask;
        wrap.appendChild(ask);

        const list = U.el('div', 'choice-list');
        stepDef.choices.forEach((choice) => {
          const btn = U.el('button', 'choice');
          btn.innerHTML = `<span class="tone ${U.escapeHtml(choice.tone)}">${U.escapeHtml(choice.tone)}</span>${U.escapeHtml(choice.text)}`;
          btn.addEventListener('click', () => {
            const done = root.Encounters.applyChoice(state, session, choice);
            if (done) finish();
            else renderStep();
          });
          list.appendChild(btn);
        });
        wrap.appendChild(list);

        const progress = U.el('div', 'meter-note');
        progress.style.marginTop = '12px';
        progress.textContent = `Step ${session.step + 1} of ${session.def.steps.length} · rapport ${session.rapport > 0 ? '+' : ''}${session.rapport}`;
        wrap.appendChild(progress);

        api.setBody(wrap);
      };

      const finish = () => {
        const result = root.Encounters.resolve(state, session);
        const wrap = U.el('div');
        const v = U.el('div', 'verse-box');
        v.innerHTML = `&ldquo;${U.escapeHtml(result.detail)}&rdquo;<cite>${U.escapeHtml(result.verse)}</cite>`;
        wrap.appendChild(v);

        const head = U.el('div');
        head.style.cssText = 'font-size:15px;color:#f0cd82;margin-bottom:8px;font-weight:600';
        head.textContent = result.headline;
        wrap.insertBefore(head, v);

        const stat = U.el('div', 'meter-note');
        stat.style.marginTop = '10px';
        stat.textContent = `Need: ${need.label} · Outcome: ${result.outcome} · Openness now ${Math.round(person.openness)}%`;
        wrap.appendChild(stat);

        if (result.outcome === 'converted') {
          const note = U.el('div', 'warn-banner');
          note.style.marginTop = '10px';
          note.textContent = 'They are a newborn believer now. Open Follow-Up and pair them with a mentor before the week is out.';
          wrap.appendChild(note);
        }

        api.setBody(wrap);
        api.setTitle(person.name, need.label);
        api.setActions([{ label: 'Amen', primary: true }]);

        this.log(`${person.name} (${need.label}): ${result.headline}.`, result.flags.harsh ? 'harsh' : 'convert', result.tone);
        if (result.detail) this.toast(result.headline, result.tone);
        root.Renderer.addFloater(
          result.outcome === 'converted' ? 'New Birth' : result.flags.harsh ? 'Wounded' : 'Heard',
          person.x, person.y,
          result.outcome === 'converted' ? '#a9d0a9' : result.flags.harsh ? '#e0928a' : '#f0cd82',
        );
        if (result.outcome === 'converted') root.Renderer.addParticles(person.x, person.y, 14, '#a9d0a9');
        root.HUD.render(state, true);
      };

      renderStep();
    },

    /* ---------- preaching ---------- */
    openPreach() {
      const state = this.state;
      const msg = P.createMessage();
      const playerZone = root.Town.zoneAt(state.player.col, state.player.row).id;
      const venueForZone = { marketplace: 'square', hall: 'hall', campus: 'campus', hospital: 'ward' }[playerZone];
      if (venueForZone) msg.venueId = venueForZone;

      const api = root.Modal.open({
        title: 'Prepare a Message',
        sub: 'Prayer preparation + Scripture theme + heart motive. All three, or it is noise.',
        body: U.el('div'),
        actions: [
          { label: 'Cancel', ghost: true },
          { label: 'Deliver', primary: true, keepOpen: true, onClick: () => attemptDeliver() },
        ],
      });

      const render = () => {
        const wrap = U.el('div');

        const verse = U.el('div', 'verse-box');
        verse.innerHTML = `&ldquo;Do your best to present yourself to God as one approved, a worker who has no need to be ashamed, rightly handling the word of truth.&rdquo;<cite>2 Timothy 2:15</cite>`;
        wrap.appendChild(verse);

        /* venue */
        const vLabel = U.el('div', 'section-label');
        vLabel.innerHTML = 'Where <span class="hint">context shapes the crowd</span>';
        wrap.appendChild(vLabel);
        const vGrid = U.el('div', 'pick-grid');
        P.VENUE_LIST.forEach((id) => {
          const v = P.VENUES[id];
          const b = U.el('button', `pick ${msg.venueId === id ? 'selected' : ''}`);
          b.innerHTML = `<span class="label">${U.escapeHtml(v.name)}</span>${U.escapeHtml(v.blurb)}<div class="detail">~${v.capacity} seats · ${v.minutes} min</div>`;
          b.addEventListener('click', () => { msg.venueId = id; render(); });
          vGrid.appendChild(b);
        });
        wrap.appendChild(vGrid);

        /* theme */
        const tLabel = U.el('div', 'section-label');
        tLabel.innerHTML = `Scripture Theme <span class="hint">deeper themes need deeper doctrine</span>`;
        wrap.appendChild(tLabel);
        const tGrid = U.el('div', 'pick-grid');
        S.THEMES.forEach((t) => {
          const b = U.el('button', `pick ${msg.themeId === t.id ? 'selected' : ''}`);
          const risk = state.meters.doctrine < t.difficulty * 17 ? ' ⚠ beyond your depth' : '';
          b.innerHTML = `<span class="label">${U.escapeHtml(t.verse)}</span>${U.escapeHtml(t.name)}<div class="detail">Depth ${t.difficulty}/3${risk}</div>`;
          b.addEventListener('click', () => { msg.themeId = t.id; render(); });
          tGrid.appendChild(b);
        });
        wrap.appendChild(tGrid);

        /* motive */
        const mLabel = U.el('div', 'section-label');
        mLabel.innerHTML = 'Heart Motive <span class="hint">God sees this one</span>';
        wrap.appendChild(mLabel);
        const mGrid = U.el('div', 'pick-grid');
        S.MOTIVES.forEach((mo) => {
          const b = U.el('button', `pick ${msg.motiveId === mo.id ? 'selected' : ''}`);
          const warn = mo.humility < 0 ? ' ⚠' : '';
          b.innerHTML = `<span class="label">${U.escapeHtml(mo.name)}${warn}</span>${U.escapeHtml(mo.note)}`;
          b.addEventListener('click', () => { msg.motiveId = mo.id; render(); });
          mGrid.appendChild(b);
        });
        wrap.appendChild(mGrid);

        /* prep */
        const pLabel = U.el('div', 'section-label');
        pLabel.innerHTML = `Prayer Preparation <span class="hint">pick up to two</span>`;
        wrap.appendChild(pLabel);
        const pGrid = U.el('div', 'pick-grid');
        S.PREP_OPTIONS.forEach((prep) => {
          const on = msg.prepIds.includes(prep.id);
          const b = U.el('button', `pick ${on ? 'selected' : ''}`);
          b.innerHTML = `<span class="label">${U.escapeHtml(prep.name)}</span>${U.escapeHtml(prep.note)}`;
          b.addEventListener('click', () => {
            if (msg.prepIds.includes(prep.id)) {
              msg.prepIds = msg.prepIds.filter((x) => x !== prep.id);
            } else {
              if (msg.prepIds.length >= 2) msg.prepIds.shift();
              msg.prepIds.push(prep.id);
            }
            render();
          });
          pGrid.appendChild(b);
        });
        wrap.appendChild(pGrid);

        /* preview */
        const prevLabel = U.el('div', 'section-label');
        prevLabel.innerHTML = 'Preview <span class="hint">what they will actually hear</span>';
        wrap.appendChild(prevLabel);
        const preview = U.el('div', 'preview');

        if (P.isComplete(msg)) {
          const composed = P.compose(msg);
          const power = P.computePower(state, msg);
          preview.innerHTML = `
            <div style="color:#8d7d69;font-size:11px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:5px">${U.escapeHtml(composed.verse)}</div>
            <div style="margin-bottom:6px">&ldquo;${U.escapeHtml(composed.opening)}&rdquo;</div>
            <div style="margin-bottom:6px">${U.escapeHtml(composed.prepLine)}</div>
            <div style="color:#e8dcc8;margin-bottom:6px">${U.escapeHtml(composed.body)}</div>
            <div style="font-style:italic;color:#a2917c">&ldquo;${U.escapeHtml(composed.close)}&rdquo;</div>
            <div style="margin-top:9px;padding-top:8px;border-top:1px dotted #443930;font-size:11.5px;color:${power.hollow ? '#e0928a' : '#a9d0a9'}">
              ${power.hollow
                ? `⚠ EMPTY MINISTRY — the well is at ${Math.round(state.meters.spirit)}%. Words will land hollow. Power ${Math.round(power.power)}.`
                : `Projected power: ${Math.round(power.power)} · integrity ${Math.round(power.integrity * 100)}%${power.doctrinalRisk > 0.4 ? ' · ⚠ doctrinal risk' : ''}`}
            </div>
          `;
        } else {
          preview.textContent = 'Choose a venue, a theme, a motive, and at least one preparation.';
        }
        wrap.appendChild(preview);

        api.setBody(wrap);
      };

      const attemptDeliver = () => {
        if (!P.isComplete(msg)) {
          this.toast('A message needs a venue, a theme, a motive, and preparation.', 'warn');
          return;
        }
        api.close();
        this.runSermon(msg);
      };

      render();
    },

    runSermon(msg) {
      const state = this.state;
      const result = P.deliver(state, msg);
      const c = result.counts;
      const p = result.power;

      const wrap = U.el('div');

      const opening = U.el('div', 'verse-box');
      opening.innerHTML = p.hollow
        ? `&ldquo;If I speak in the tongues of men and of angels, but have not love, I am a noisy gong or a clanging cymbal.&rdquo;<cite>1 Corinthians 13:1</cite>`
        : `&ldquo;How then will they call on him in whom they have not believed? And how are they to hear without someone preaching?&rdquo;<cite>Romans 10:14</cite>`;
      wrap.appendChild(opening);

      const grade = U.el('div', 'grade');
      const letter = U.el('div', 'grade-letter', p.hollow ? '!' : c.repentant > 0 ? '\u2726' : '\u00b7');
      const text = U.el('div', 'grade-text');
      text.innerHTML = `<b style="color:#f0cd82">${U.escapeHtml(result.venue.name)}</b><br>
        ${p.hollow
          ? 'The words were true and the well was dry. They heard a man performing, not a man who had been with God.'
          : c.repentant > 0
            ? 'Some of them came forward. Not because you were eloquent — because something real was in the room.'
            : 'The crowd was polite and unmoved. The message was not wrong; it was not carried.'}`;
      grade.appendChild(letter);
      grade.appendChild(text);
      wrap.appendChild(grade);

      const grid = U.el('div', 'stat-grid');
      grid.innerHTML = `
        <div class="stat"><div class="k">Heard</div><div class="v">${c.total}</div></div>
        <div class="stat"><div class="k">Repentant</div><div class="v">${c.repentant}</div></div>
        <div class="stat"><div class="k">Moved</div><div class="v">${c.moved}</div></div>
        <div class="stat"><div class="k">Hostile</div><div class="v">${c.hostile}</div></div>
      `;
      wrap.appendChild(grid);

      if (result.misquote) {
        const mq = U.el('div', 'warn-banner severe');
        mq.style.marginTop = '12px';
        mq.innerHTML = `<b>You misquoted the text.</b> You said ${U.escapeHtml(result.misquote.said)}<br>
          <span style="color:#e8cf9f">${U.escapeHtml(result.misquote.actual)}</span><br>
          <span style="font-size:11px;opacity:.8">Someone in the crowd knew better. This is what thin doctrine costs.</span>`;
        wrap.appendChild(mq);
      }

      if (result.converted.length) {
        const cv = U.el('div', 'warn-banner');
        cv.style.marginTop = '12px';
        cv.innerHTML = `<b>${result.converted.length} decision${result.converted.length > 1 ? 's' : ''} you can name:</b>
          ${result.converted.map((x) => U.escapeHtml(x.name)).join(', ')}.
          They are newborn believers. Follow up within the week or they will drift.`;
        wrap.appendChild(cv);
      }

      const api = root.Modal.open({
        title: 'After the Message',
        sub: `${result.venue.name} · ${result.record.theme} · motive: ${result.record.motive}`,
        body: wrap,
        actions: [],
      });

      this.log(
        `Preached "${result.record.theme}" at the ${result.venue.name}: ${c.repentant} repentant, ${c.moved} moved, ${c.hostile} hostile.`,
        p.hollow ? 'preachHollow' : 'preachFaithful',
        p.hollow ? 'bad' : c.repentant > 0 ? 'good' : 'warn',
      );
      if (result.misquote) this.log(`Misquoted Scripture in public: ${result.misquote.said}`, 'wrongVerse', 'bad');
      if (p.hollow) this.log('Preached from an empty well. The words were correct and the power was gone.', 'preachHollow', 'bad');

      result.converted.forEach((person) => {
        root.Renderer.addFloater('Born Again', person.x, person.y, '#a9d0a9');
        root.Renderer.addParticles(person.x, person.y, 12, '#a9d0a9');
      });

      root.HUD.render(state, true);

      /* questions */
      const questions = result.questions.slice();
      const askNext = () => {
        if (!questions.length) {
          api.setTitle('After the Message', 'The crowd disperses.');
          api.setActions([{ label: 'Go Back Into the Town', primary: true }]);
          return;
        }
        const q = questions.shift();
        const qWrap = U.el('div');
        const qp = U.el('p');
        qp.style.fontSize = '15px';
        qp.style.color = '#e8dcc8';
        qp.style.fontStyle = 'italic';
        qp.textContent = `Someone stays behind: ${q.ask}`;
        qWrap.appendChild(qp);

        const list = U.el('div', 'choice-list');
        const opts = U.shuffle([q.good].concat(q.errors));
        opts.forEach((opt) => {
          const b = U.el('button', 'choice');
          b.innerHTML = `<span class="tone ${U.escapeHtml(opt.tone)}">${opt.flag === 'gospel' ? 'sound' : opt.flag}</span>${U.escapeHtml(opt.text)}`;
          b.addEventListener('click', () => {
            P.answerQuestion(state, opt);
            const fb = U.el('div', 'verse-box');
            fb.style.borderLeftColor = opt.flag === 'gospel' || opt.flag === 'honest' ? '#6aa86a' : '#b8423a';
            fb.innerHTML = opt.flag === 'gospel' || opt.flag === 'honest'
              ? `You answered with truth and grace. They stayed to hear it. <cite>Colossians 4:6</cite>`
              : opt.flag === 'harsh'
                ? `The answer was technically true and the delivery was a wound. They left without another word. <cite>Ephesians 4:15</cite>`
                : `You said something that sounded kind and was not true. They will build on it, and it will not hold. <cite>2 Timothy 2:15</cite>`;
            qWrap.replaceChildren(fb);
            this.log(`Answered a question after the message (${opt.flag}).`,
              opt.flag === 'gospel' ? 'discern' : opt.flag === 'harsh' ? 'harsh' : 'doctrineError',
              opt.flag === 'gospel' || opt.flag === 'honest' ? 'good' : 'bad');
            api.setActions([{ label: questions.length ? 'Next Question' : 'Finish', primary: true, onClick: askNext }]);
          });
          list.appendChild(b);
        });
        qWrap.appendChild(list);
        api.setBody(qWrap);
        api.setTitle('After the Message', 'Questions from the crowd');
        api.setActions([]);
      };

      askNext();
    },

    /* ---------- discipleship ---------- */
    openFollowUp() {
      const state = this.state;
      const roster = root.Discipleship.roster(state);
      const wrap = U.el('div');

      const intro = U.el('div', 'verse-box');
      intro.innerHTML = `&ldquo;What you have heard from me... entrust to faithful men, who will be able to teach others also.&rdquo;<cite>2 Timothy 2:2</cite>`;
      wrap.appendChild(intro);

      if (!roster.length) {
        const empty = U.el('p');
        empty.textContent = 'No one yet. Evangelism births disciples; follow-up keeps them. Go and speak to someone in the town, or preach where they can hear.';
        wrap.appendChild(empty);
        root.Modal.open({
          title: 'Follow-Up', sub: 'One-on-one discipleship', body: wrap,
          actions: [{ label: 'Close', primary: true }],
        });
        return;
      }

      const list = U.el('div', 'choice-list');
      roster.forEach((person) => {
        const b = U.el('button', 'choice');
        const mentorName = root.Discipleship.mentorName(state, person);
        const stageColor = { newborn: '#c9a86a', growing: '#a9d0a9', rooted: '#7fc8d8', mentor: '#f0cd82', drifting: '#c96a7a' }[person.stage];
        b.innerHTML = `<span class="tone" style="color:${stageColor}">${U.escapeHtml(U.stageLabel(person.stage))} · ${Math.round(person.progress)}%</span>
          ${U.escapeHtml(person.name)}
          <div class="detail" style="margin-top:3px">${mentorName ? `mentored by ${U.escapeHtml(mentorName)}` : 'no mentor'}</div>`;
        b.addEventListener('click', () => {
          root.Modal.close();
          setTimeout(() => this.openDisciple(person.id), 60);
        });
        list.appendChild(b);
      });
      wrap.appendChild(list);

      root.Modal.open({
        title: 'Follow-Up',
        sub: `${roster.length} in your care — decisions are not disciples`,
        body: wrap,
        actions: [{ label: 'Close', primary: true }],
      });
    },

    openDisciple(personId) {
      const state = this.state;
      const person = state.people.find((p) => p.id === personId);
      if (!person) return;

      const api = root.Modal.open({
        title: person.name,
        sub: `${U.stageLabel(person.stage)} — ${Math.round(person.progress)}% toward maturity`,
        body: U.el('div'),
        actions: [{ label: 'Close', primary: true }],
      });

      const render = () => {
        const wrap = U.el('div');

        const track = U.el('div', 'meter-track');
        track.style.height = '11px';
        const fill = U.el('div', 'meter-fill');
        fill.style.width = `${person.progress}%`;
        fill.style.background = person.stage === 'drifting'
          ? 'linear-gradient(90deg,#a83a2f,#ef6a52)'
          : 'linear-gradient(90deg,#4f93a4,#8fdfe8)';
        track.appendChild(fill);
        wrap.appendChild(track);

        const stages = U.el('div', 'meter-note');
        stages.style.marginTop = '5px';
        stages.textContent = 'Newborn → Growing → Rooted → Mentor';
        wrap.appendChild(stages);

        if (person.stage === 'drifting') {
          const warn = U.el('div', 'warn-banner severe');
          warn.style.marginTop = '10px';
          warn.textContent = 'They are drifting. Neglect did this. Go to them — do not wait for them to come back on their own.';
          wrap.appendChild(warn);
        }

        const mentorLabel = root.Discipleship.mentorName(state, person);
        const info = U.el('div');
        info.style.cssText = 'font-size:12.5px;color:#b9a992;line-height:1.6;margin-top:11px';
        info.innerHTML = `Mentor: <b>${mentorLabel ? U.escapeHtml(mentorLabel) : 'none'}</b><br>
          Believer since day ${person.bornDay || '—'}<br>
          Days without care: ${Math.floor(person.driftTimer || 0)}`;
        wrap.appendChild(info);

        const careLabel = U.el('div', 'section-label');
        careLabel.innerHTML = 'Care <span class="hint">each visit moves them forward</span>';
        wrap.appendChild(careLabel);

        const list = U.el('div', 'choice-list');
        const options = root.Discipleship.eligible(state, person);
        if (!options.length) {
          const none = U.el('div', 'meter-note');
          none.textContent = 'No care actions available for them right now.';
          list.appendChild(none);
        }
        options.forEach((care) => {
          const b = U.el('button', 'choice');
          b.innerHTML = `<span class="tone wise">${U.escapeHtml(care.name)} · ${care.minutes} min</span>`;
          b.addEventListener('click', () => {
            const res = root.Discipleship.applyCare(state, person, care.id);
            if (!res.ok) {
              this.toast(res.message, 'warn');
              return;
            }
            this.log(`${person.name}: ${res.message}`, care.id === 'mentor' ? 'followUp' : care.id, 'good');
            if (res.stageUp) {
              this.log(res.stageUp, 'rooted', 'good');
              this.toast(res.stageUp, 'good');
              root.Renderer.addParticles(person.x, person.y, 10, '#8fdfe8');
            } else {
              this.toast(res.message, 'good');
            }
            root.HUD.render(state, true);
            api.setTitle(person.name, `${U.stageLabel(person.stage)} — ${Math.round(person.progress)}% toward maturity`);
            render();
          });
          list.appendChild(b);
        });
        wrap.appendChild(list);

        api.setBody(wrap);
      };

      render();
    },

    /* ---------- heart check ---------- */
    openHeartCheck() {
      const state = this.state;
      const m = state.meters;
      const s = state.stats;
      const d = root.Discipleship.summary(state);

      const score = U.clamp(
        m.spirit * 0.34 + m.doctrine * 0.2 + m.compassion * 0.24
        + (100 - m.burnout) * 0.14
        + U.clamp(d.rooted * 4 + d.mentor * 6, 0, 12),
        0, 100,
      );
      const grade = U.gradeFor(score);

      const questions = [];
      if (m.spirit < 35) questions.push('When did I last pray until the words stopped being performance?');
      if (m.burnout > 55) questions.push('What am I chasing that God never asked me to chase?');
      if (s.harshChoices > s.wiseChoices) questions.push('Where did I win an argument and lose a person this week?');
      if (d.unmentored > 0) questions.push('Who did I lead to Christ and then leave alone?');
      if (state.day - state.flags.lastFamilyDay > 2) questions.push('Who at my own table has been getting my leftovers?');
      if (m.doctrine < 45) questions.push('What text have I been teaching that I have not actually studied?');
      if (!questions.length) {
        questions.push('What is one thing God did this week that I did not stop to notice?');
        questions.push('Who is one person I could begin discipling this coming week?');
      }
      while (questions.length < 3) {
        questions.push('Is my private life consistent with my public preaching this week?');
        break;
      }

      const wrap = U.el('div');
      const gradeRow = U.el('div', 'grade');
      gradeRow.innerHTML = `<div class="grade-letter">${grade.letter}</div><div class="grade-text">${U.escapeHtml(grade.text)}<br><span style="color:#8d7d69;font-size:11px">Composite: ${Math.round(score)} / 100</span></div>`;
      wrap.appendChild(gradeRow);

      const grid = U.el('div', 'stat-grid');
      grid.innerHTML = `
        <div class="stat"><div class="k">Secret Place</div><div class="v">${Math.round(m.spirit)}%</div></div>
        <div class="stat"><div class="k">Doctrine</div><div class="v">${Math.round(m.doctrine)}%</div></div>
        <div class="stat"><div class="k">Compassion</div><div class="v">${Math.round(m.compassion)}%</div></div>
        <div class="stat"><div class="k">Burnout</div><div class="v">${Math.round(m.burnout)}%</div></div>
        <div class="stat"><div class="k">Decisions</div><div class="v">${s.decisions}</div></div>
        <div class="stat"><div class="k">Rooted Believers</div><div class="v">${d.rooted + d.mentor}</div></div>
      `;
      wrap.appendChild(grid);

      const qLabel = U.el('div', 'section-label');
      qLabel.innerHTML = 'Preacher\'s Heart Check <span class="hint">for ministry teams — answer honestly</span>';
      wrap.appendChild(qLabel);
      questions.slice(0, 4).forEach((q) => {
        wrap.appendChild(U.el('div', 'reflect-q', q));
      });

      const verse = U.el('div', 'verse-box');
      verse.style.marginTop = '14px';
      verse.innerHTML = `&ldquo;Keep a close watch on yourself and on the teaching. Persist in this, for by so doing you will save both yourself and your hearers.&rdquo;<cite>1 Timothy 4:16</cite>`;
      wrap.appendChild(verse);

      root.Modal.open({
        title: 'Preacher\'s Heart Check',
        sub: `Day ${state.day} · ${U.formatClock(state.minutes)}`,
        body: wrap,
        actions: [{ label: 'Close', primary: true }],
      });
    },

    /* ---------- end of day ---------- */
    endDay() {
      const state = this.state;
      const d = root.Discipleship.summary(state);
      const m = state.meters;

      const wrap = U.el('div');
      const summary = U.el('div', 'verse-box');
      summary.innerHTML = `&ldquo;Come away by yourselves to a desolate place and rest a while.&rdquo;<cite>Mark 6:31</cite>`;
      wrap.appendChild(summary);

      const body = U.el('p');
      body.innerHTML = `You close the day. <b style="color:#f0cd82">${d.drifting}</b> believer${d.drifting === 1 ? '' : 's'} drifting,
        <b style="color:#f0cd82">${d.unmentored}</b> without a mentor, and the Secret Place at
        <b style="color:#f0cd82">${Math.round(m.spirit)}%</b>.`;
      wrap.appendChild(body);

      if (m.burnout > 70) {
        const w = U.el('div', 'warn-banner severe');
        w.textContent = 'You are running on empty. Tomorrow, rest first — the town will still be there.';
        wrap.appendChild(w);
      }

      root.Modal.open({
        title: 'End the Day',
        sub: 'Night falls. Rest is obedience, not retreat.',
        body: wrap,
        actions: [
          { label: 'Stay Up a While', ghost: true },
          {
            label: 'Go Home and Sleep',
            primary: true,
            onClick: () => this.advanceDay(),
          },
        ],
      });
    },

    advanceDay() {
      const state = this.state;
      state.day += 1;
      state.minutes = St.DAY_START;

      /* overnight consequences */
      state.meters.burnout = U.clamp(state.meters.burnout - 14, 0, 100);
      state.meters.spirit = U.clamp(state.meters.spirit - 6, 0, 100);

      /* neglected believers decay overnight — the cost of no follow-up */
      const d = root.Discipleship.summary(state);
      state.people.forEach((person) => {
        if (!['newborn', 'growing', 'rooted'].includes(person.stage)) return;
        if (person.mentor) return;
        person.progress = Math.max(0, person.progress - 6);
        if (person.progress <= 0) {
          person.stage = 'drifting';
          person.driftTimer = 0;
          this.log(`${person.name} drifted further overnight. No one had walked with them.`, 'drift', 'bad');
        }
      });

      /* new townspeople appear as the district grows */
      if (state.day % 3 === 0) {
        const needPool = ['grief', 'pride', 'deception', 'legality', 'addiction', 'fear'];
        const zones = ['marketplace', 'campus', 'hospital', 'homes'];
        const zone = U.pick(zones);
        const spot = root.Town.randomSpotIn(zone, this.town.buildings, Math.random);
        const person = root.PeopleData.makePerson(`p${state.people.length}_${state.day}`, Math.random, U.pick(needPool), spot.col, spot.row);
        person.zone = zone;
        state.people.push(person);
        this.toast('Someone new has moved into the district.', 'good');
      }

      this.log(`Day ${state.day} begins. The town wakes up.`, 'rest', 'good');
      this.toast(`Day ${state.day} — a new morning.`, 'good');
      root.HUD.render(state, true);
      this.updateNearby(true);

      if (state.day % 5 === 0) {
        setTimeout(() => this.openHeartCheck(), 400);
      }
    },

    /* ---------- save / load ---------- */
    doSave() {
      const payload = Object.assign({}, this.state);
      const ok = St.save(payload);
      if (ok) {
        this.toast('Game saved to this browser.', 'good');
        this.log('Saved the game.', 'rest', 'good');
      } else {
        this.toast('Save failed — storage may be full or blocked.', 'bad');
      }
    },

    doLoad() {
      const saved = St.load();
      if (!saved) {
        this.toast('No save found in this browser.', 'warn');
        return;
      }
      this.state = saved.state;
      this.town = root.Town.buildTown(this.state.seed);
      root.Renderer.setState(this.state, this.town);
      root.Renderer.resize();
      root.Log.hydrate(this.state.log || []);
      root.HUD.render(this.state, true);
      this.setSpeed(this.state.speed || 1);
      this.updateNearby(true);
      this.toast(`Loaded save from ${new Date(saved.savedAt).toLocaleString()}`, 'good');
    },

    /* ---------- help & intro ---------- */
    showHelp() {
      const wrap = U.el('div');
      wrap.innerHTML = `
        <ul class="help-list">
          <li><b>Move</b> with <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or the arrow keys, or click a tile.</li>
          <li><b>Talk</b> to a nearby person with <kbd>E</kbd>. Listen before you speak — the need is not always the need they name.</li>
          <li><b>Preach</b> with <kbd>P</kbd>. A message needs prayer preparation, a Scripture theme, and a right motive. The crowd responds to your actual overflow, not your delivery.</li>
          <li><b>Disciple</b> with <kbd>F</kbd>. New believers drift and fall away if no one walks with them.</li>
          <li><b>Heart Check</b> with <kbd>K</kbd> for a reflection summary and questions for ministry teams.</li>
          <li><b>Pause</b> with <kbd>Space</kbd>. Speed controls are in the top bar.</li>
        </ul>
        <div class="verse-box" style="margin-top:14px">
          &ldquo;I discipline my body and keep it under control, lest after preaching to others I myself should be disqualified.&rdquo;
          <cite>1 Corinthians 9:27</cite>
        </div>
      `;
      root.Modal.open({
        title: 'How to Play',
        sub: 'The inner life feeds the outer work. There is no shortcut.',
        body: wrap,
        actions: [{ label: 'Understood', primary: true }],
      });
    },

    showIntro() {
      const wrap = U.el('div');
      wrap.innerHTML = `
        <div class="verse-box">
          &ldquo;Keep a close watch on yourself and on the teaching. Persist in this, for by so doing you will save both yourself and your hearers.&rdquo;
          <cite>1 Timothy 4:16</cite>
        </div>
        <p>You are a gospel worker sent to a district of <b style="color:#f0cd82">${this.state.people.length} souls</b> — a marketplace, a campus, a hospital ward, and rows of homes.</p>
        <p>The town does not need a better speaker. It needs a man or woman who has been with God. <b>Prayer fills the well. Study sharpens the blade. Compassion opens the door. Follow-up keeps the harvest.</b></p>
        <p style="color:#8d7d69;font-size:12px">Preach constantly without returning to the Secret Place, and your words will become hollow — accurate, loud, and powerless.</p>
      `;
      root.Modal.open({
        title: 'Harvest & Herald',
        sub: 'The Great Commission',
        body: wrap,
        actions: [
          { label: 'How to Play', ghost: true, keepOpen: true, onClick: () => this.showHelp() },
          { label: 'Begin the Day', primary: true },
        ],
        dismissible: false,
      });
    },

    /* ---------- loop ---------- */
    loop(ts) {
      const dt = Math.min((ts - (this.lastTs || ts)) / 1000, 0.25);
      this.lastTs = ts;

      const state = this.state;
      const running = state.speed > 0 && !root.Modal.isOpen();

      if (running) {
        const scaled = dt * state.speed;
        state.minutes += scaled * U.GAME_MINUTES_PER_REAL_SECOND;

        if (state.minutes >= St.DAY_END) {
          state.minutes = St.DAY_END;
          this.setSpeed(0);
          this.toast('Night has fallen. End the day from the action bar.', 'warn');
        }

        root.InnerLife.tick(state, scaled);
        root.Discipleship.tick(state, scaled, (kind, person) => {
          if (kind === 'drift') {
            this.log(`${person.name} has drifted. They were left alone too long.`, 'drift', 'bad');
            this.toast(`${person.name} is drifting away.`, 'bad');
          } else if (kind === 'mature') {
            this.log(`${person.name} has grown rooted through mentoring.`, 'rooted', 'good');
          }
        });

        this.autoSaveTimer = (this.autoSaveTimer || 0) + dt;
        if (this.autoSaveTimer > 20) {
          this.autoSaveTimer = 0;
          St.save(this.state);
        }
      }

      /* clock label */
      document.getElementById('dayLabel').textContent = `Day ${state.day}`;
      document.getElementById('clockLabel').textContent = U.formatClock(state.minutes);
      document.getElementById('phaseLabel').textContent = U.phaseOfDay(state.minutes);

      this.cooldown = Math.max(0, this.cooldown - dt);
      root.Renderer.draw(dt);
      root.HUD.render(state);
      this.updatePrompt();

      requestAnimationFrame(this.loop);
    },
  };

  root.Game = Game;
})(window);
