//const dirs = { N: 1, E: 2, S: 4, W:8, NE: 16, SE: 32, SW: 64, NW: 128 };
const edges = { A: 1 + 8 + 128, B: 1 + 2 + 16, C: 4 + 8 + 64, D: 4 + 2 + 32 };
const mapA = { 0: 8, 128: 8, 1: 16, 8: 10, 9: 2, 137: 18, 136: 10, 129: 16 };
const mapB = { 0: 11, 16: 11, 1: 19, 2: 9, 3: 3, 19: 17, 18: 9, 17: 19 };
const mapC = { 0: 20, 64: 20, 4: 12, 8: 22, 12: 6, 76: 14, 72: 22, 68: 12 };
const mapD = { 0: 23, 32: 23, 4: 15, 2: 21, 6: 7, 38: 13, 34: 21, 36: 15 };

export const getTileSetCoords = ({ n, e, s, w, ne, se, sw, nw }, offsets) => {
  // Check nearby tile materials.
  const neighbors =
    (n ? 1 : 0) +
    (e ? 2 : 0) +
    (s ? 4 : 0) +
    (w ? 8 : 0) +
    (ne ? 16 : 0) +
    (se ? 32 : 0) +
    (sw ? 64 : 0) +
    (nw ? 128 : 0);
  // Isolated tile
  if (neighbors === 0) {
    return [0, 1, 4, 5].map(getCoords(offsets));
  } else {
    // Find half-tiles.

    return [
      mapA[neighbors & edges.A],
      mapB[neighbors & edges.B],
      mapC[neighbors & edges.C],
      mapD[neighbors & edges.D],
    ].map(getCoords(offsets));
  }
};

const getCoords = ({ xOffset, yOffset } = { xOffset: 0, yOffset: 0 }) => (
  index
) => {
  const width = 4;
  const tileSetSize = 16;
  const y = Math.floor(index / width);
  const x = index % width;

  return [(x + xOffset) * tileSetSize, (y + yOffset) * tileSetSize];
};

// A is the top left part of the tile, B is the top right, C is the bottom left, D is the bottom right.
// edges holds bitmasks for each of these, so we can grab only the relevant neighbor info.
// map* are dictionaries mapping neighbor states to graphic indices in the tileset image (0..24).
// since each half-tile checks 3 neighbors, each one has 2^3=8 states.
// _tile is the tile targeted for autotiling.
// Since our logical tiles are twice as large as our rendering tiles, all the autotile coords (x,y) have to be doubled in the rendering map.
