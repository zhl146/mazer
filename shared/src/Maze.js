import { sum } from "lodash";

import { findMazePath } from "./Pathfinder";
import calculateScore from "./score";
import { copyTiles, pointWithinBounds } from "./Utils";

const getActionCost = ({ x, y }, tiles, naturalBlockerRemovalCost) => {
  const { isNaturalBlocker, isBlocker } = tiles[y][x];

  if (isNaturalBlocker && isBlocker) return naturalBlockerRemovalCost;
  else if (isNaturalBlocker && !isBlocker) return -naturalBlockerRemovalCost;
  else if (isBlocker) return -1;
  else return 1;
};

export const getDifference = (baseTiles, changedTiles) => {
  const diffPoints = [];

  baseTiles.forEach((row, y) => {
    row.forEach(({ type }, x) => {
      if (type === changedTiles[(y, x)]) diffPoints.push({ x, y });
    });
  });

  return diffPoints;
};

const getTile = (tiles, { y, x }) => tiles[y][x];

const isImmutable = (tiles, coords) => {
  const tile = getTile(tiles, coords);

  return tile.wayPointIndex !== null;
};

const reportAsBlocker = (tiles, coords) => {
  const inBounds = pointWithinBounds(tiles, coords);
  if (!inBounds) return true;
  else return getTile(tiles, coords).isBlocker;
};

const toggleTile = (maze, { x, y }) =>
  (maze[y][x].isBlocker = !maze[y][x].isBlocker);

export const surroundingBlockers = (tiles, { x, y }) => {
  const northCoords = { x, y: y - 1 };
  const northEastCoords = { x: x + 1, y: y - 1 };
  const northWestCoords = { x: x - 1, y: y - 1 };
  const southCoords = { x, y: y + 1 };
  const southEastCoords = { x: x + 1, y: y + 1 };
  const southWestCoords = { x: x - 1, y: y + 1 };
  const eastCoords = { x: x + 1, y };
  const westCoords = { x: x - 1, y };

  return {
    n: reportAsBlocker(tiles, northCoords),
    ne: reportAsBlocker(tiles, northEastCoords),
    nw: reportAsBlocker(tiles, northWestCoords),
    s: reportAsBlocker(tiles, southCoords),
    se: reportAsBlocker(tiles, southEastCoords),
    sw: reportAsBlocker(tiles, southWestCoords),
    e: reportAsBlocker(tiles, eastCoords),
    w: reportAsBlocker(tiles, westCoords),
  };
};

export const verifyOperations = (
  tiles,
  diffPoints,
  actionPointsRemaining,
  naturalBlockerRemovalCost,
  wayPoints
) => {
  const actionCosts = diffPoints.map((coords) =>
    getActionCost(coords, tiles, naturalBlockerRemovalCost)
  );
  const totalCost = sum(actionCosts);
  const newActionPoints = actionPointsRemaining - actionCosts;

  if (newActionPoints < 0) return ["not enough action points"];

  const allTilesMutable = diffPoints.every(
    (point) => !isImmutable(tiles, point)
  );

  if (!allTilesMutable) return ["at least one tile is unmodifiable"];

  const clonedMaze = copyTiles(tiles);

  diffPoints.forEach((point) => toggleTile(clonedMaze, point));

  const newPath = findMazePath(wayPoints, clonedMaze);

  if (newPath.some((segment) => segment.length === 0))
    return ["actions result in blocked path"];

  const newScore = calculateScore(newPath, tiles);

  return [null, newActionPoints, newScore, newPath];
};
