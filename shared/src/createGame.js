import seedrandom from "seedrandom";
import { range, first } from "lodash";

import generateColorPalette from "./colorPalette";
import { findMazePath, joinPath } from "./Pathfinder";
import { createTile, calculateDistance } from "./MazeTile";
import { seedRandomIntBetween, pointWithinBounds, copyTiles } from "./Utils";
import { generationKnobs } from "./constants";
import calculateScore from "./score";

const createEmptyMaze = (numColumns, numRows) =>
  range(numRows).map((element, rowIndex) =>
    range(numColumns).map((element, colIndex) =>
      createTile({ x: colIndex, y: rowIndex })
    )
  );

const tileUnused = ({ isBlocker, isImmutable }) => !isBlocker && !isImmutable;

const getAllUnusedTiles = (maze) => maze.flat().filter(tileUnused);

const getRandomUnusedTiles = (randomFn, maze) => {
  const randomIntBetween = seedRandomIntBetween(randomFn);
  const numColumns = first(maze).length;
  const numRows = maze.length;
  let randomCoords;

  while (!randomCoords) {
    const xCoord = randomIntBetween(0, numColumns - 1);
    const yCoord = randomIntBetween(0, numRows - 1);

    const tile = maze[yCoord][xCoord];
    if (tileUnused(tile))
      randomCoords = {
        x: xCoord,
        y: yCoord,
      };
  }

  return randomCoords;
};

export default (seed, knobOverrides = {}) => {
  const {
    maxColumns,
    minColumns,
    maxRows,
    minRows,
    blockerSeedKnob,
    scoringZoneKnob,
    pathVerticesKnob,
    vertexToWayPointChance,
    minActionPoints,
    maxBlockerRemovalCost,
    minBlockerRemovalCost,
  } = { ...generationKnobs, ...knobOverrides };

  const randomFn = seedrandom(seed);
  const randomIntBetween = seedRandomIntBetween(randomFn);

  const colorPalette = generateColorPalette(randomIntBetween);

  const dimensionOne = randomIntBetween(minColumns, maxColumns);
  const dimensionTwo = randomIntBetween(minRows, maxRows);

  const [numRows, numColumns] = [dimensionOne, dimensionTwo].sort(
    (a, b) => a - b
  );

  const size = numColumns * numRows;
  const maxActionPoints =
    minActionPoints +
    Math.round((randomIntBetween(5, 15) / 10) * Math.sqrt(size));

  const naturalBlockerRemovalCost = randomIntBetween(
    minBlockerRemovalCost,
    maxBlockerRemovalCost
  );

  let maze = createEmptyMaze(numColumns, numRows);

  const setTileImmutable = ({ x, y }) => (maze[y][x].isImmutable = true);
  const setTileNaturalBlocker = ({ x, y }) => {
    maze[y][x].isNaturalBlocker = true;
    maze[y][x].isBlocker = true;
  };
  const setTileWayPoint = ({ x, y }, index) => {
    maze[y][x].wayPointIndex = index;
  };
  const setScoreZoneCenter = ({ x, y }) =>
    (maze[y][x].isScoreZoneCenter = true);
  const incrementScoreZone = ({ x, y }, value) =>
    (maze[y][x].scoreMod += value);
  const expandScoreZone = (zoneSize, zoneModifier, seedPoint) => {
    for (let rowOffset = -zoneSize; rowOffset <= zoneSize; rowOffset++) {
      let absoluteColumn = zoneSize - Math.abs(rowOffset);
      for (
        let columnOffset = -absoluteColumn;
        columnOffset <= absoluteColumn;
        columnOffset++
      ) {
        const coords = {
          x: seedPoint.x + rowOffset,
          y: seedPoint.y + columnOffset,
        };
        if (pointWithinBounds(maze, coords)) {
          incrementScoreZone(coords, zoneModifier);
        }
      }
    }
  };

  let numWayPoints = 1;

  const numPathVertexes = Math.floor(
    (randomIntBetween(pathVerticesKnob[0], pathVerticesKnob[1]) / 10) *
      Math.sqrt(size)
  );

  for (let i = 0; i < numPathVertexes / 5; i++) {
    if (randomFn() > vertexToWayPointChance) {
      numWayPoints++;
    }
  }

  // holds generated set of points that will create the protected path

  const pathVertices = range(numPathVertexes).map(() =>
    getRandomUnusedTiles(randomFn, maze)
  );

  const protectedPath = joinPath(findMazePath(pathVertices, maze));

  protectedPath.forEach(setTileImmutable);

  // Select random vertices to delete, excluding start and end
  while (pathVertices.length > numWayPoints + 2) {
    const index = Math.floor(1.0 + randomFn() * (pathVertices.length - 2.0));
    pathVertices.splice(index, 1);
  }

  pathVertices.forEach(setTileWayPoint);

  // GENERATE BLOCKERS
  // the closer a tile is to a seed, the higher the probability of placing a blocker on it

  const numBlockerSeeds = randomIntBetween(
    15,
    Math.floor(size / blockerSeedKnob)
  );

  const blockerSeedPoints = range(numBlockerSeeds).map(() =>
    getRandomUnusedTiles(randomFn, maze)
  );

  blockerSeedPoints.forEach((seedPoint) => {
    const seedDecayFactor = randomIntBetween(2, 10) / 10;
    getAllUnusedTiles(maze).forEach((unusedPoint) => {
      const distance = calculateDistance(seedPoint, unusedPoint);
      const threshold = Math.exp(-seedDecayFactor * distance);
      if (randomFn() < threshold) setTileNaturalBlocker(unusedPoint);
    });
  });

  // GENERATE SCORE ZONES

  const numScoringZones = randomIntBetween(
    1,
    Math.floor(size / scoringZoneKnob)
  );

  const seedPoints = range(numScoringZones).map(() =>
    getRandomUnusedTiles(randomFn, maze)
  );

  seedPoints.forEach((seedPoint) => {
    let scoreSize = randomIntBetween(2, 6);
    setScoreZoneCenter(seedPoint);
    expandScoreZone(scoreSize, 7 - scoreSize, seedPoint);
  });

  const tiles = copyTiles(maze);
  const basePath = findMazePath(pathVertices, tiles);
  const baseScore = calculateScore(basePath, tiles);

  return {
    colorPalette,
    maxActionPoints,
    naturalBlockerRemovalCost,
    baseScore,
    wayPoints: pathVertices,
    numColumns,
    numRows,
    tiles: maze,
  };
};
