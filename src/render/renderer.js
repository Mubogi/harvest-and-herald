/* Canvas renderer: isometric town, buildings, townspeople, lighting, effects. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const Iso = root.Iso;

  const TILE_W = Iso.TILE_W;
  const TILE_H = Iso.TILE_H;

  const Renderer = {
    canvas: null,
    ctx: null,
    state: null,
    town: null,
    originX: 0,
    originY: 0,
    dpr: 1,
    viewScale: 1,
    width: 0,
    height: 0,
    time: 0,
    hoverTile: null,
    particles: [],
    floaters: [],
    nearbyId: null,

    init(canvas, state, town) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.state = state;
      this.town = town;
      this.resize();
      window.addEventListener('resize', () => this.resize());
    },

    setState(state, town) {
      this.state = state;
      if (town) this.town = town;
      this.resize();
    },

    resize() {
      const rect = this.canvas.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = Math.round(rect.width * this.dpr);
      this.canvas.height = Math.round(rect.height * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

      /* Fit the whole town diamond into the viewport. */
      const size = this.town ? this.town.size : 26;
      const townW = size * TILE_W;
      const townH = size * TILE_H;
      const scaleX = (this.width - 56) / townW;
      const scaleY = (this.height - 120) / townH;
      this.viewScale = U.clamp(Math.min(scaleX, scaleY), 0.44, 1.2);

      this.originX = this.width / 2;
      this.originY = Math.max(26, (this.height - townH * this.viewScale) / 2 + 16);
    },

    /* Raw iso coordinates, before the view transform. */
    raw(col, row) {
      return Iso.toScreen(col, row, 0, 0);
    },

    /* Screen coordinates, for hit-testing and screen-space overlays. */
    project(col, row) {
      const p = this.raw(col, row);
      return {
        x: this.originX + p.x * this.viewScale,
        y: this.originY + p.y * this.viewScale,
      };
    },

    unproject(x, y) {
      return Iso.toTile((x - this.originX) / this.viewScale, (y - this.originY) / this.viewScale, 0, 0);
    },

    tileAtPointer(x, y) {
      const t = this.unproject(x, y);
      return { col: Math.round(t.col), row: Math.round(t.row) };
    },

    /* ---------- primitives (drawn inside the view transform) ---------- */
    diamond(cx, cy, w, h, fill, stroke) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h / 2);
      ctx.lineTo(cx + w / 2, cy);
      ctx.lineTo(cx, cy + h / 2);
      ctx.lineTo(cx - w / 2, cy);
      ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
    },

    /* A 3D box on tile (col,row), spanning w x d tiles, height in px. */
    box(col, row, w, d, height, palette, opts) {
      const ctx = this.ctx;
      const o = opts || {};
      const top = this.raw(col, row);
      const left = this.raw(col, row + d);
      const right = this.raw(col + w, row);
      const bottom = this.raw(col + w, row + d);

      const apexTop = top.y - height;
      const apexLeft = left.y - height;
      const apexRight = right.y - height;

      ctx.beginPath();
      ctx.moveTo(right.x, apexRight);
      ctx.lineTo(bottom.x, bottom.y - height);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.fillStyle = palette.side || palette.wall;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(left.x, apexLeft);
      ctx.lineTo(bottom.x, bottom.y - height);
      ctx.lineTo(bottom.x, bottom.y);
      ctx.lineTo(left.x, left.y);
      ctx.closePath();
      ctx.fillStyle = palette.wall;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.14)';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(top.x, apexTop);
      ctx.lineTo(right.x, apexRight);
      ctx.lineTo(bottom.x, bottom.y - height);
      ctx.lineTo(left.x, apexLeft);
      ctx.closePath();
      ctx.fillStyle = palette.roof;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.2)';
      ctx.stroke();

      if (o.detail !== false) this.windowDetail(left, right, bottom, height, palette);
      return { top: apexTop, bottom: bottom.y, cx: bottom.x };
    },

    windowDetail(left, right, bottom, height, palette) {
      const ctx = this.ctx;
      const win = palette.win || 'rgba(60,44,30,.55)';
      const rows = height > 34 ? 2 : 1;
      for (let r = 0; r < rows; r++) {
        const yFrac = 0.2 + r * 0.36;
        for (let i = 0; i < 2; i++) {
          const t = 0.3 + i * 0.38;
          const bx = U.lerp(right.x, bottom.x, t);
          const by = U.lerp(right.y, bottom.y, t) - height * (1 - yFrac);
          ctx.fillStyle = palette.lit ? 'rgba(255,214,140,.88)' : win;
          ctx.fillRect(bx - 2.4, by - 4, 4.8, 6.5);
        }
        for (let i = 0; i < 2; i++) {
          const t = 0.3 + i * 0.38;
          const bx = U.lerp(left.x, bottom.x, t);
          const by = U.lerp(left.y, bottom.y, t) - height * (1 - yFrac);
          ctx.fillStyle = palette.lit ? 'rgba(255,214,140,.72)' : win;
          ctx.fillRect(bx - 2.4, by - 4, 4.8, 6.5);
        }
      }
    },

    /* ---------- main draw ---------- */
    draw(dt) {
      const ctx = this.ctx;
      this.time += dt;
      const state = this.state;
      const town = this.town;
      if (!state || !town) return;

      this.drawSky();

      ctx.save();
      ctx.translate(this.originX, this.originY);
      ctx.scale(this.viewScale, this.viewScale);

      this.drawGround();

      const drawables = [];

      town.buildings.forEach((b) => {
        drawables.push({
          depth: Iso.depth(b.col, b.row) + (b.w + b.d) * 0.5,
          draw: () => this.drawBuilding(b),
        });
      });

      town.props.forEach((p) => {
        drawables.push({ depth: Iso.depth(p.col, p.row) + 0.3, draw: () => this.drawProp(p) });
      });

      state.people.forEach((person) => {
        drawables.push({
          depth: Iso.depth(person.x, person.y) + 0.5,
          draw: () => this.drawPerson(person),
        });
      });

      drawables.push({
        depth: Iso.depth(state.player.col, state.player.row) + 0.55,
        draw: () => this.drawPlayer(state.player),
      });

      drawables.sort((a, b) => a.depth - b.depth);
      drawables.forEach((d) => d.draw());

      ctx.restore();

      this.drawFloaters(dt);
      this.drawVignette();
      this.drawNightOverlay();
    },

    drawSky() {
      const ctx = this.ctx;
      const g = ctx.createLinearGradient(0, 0, 0, this.height);
      const night = this.nightness();
      g.addColorStop(0, this.mix('#3c4f63', '#0d1420', night));
      g.addColorStop(0.55, this.mix('#6b7d8a', '#18222c', night));
      g.addColorStop(1, this.mix('#9a927f', '#1e1c19', night));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.width, this.height);
    },

    nightness() {
      const s = this.state;
      if (!s) return 0;
      const m = s.minutes;
      if (m < 420) return 0.55;
      if (m < 540) return 0.55 * (1 - (m - 420) / 120);
      if (m < 1020) return 0;
      if (m < 1140) return ((m - 1020) / 120) * 0.62;
      return 0.62 + Math.min(0.3, (m - 1140) / 300);
    },

    mix(a, b, t) {
      const pa = this.hex(a); const pb = this.hex(b);
      return `rgb(${Math.round(U.lerp(pa[0], pb[0], t))},${Math.round(U.lerp(pa[1], pb[1], t))},${Math.round(U.lerp(pa[2], pb[2], t))})`;
    },

    hex(h) {
      const v = h.replace('#', '');
      return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
    },

    shade(hexColor, amount) {
      const [r, g, b] = this.hex(hexColor);
      const f = (v) => Math.round(U.clamp(amount < 0 ? v * (1 + amount) : v + (255 - v) * amount, 0, 255));
      return `rgb(${f(r)},${f(g)},${f(b)})`;
    },

    drawGround() {
      const town = this.town;
      const ctx = this.ctx;
      const size = town.size;

      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          const p = this.raw(col, row);
          const zone = root.Town.zoneAt(col, row);
          const checker = (col + row) % 2 === 0;
          let fill;
          if (zone.id === 'road') fill = checker ? '#8b8377' : '#877f73';
          else fill = checker ? zone.floor : zone.accent;
          this.diamond(p.x, p.y, TILE_W, TILE_H, fill, 'rgba(0,0,0,.05)');
        }
      }

      town.zoneList.forEach((key) => {
        const z = town.zones[key];
        const [c0, r0, c1, r1] = z.rect;
        const corners = [
          this.raw(c0, r0), this.raw(c1 + 1, r0),
          this.raw(c1 + 1, r1 + 1), this.raw(c0, r1 + 1),
        ];
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        corners.slice(1).forEach((c) => ctx.lineTo(c.x, c.y));
        ctx.closePath();
        ctx.strokeStyle = 'rgba(240,205,130,.16)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });

      if (this.hoverTile) {
        const { col, row } = this.hoverTile;
        if (col >= 0 && row >= 0 && col < size && row < size) {
          const p = this.raw(col, row);
          this.diamond(p.x, p.y, TILE_W, TILE_H, 'rgba(240,205,130,.2)', 'rgba(240,205,130,.55)');
        }
      }
    },

    drawBuilding(b) {
      const lit = this.nightness() > 0.25;
      const palette = { wall: b.wall, side: this.shade(b.wall, -0.14), roof: b.roof, lit };
      const g = this.box(b.col, b.row, b.w, b.d, b.h, palette);

      if (b.label) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = '9px "SF Mono", monospace';
        ctx.textAlign = 'center';
        const label = b.label.toUpperCase();
        const w = ctx.measureText(label).width + 10;
        const y = g.top - 8;
        ctx.fillStyle = 'rgba(20,16,13,.6)';
        ctx.beginPath();
        ctx.roundRect(g.cx - w / 2, y - 9, w, 13, 6);
        ctx.fill();
        ctx.fillStyle = 'rgba(240,229,208,.88)';
        ctx.fillText(label, g.cx, y + 1);
        ctx.restore();
      }
    },

    drawProp(p) {
      const ctx = this.ctx;
      const pos = this.raw(p.col, p.row);
      const lit = this.nightness() > 0.3;

      switch (p.type) {
        case 'tree': {
          const sway = Math.sin(this.time * 1.2 + p.col) * 1.6;
          ctx.fillStyle = 'rgba(0,0,0,.15)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 2, 11, 5.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#6a5238';
          ctx.fillRect(pos.x - 2, pos.y - 18, 4, 18);
          const greens = ['#4d6b3e', '#5b7c47', '#456036'];
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc(pos.x + sway * (i / 3), pos.y - 24 - i * 7, 11 - i * 2.2, 0, Math.PI * 2);
            ctx.fillStyle = greens[i];
            ctx.fill();
          }
          break;
        }
        case 'well': {
          ctx.fillStyle = 'rgba(0,0,0,.16)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 2, 15, 7, 0, 0, Math.PI * 2);
          ctx.fill();
          this.diamond(pos.x, pos.y - 4, 26, 13, '#9a9187', '#6f675e');
          this.diamond(pos.x, pos.y - 8, 18, 9, '#2b3a44', null);
          break;
        }
        case 'lamp': {
          ctx.fillStyle = '#4a4038';
          ctx.fillRect(pos.x - 1.5, pos.y - 22, 3, 22);
          const glow = lit ? 1 : 0.32;
          const g = ctx.createRadialGradient(pos.x, pos.y - 25, 0, pos.x, pos.y - 25, 26 * glow);
          g.addColorStop(0, `rgba(255,214,140,${0.5 * glow})`);
          g.addColorStop(1, 'rgba(255,214,140,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(pos.x, pos.y - 25, 26 * glow, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f5d79a';
          ctx.beginPath();
          ctx.arc(pos.x, pos.y - 25, 2.6, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'cart': {
          ctx.fillStyle = 'rgba(0,0,0,.14)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 2, 13, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#8a6a44';
          ctx.fillRect(pos.x - 11, pos.y - 14, 22, 10);
          ctx.fillStyle = '#6d5133';
          ctx.fillRect(pos.x - 11, pos.y - 16, 22, 3);
          ctx.fillStyle = '#3e332a';
          ctx.beginPath();
          ctx.arc(pos.x - 7, pos.y - 2, 4, 0, Math.PI * 2);
          ctx.arc(pos.x + 7, pos.y - 2, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'bench': {
          ctx.fillStyle = 'rgba(0,0,0,.13)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 1, 12, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7d6242';
          ctx.fillRect(pos.x - 10, pos.y - 8, 20, 4);
          ctx.fillRect(pos.x - 10, pos.y - 14, 20, 3);
          ctx.fillStyle = '#5e4931';
          ctx.fillRect(pos.x - 8, pos.y - 8, 2.5, 8);
          ctx.fillRect(pos.x + 5.5, pos.y - 8, 2.5, 8);
          break;
        }
        case 'grave': {
          ctx.fillStyle = 'rgba(0,0,0,.15)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 2, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#a9a49b';
          ctx.beginPath();
          ctx.roundRect(pos.x - 5, pos.y - 15, 10, 15, 4);
          ctx.fill();
          ctx.strokeStyle = 'rgba(60,56,50,.5)';
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y - 12);
          ctx.lineTo(pos.x, pos.y - 5);
          ctx.moveTo(pos.x - 3, pos.y - 9);
          ctx.lineTo(pos.x + 3, pos.y - 9);
          ctx.stroke();
          break;
        }
        case 'cross': {
          ctx.fillStyle = 'rgba(0,0,0,.16)';
          ctx.beginPath();
          ctx.ellipse(pos.x, pos.y + 2, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#7c6a54';
          ctx.fillRect(pos.x - 2, pos.y - 26, 4, 26);
          ctx.fillRect(pos.x - 8, pos.y - 21, 16, 3.5);
          break;
        }
        default:
          break;
      }
    },

    drawPerson(person) {
      const pos = this.raw(person.x, person.y);
      const ctx = this.ctx;
      const bob = Math.sin(this.time * 2 + (person.x + person.y)) * 1.2;
      const need = root.PeopleData.NEEDS[person.need];

      ctx.fillStyle = 'rgba(0,0,0,.19)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + 1, 6.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      const isNew = ['newborn', 'growing', 'rooted', 'mentor'].includes(person.stage);
      const bodyColor = person.stage === 'drifting' ? '#6f6470'
        : isNew ? '#7fa9b8' : '#8e8577';

      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.roundRect(pos.x - 4.5, pos.y - 17 + bob, 9, 16, 3.5);
      ctx.fill();

      ctx.fillStyle = '#d9c0a4';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 20 + bob, 4.2, 0, Math.PI * 2);
      ctx.fill();

      if (person.id === this.nearbyId) {
        ctx.strokeStyle = 'rgba(240,205,130,.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y - 10, 13, 0, Math.PI * 2);
        ctx.stroke();
      }

      const icon = person.stage === 'drifting' ? '\u2193'
        : isNew ? '\u2726'
          : need ? need.icon : '\u2022';
      const iconColor = person.stage === 'drifting' ? '#c96a7a'
        : isNew ? '#a9d0a9'
          : need ? need.color : '#aaa';

      ctx.save();
      ctx.fillStyle = 'rgba(18,14,11,.7)';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 33 + bob, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = iconColor;
      ctx.font = '10px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, pos.x, pos.y - 32.5 + bob);
      ctx.restore();
    },

    drawPlayer(player) {
      const pos = this.raw(player.col, player.row);
      const ctx = this.ctx;
      const bob = Math.sin(this.time * 2.4) * 1.1;

      ctx.fillStyle = 'rgba(0,0,0,.22)';
      ctx.beginPath();
      ctx.ellipse(pos.x, pos.y + 1, 8, 3.6, 0, 0, Math.PI * 2);
      ctx.fill();

      const glow = ctx.createRadialGradient(pos.x, pos.y - 8, 2, pos.x, pos.y - 8, 30);
      glow.addColorStop(0, 'rgba(240,205,130,.24)');
      glow.addColorStop(1, 'rgba(240,205,130,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 8, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e8e0d0';
      ctx.beginPath();
      ctx.moveTo(pos.x - 5, pos.y - 20 + bob);
      ctx.lineTo(pos.x + 5, pos.y - 20 + bob);
      ctx.lineTo(pos.x + 7, pos.y + 1);
      ctx.lineTo(pos.x - 7, pos.y + 1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(140,124,100,.5)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#b8892f';
      ctx.beginPath();
      ctx.moveTo(pos.x - 5, pos.y - 15 + bob);
      ctx.lineTo(pos.x + 5, pos.y - 17 + bob);
      ctx.lineTo(pos.x + 5, pos.y - 14 + bob);
      ctx.lineTo(pos.x - 5, pos.y - 12 + bob);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#d9b48f';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 24 + bob, 4.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a3a2c';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y - 26 + bob, 4.8, Math.PI, Math.PI * 2);
      ctx.fill();
    },

    /* ---------- fx (screen space) ---------- */
    addFloater(text, col, row, color) {
      const p = this.project(col, row);
      this.floaters.push({ text, x: p.x, y: p.y - 40 * this.viewScale, life: 0, ttl: 1.6, color: color || '#f0cd82' });
    },

    addParticles(col, row, count, color) {
      const p = this.project(col, row);
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: p.x + U.rand(-8, 8), y: p.y - U.rand(0, 22),
          vx: U.rand(-14, 14), vy: U.rand(-40, -16),
          life: 0, ttl: U.rand(0.7, 1.5), color,
        });
      }
    },

    drawFloaters(dt) {
      const ctx = this.ctx;
      this.floaters = this.floaters.filter((f) => {
        f.life += dt;
        if (f.life >= f.ttl) return false;
        const t = f.life / f.ttl;
        ctx.globalAlpha = 1 - t * t;
        ctx.fillStyle = f.color;
        ctx.font = 'bold 12px "Iowan Old Style", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText(f.text, f.x, f.y - t * 30);
        ctx.globalAlpha = 1;
        return true;
      });

      this.particles = this.particles.filter((p) => {
        p.life += dt;
        if (p.life >= p.ttl) return false;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 26 * dt;
        const t = p.life / p.ttl;
        ctx.globalAlpha = (1 - t) * 0.85;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 * (1 - t * 0.5), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        return true;
      });
    },

    drawVignette() {
      const ctx = this.ctx;
      const g = ctx.createRadialGradient(
        this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.34,
        this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.78,
      );
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,.4)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, this.width, this.height);
    },

    drawNightOverlay() {
      const n = this.nightness();
      if (n <= 0.02) return;
      const ctx = this.ctx;
      ctx.fillStyle = `rgba(16,22,40,${n * 0.36})`;
      ctx.fillRect(0, 0, this.width, this.height);
    },
  };

  root.Renderer = Renderer;
})(window);
