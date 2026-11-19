/* Small shared helpers. No dependencies. */
(function (root) {
  'use strict';

  const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const chance = (p) => Math.random() < p;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* Deterministic PRNG so a saved town regenerates identically. */
  function makeRng(seed) {
    let s = seed >>> 0 || 1;
    return function next() {
      s ^= s << 13; s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  const GAME_MINUTES_PER_REAL_SECOND = 3.2;

  function formatClock(totalMinutes) {
    const m = ((totalMinutes % 1440) + 1440) % 1440;
    const hour24 = Math.floor(m / 60);
    const minute = Math.floor(m % 60);
    const suffix = hour24 < 12 ? 'AM' : 'PM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
  }

  function phaseOfDay(totalMinutes) {
    const m = ((totalMinutes % 1440) + 1440) % 1440;
    if (m < 360) return 'Night';
    if (m < 720) return 'Morning';
    if (m < 1020) return 'Afternoon';
    if (m < 1200) return 'Evening';
    return 'Night';
  }

  function distance(ax, ay, bx, by) {
    return Math.hypot(ax - bx, ay - by);
  }

  function approach(current, target, rate, dt) {
    const diff = target - current;
    const step = rate * dt;
    if (Math.abs(diff) <= step) return target;
    return current + Math.sign(diff) * step;
  }

  function stageLabel(stage) {
    return {
      seeker: 'Seeker',
      newborn: 'New Believer',
      growing: 'Growing',
      rooted: 'Rooted',
      mentor: 'Mentor',
      drifting: 'Drifting',
      hardened: 'Hardened',
    }[stage] || stage;
  }

  function gradeFor(score) {
    if (score >= 88) return { letter: 'A', text: 'Faithful and fruitful. The inner life is feeding the outer work.' };
    if (score >= 76) return { letter: 'B', text: 'Steady ground. A few leaks, but the well is holding.' };
    if (score >= 62) return { letter: 'C', text: 'Mixed. Ministry is outrunning the Secret Place in places.' };
    if (score >= 46) return { letter: 'D', text: 'Running on fumes. Repentance and rest are overdue.' };
    return { letter: 'F', text: 'Hollow ministry. The words are loud but the well is dry.' };
  }

  root.Utils = {
    clamp, lerp, rand, randInt, pick, chance, shuffle, el, escapeHtml, makeRng,
    formatClock, phaseOfDay, distance, approach, stageLabel, gradeFor,
    GAME_MINUTES_PER_REAL_SECOND,
  };
})(window);
