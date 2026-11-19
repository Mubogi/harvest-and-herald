/* Inner life: the Secret Place. Prayer, fasting, repentance, study, rest, family. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const St = root.State;

  /* Prayer returns more when the well is low, but with hard diminishing returns
     once it is full — you cannot bank grace by volume. */
  function prayerGain(spirit) {
    const headroom = (100 - spirit) / 100;
    return 6 + 20 * Math.pow(headroom, 1.15);
  }

  function pray(state) {
    const before = state.meters.spirit;
    const gain = prayerGain(before);
    St.adjust(state, 'spirit', gain);
    St.adjust(state, 'burnout', -3);
    St.adjust(state, 'compassion', 1);
    St.bump(state, 'prayers');
    const minutes = 45;
    St.advanceMinutes(state, minutes);
    const actual = state.meters.spirit - before;
    return {
      ok: true,
      tone: 'good',
      minutes,
      message: actual > 14
        ? 'The well was dry and you stayed until it was not. Something in you unclenched.'
        : actual > 5
          ? 'You prayed until the words stopped being performance. It helped.'
          : 'The well is nearly full. You prayed, and mostly you listened.',
      verse: root.Scriptures.verseFor('prayer'),
    };
  }

  function fast(state) {
    if (state.meters.burnout > 82) {
      return { ok: false, tone: 'warn', message: 'You are too spent to fast well. Rest first, then fast.', verse: root.Scriptures.verseFor('burnout') };
    }
    const before = state.meters.spirit;
    St.adjust(state, 'spirit', 20);
    St.adjust(state, 'doctrine', 4);
    St.adjust(state, 'burnout', -6);
    St.adjust(state, 'compassion', 3);
    St.bump(state, 'fasts');
    St.advanceMinutes(state, 180);
    const actual = state.meters.spirit - before;
    return {
      ok: true,
      tone: 'good',
      minutes: 180,
      message: actual > 15
        ? 'Three hours of hunger and honesty. The noise went quiet and the text opened.'
        : 'You fasted. The body complained; the spirit steadied.',
      verse: root.Scriptures.verseFor('fasting'),
    };
  }

  function repent(state) {
    const before = state.meters.spirit;
    const prideLoad = state.meters.burnout;
    const freed = 8 + prideLoad * 0.28;
    St.adjust(state, 'burnout', -freed);
    St.adjust(state, 'spirit', 9);
    St.adjust(state, 'compassion', 5);
    St.bump(state, 'prayers');
    St.advanceMinutes(state, 30);
    const actual = state.meters.spirit - before;
    return {
      ok: true,
      tone: 'good',
      minutes: 30,
      message: prideLoad > 55
        ? 'You named the thing you had been defending. It cost you, and it loosened the knot.'
        : 'You confessed what you could see and asked for light on what you could not.',
      verse: root.Scriptures.verseFor('repent'),
      spiritGain: actual,
    };
  }

  function study(state) {
    const before = state.meters.doctrine;
    const gain = 5 + (100 - before) * 0.22;
    St.adjust(state, 'doctrine', gain);
    St.adjust(state, 'spirit', -2);
    St.adjust(state, 'burnout', 2);
    St.bump(state, 'studies');
    St.advanceMinutes(state, 60);
    const actual = state.meters.doctrine - before;
    return {
      ok: true,
      tone: 'good',
      minutes: 60,
      message: actual > 12
        ? 'You read the passage in context and let it correct your outline, not the reverse.'
        : 'You studied. The text grew a little more familiar and a little more dangerous.',
      verse: root.Scriptures.verseFor('study'),
    };
  }

  function rest(state) {
    St.adjust(state, 'burnout', -22);
    St.adjust(state, 'spirit', 3);
    St.adjust(state, 'compassion', 2);
    St.bump(state, 'rests');
    St.advanceMinutes(state, 150);
    return {
      ok: true,
      tone: 'good',
      minutes: 150,
      message: state.meters.burnout > 45
        ? 'You slept, and the world did not fall apart while you did.'
        : 'You rested on purpose. It felt almost irresponsible, which is how you know you needed it.',
      verse: root.Scriptures.verseFor('rest'),
    };
  }

  function family(state) {
    const stale = state.day - state.flags.lastFamilyDay;
    St.adjust(state, 'burnout', -16);
    St.adjust(state, 'compassion', 6);
    St.adjust(state, 'spirit', 4);
    state.flags.lastFamilyDay = state.day;
    St.advanceMinutes(state, 120);
    return {
      ok: true,
      tone: 'good',
      minutes: 120,
      message: stale > 3
        ? 'You came home and were actually present. Someone at the table had been waiting for that.'
        : 'An evening at home. Small, ordinary, and the reason the ministry is sustainable.',
      verse: root.Scriptures.verseFor('family'),
    };
  }

  function serve(state) {
    St.adjust(state, 'compassion', 7);
    St.adjust(state, 'spirit', -2);
    St.adjust(state, 'burnout', 2);
    St.bump(state, 'servicesRendered');
    St.advanceMinutes(state, 60);
    return {
      ok: true,
      tone: 'good',
      minutes: 60,
      message: 'You did something useful with your hands — carried groceries, fixed a hinge, sat with a widow.',
      verse: root.Scriptures.verseFor('serve'),
    };
  }

  /* Per-tick drift: the well leaks, doctrine fades slowly, burnout creeps. */
  function tick(state, dtSeconds) {
    const hours = (dtSeconds * U.GAME_MINUTES_PER_REAL_SECOND) / 60;
    const m = state.meters;

    const leak = m.spirit > 70 ? 0.42 : m.spirit > 40 ? 0.26 : 0.14;
    m.spirit = U.clamp(m.spirit - leak * hours, 0, 100);

    if (hours > 0) m.doctrine = U.clamp(m.doctrine - 0.05 * hours, 0, 100);

    const strain = m.spirit < 25 ? 1.6 : m.spirit < 45 ? 0.75 : 0;
    m.burnout = U.clamp(m.burnout + (0.22 + strain) * hours, 0, 100);

    if (m.burnout > 70) m.compassion = U.clamp(m.compassion - 0.5 * hours, 0, 100);
    if (m.spirit > 65 && m.burnout < 40) m.compassion = U.clamp(m.compassion + 0.22 * hours, 0, 100);
  }

  function overflowLabel(spirit) {
    if (spirit >= 70) return 'Overflowing';
    if (spirit >= 60) return 'Full';
    if (spirit >= 45) return 'Steady';
    if (spirit >= 25) return 'Low';
    return 'Empty';
  }

  root.InnerLife = { pray, fast, repent, study, rest, family, serve, tick, overflowLabel };
})(window);
