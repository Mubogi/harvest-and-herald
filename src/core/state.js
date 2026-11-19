/* Central game state: creation, mutation helpers, and localStorage persistence. */
(function (root) {
  'use strict';

  const U = root.Utils;
  const SAVE_KEY = 'harvest-and-herald.save.v1';
  const DAY_START = 6 * 60;
  const DAY_END = 22 * 60;

  const ZONE_PEOPLE = [
    { zone: 'marketplace', count: 4 },
    { zone: 'campus', count: 3 },
    { zone: 'hospital', count: 3 },
    { zone: 'homes', count: 4 },
  ];

  const NEED_POOL = ['grief', 'pride', 'deception', 'legality', 'addiction', 'fear'];

  function createState(seed) {
    const s = {
      version: 1,
      seed: seed || Math.floor(Math.random() * 1e9),
      day: 1,
      minutes: DAY_START,
      speed: 1,
      player: { col: 12, row: 11, name: 'The Preacher' },
      meters: { spirit: 55, doctrine: 40, compassion: 45, burnout: 12 },
      stats: {
        conversations: 0, resolved: 0, decisions: 0, disciples: 0,
        rooted: 0, sermons: 0, harshChoices: 0, wiseChoices: 0,
        servicesRendered: 0, prayers: 0, studies: 0, rests: 0, fasts: 0,
      },
      people: [],
      sermons: [],
      log: [],
      flags: {
        lastFamilyDay: 1,
        lastSabbathDay: 0,
        warnedBurnout: false,
        milestoneDays: [],
      },
      history: { spirit: [], burnout: [], disciples: [] },
      lastHeartCheck: 0,
    };

    const rng = U.makeRng(s.seed);
    const town = root.Town.buildTown(s.seed);
    let pid = 0;
    ZONE_PEOPLE.forEach((group) => {
      for (let i = 0; i < group.count; i++) {
        const need = NEED_POOL[Math.floor(rng() * NEED_POOL.length)];
        const spot = root.Town.randomSpotIn(group.zone, town.buildings, rng);
        const person = root.PeopleData.makePerson(`p${pid++}`, rng, need, spot.col, spot.row);
        person.zone = group.zone;
        s.people.push(person);
      }
    });

    return s;
  }

  /* ---- meter helpers ---- */
  function adjust(state, meter, delta) {
    const m = state.meters;
    if (!(meter in m)) return 0;
    const before = m[meter];
    m[meter] = U.clamp(before + delta, 0, 100);
    return m[meter] - before;
  }

  function bump(state, statKey, delta) {
    if (!(statKey in state.stats)) return;
    state.stats[statKey] = Math.max(0, state.stats[statKey] + (delta == null ? 1 : delta));
  }

  function advanceMinutes(state, mins) {
    state.minutes += mins;
    while (state.minutes >= DAY_END) {
      state.minutes = DAY_START + (state.minutes - DAY_END);
      state.day += 1;
      return true;
    }
    return false;
  }

  function isNight(state) {
    return state.minutes >= DAY_END - 60;
  }

  function progress(state) {
    const m = state.meters;
    return U.clamp((state.minutes - DAY_START) / (DAY_END - DAY_START), 0, 1);
  }

  /* ---- persistence ---- */
  function save(state) {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ savedAt: Date.now(), state }));
      return true;
    } catch (err) {
      console.warn('Save failed', err);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.state || parsed.state.version !== 1) return null;
      return parsed;
    } catch (err) {
      console.warn('Load failed', err);
      return null;
    }
  }

  function hasSave() {
    return !!localStorage.getItem(SAVE_KEY);
  }

  function clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  root.State = {
    SAVE_KEY, DAY_START, DAY_END,
    createState, adjust, bump, advanceMinutes, isNight, progress,
    save, load, hasSave, clearSave,
  };
})(window);
