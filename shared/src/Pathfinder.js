import PF from "pathfinding";

const pathfinder = new PF.AStarFinder({
  diagonalMovement: 1,
  heuristic: PF.Heuristic.octile,
});

const tuplesToCoords = ([x, y]) => ({ x, y });

export const joinPath = (path) =>
  path.reduce((acc, curr, index) => {
    const isFirstSegment = index === 0;

    if (isFirstSegment) return curr;
    else {
      const [duplicateElement, ...restPath] = curr;
      return acc.concat(restPath);
    }
  }, []);

// this is just a wrapper around the pathfinder.js library
// we use this because pathfinder.js was used as a drop-in replacement for our own pathfinding code
// we decided it was a pain to maintain our own code, so we outsourced the pathfinding to an external lib
export const findPath = (startPoint, endPoint, mazeTiles, compress = false) => {
  // turn mazetiles into an appropriate pathing grid for the pathfinder library
  let pathingGrid = new PF.Grid(
    mazeTiles.map((row) => row.map(({ isBlocker }) => (isBlocker ? 1 : 0)))
  );

  // calculate path using pathfinder API
  let calculatedPath = pathfinder.findPath(
    startPoint.x,
    startPoint.y,
    endPoint.x,
    endPoint.y,
    pathingGrid
  );

  return compress
    ? PF.Util.compressPath(calculatedPath).map(tuplesToCoords)
    : calculatedPath.map(tuplesToCoords);
};

export const findMazePath = (wayPoints, mazeTiles) => {
  const path = [];

  for (let i = 0; i < wayPoints.length - 1; i++) {
    const segment = findPath(wayPoints[i], wayPoints[i + 1], mazeTiles);

    path.push(segment);
  }
  return path;
};
