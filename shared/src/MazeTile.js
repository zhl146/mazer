export const createTile = ({
  x,
  y,
  wayPointIndex = null,
  scoreMod = 1,
  isScoreZoneCenter = false,
  isNaturalBlocker = false,
  isBlocker = false,
}) => ({
  x,
  y,
  wayPointIndex,
  scoreMod,
  isScoreZoneCenter,
  isNaturalBlocker,
  isBlocker,
});

export const getUpdatedTile = (tile, props) =>
  createTile({ ...tile, ...props });

export const calculateDistance = (tile1, tile2) => {
  const xDiff = tile1.x - tile2.x;
  const yDiff = tile1.y - tile2.y;
  return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
};

export const mazeTileMatches = (tile1, tile2) =>
  tile1.x === tile2.x && tile1.y === tile2.y;

export const getUpdatedBlocker = ({ isBlocker, ...otherFields }) => ({
  isBlocker: !isBlocker,
  ...otherFields,
});
