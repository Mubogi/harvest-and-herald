/* Town layout: zones, buildings, props. Pure data + helpers, no rendering. */
(function (root) {
  'use strict';

  const SIZE = 26;

  const ZONES = {
    marketplace: {
      id: 'marketplace', name: 'Marketplace', rect: [2, 2, 10, 9],
      floor: '#b9a077', accent: '#a68c62',
      blurb: 'Where the town argues, trades, and overhears everything.',
    },
    campus: {
      id: 'campus', name: 'Campus & School', rect: [13, 2, 23, 8],
      floor: '#9dae86', accent: '#8b9c74',
      blurb: 'Students with sharp questions and no patience for slogans.',
    },
    hospital: {
      id: 'hospital', name: 'Hospital & Needy Quarter', rect: [2, 12, 10, 19],
      floor: '#b6ada4', accent: '#a49b92',
      blurb: 'The ward, the shelter, the ones nobody visits.',
    },
    homes: {
      id: 'homes', name: 'Neighborhood Homes', rect: [13, 11, 23, 19],
      floor: '#a8a07a', accent: '#968e6a',
      blurb: 'Front porches, quiet grief, and children underfoot.',
    },
    prayer: {
      id: 'prayer', name: 'Prayer Room', rect: [2, 21, 9, 24],
      floor: '#8a92a8', accent: '#7b8399',
      blurb: 'Small, plain, and the most important room in the district.',
    },
    hall: {
      id: 'hall', name: 'Teaching Hall', rect: [13, 21, 23, 24],
      floor: '#a89a86', accent: '#978a77',
      blurb: 'Where the gathered church sits close enough to be seen through.',
    },
    road: {
      id: 'road', name: 'Roads', rect: [0, 0, SIZE - 1, SIZE - 1],
      floor: '#8d8577', accent: '#807869',
      blurb: '',
    },
  };

  const ZONE_LIST = ['marketplace', 'campus', 'hospital', 'homes', 'prayer', 'hall'];

  const BUILDINGS = [
    { zone: 'marketplace', col: 3, row: 3, w: 2, d: 2, h: 26, roof: '#8f5f3f', wall: '#d3bd97', label: 'Stalls' },
    { zone: 'marketplace', col: 7, row: 3, w: 2, d: 2, h: 34, roof: '#7a4f3a', wall: '#cbb590', label: 'Grain Store' },
    { zone: 'marketplace', col: 3, row: 7, w: 3, d: 2, h: 30, roof: '#8a5a3c', wall: '#d8c4a0', label: 'Inn' },
    { zone: 'campus', col: 14, row: 3, w: 3, d: 2, h: 42, roof: '#6a7f5a', wall: '#cfd3bd', label: 'School' },
    { zone: 'campus', col: 19, row: 3, w: 2, d: 2, h: 36, roof: '#5f7452', wall: '#c6cbb2', label: 'Library' },
    { zone: 'campus', col: 14, row: 6, w: 2, d: 2, h: 24, roof: '#6f8560', wall: '#ccd1ba', label: 'Dorm' },
    { zone: 'hospital', col: 3, row: 13, w: 3, d: 2, h: 38, roof: '#8c7f78', wall: '#ded6cd', label: 'Ward' },
    { zone: 'hospital', col: 7, row: 13, w: 2, d: 2, h: 28, roof: '#8a7d76', wall: '#d5ccc2', label: 'Shelter' },
    { zone: 'hospital', col: 3, row: 17, w: 2, d: 2, h: 22, roof: '#8f8279', wall: '#d9d1c8', label: 'Clinic' },
    { zone: 'homes', col: 14, row: 12, w: 2, d: 2, h: 26, roof: '#a05f47', wall: '#e0cbaa', label: 'Home' },
    { zone: 'homes', col: 18, row: 12, w: 2, d: 2, h: 24, roof: '#9a5b44', wall: '#dcc7a6', label: 'Home' },
    { zone: 'homes', col: 21, row: 14, w: 2, d: 2, h: 26, roof: '#a4644a', wall: '#e2cdac', label: 'Home' },
    { zone: 'homes', col: 14, row: 16, w: 2, d: 2, h: 22, roof: '#96583f', wall: '#dbc6a5', label: 'Home' },
    { zone: 'homes', col: 18, row: 17, w: 2, d: 2, h: 24, roof: '#a2604a', wall: '#dfcaa9', label: 'Home' },
    { zone: 'prayer', col: 4, row: 22, w: 2, d: 2, h: 20, roof: '#6d7893', wall: '#cdd2df', label: 'Prayer Room' },
    { zone: 'hall', col: 16, row: 22, w: 4, d: 2, h: 34, roof: '#7d6a55', wall: '#ded0b8', label: 'Teaching Hall' },
  ];

  const PROPS = [
    { type: 'well', col: 6, row: 6 },
    { type: 'tree', col: 2, row: 10 }, { type: 'tree', col: 11, row: 4 },
    { type: 'tree', col: 12, row: 9 }, { type: 'tree', col: 16, row: 9 },
    { type: 'tree', col: 22, row: 6 }, { type: 'tree', col: 25, row: 12 },
    { type: 'tree', col: 2, row: 16 }, { type: 'tree', col: 11, row: 18 },
    { type: 'tree', col: 12, row: 14 }, { type: 'tree', col: 24, row: 20 },
    { type: 'tree', col: 10, row: 22 }, { type: 'tree', col: 12, row: 24 },
    { type: 'lamp', col: 9, row: 9 }, { type: 'lamp', col: 15, row: 10 },
    { type: 'lamp', col: 9, row: 14 }, { type: 'lamp', col: 12, row: 20 },
    { type: 'cart', col: 9, row: 5 }, { type: 'cart', col: 5, row: 9 },
    { type: 'bench', col: 17, row: 7 }, { type: 'bench', col: 20, row: 19 },
    { type: 'bench', col: 7, row: 24 }, { type: 'bench', col: 21, row: 23 },
    { type: 'grave', col: 5, row: 19 }, { type: 'grave', col: 9, row: 19 },
    { type: 'cross', col: 8, row: 23 },
  ];

  function zoneAt(col, row) {
    for (const key of ZONE_LIST) {
      const [c0, r0, c1, r1] = ZONES[key].rect;
      if (col >= c0 && col <= c1 && row >= r0 && row <= r1) return ZONES[key];
    }
    return ZONES.road;
  }

  function isBlocked(col, row, buildings) {
    if (col < 0 || row < 0 || col >= SIZE || row >= SIZE) return true;
    for (const b of buildings) {
      if (col >= b.col && col < b.col + b.w && row >= b.row && row < b.row + b.d) return true;
    }
    return false;
  }

  function randomSpotIn(zoneId, buildings, rng) {
    const zone = ZONES[zoneId];
    const [c0, r0, c1, r1] = zone.rect;
    const r = rng || Math.random;
    for (let tries = 0; tries < 40; tries++) {
      const col = c0 + Math.floor(r() * (c1 - c0 + 1));
      const row = r0 + Math.floor(r() * (r1 - r0 + 1));
      if (!isBlocked(col, row, buildings)) return { col, row };
    }
    return { col: c0, row: r0 };
  }

  function buildTown(seed) {
    const buildings = BUILDINGS.map((b) => Object.assign({}, b));
    return {
      size: SIZE,
      buildings,
      props: PROPS.map((p) => Object.assign({}, p)),
      zones: ZONES,
      zoneList: ZONE_LIST,
      seed,
    };
  }

  root.Town = { buildTown, ZONES, ZONE_LIST, zoneAt, isBlocked, randomSpotIn, SIZE };
})(window);
