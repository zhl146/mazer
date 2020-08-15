import { createTile } from "./MazeTile";

export const seedRandomIntBetween = (random) => (min, max) => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
};

export const pointWithinBounds = (tiles, { x, y }) =>
  x >= 0 && y >= 0 && x < tiles[0].length && y < tiles.length;

export const seedShuffle = (random, oldArray) => {
  let array = oldArray.slice();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random() * i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
};

export const copyTiles = (maze) =>
  maze.map((rows) => rows.map((tile) => createTile(tile)));

export const forEachTile = (tiles, callback) =>
  tiles.forEach((row, y) => row.forEach((tile, x) => callback(tile, x, y)));
