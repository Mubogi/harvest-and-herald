/* Isometric projection helpers. Tile space is (col,row); screen space is pixels. */
(function (root) {
  'use strict';

  const TILE_W = 64;
  const TILE_H = 32;

  const Iso = {
    TILE_W,
    TILE_H,

    toScreen(col, row, originX, originY) {
      return {
        x: originX + (col - row) * (TILE_W / 2),
        y: originY + (col + row) * (TILE_H / 2),
      };
    },

    toTile(screenX, screenY, originX, originY) {
      const dx = screenX - originX;
      const dy = screenY - originY;
      return {
        col: (dx / (TILE_W / 2) + dy / (TILE_H / 2)) / 2,
        row: (dy / (TILE_H / 2) - dx / (TILE_W / 2)) / 2,
      };
    },

    /* Depth key for painter's algorithm: things further "back" draw first. */
    depth(col, row) {
      return col + row;
    },
  };

  root.Iso = Iso;
})(window);
