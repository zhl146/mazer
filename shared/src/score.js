const mapScoreMods = (tiles) => {
  const scoreMods = tiles.map((row) => row.map(({ scoreMod }) => scoreMod));
  return ({ x, y }) => scoreMods[y][x];
};

export default (path, tiles, baseScoreMod = 100) => {
  let pathLength = 0;

  const getScoreMod = mapScoreMods(tiles);

  for (let segmentIndex = 0; segmentIndex < path.length; segmentIndex++) {
    let currentPoint = path[segmentIndex][0];
    const currentSegment = path[segmentIndex];
    for (
      let pointIndex = 1;
      pointIndex < path[segmentIndex].length;
      pointIndex++
    ) {
      const nextPoint = currentSegment[pointIndex];
      const xDiff = currentPoint.x - nextPoint.x;
      const yDiff = currentPoint.y - nextPoint.y;
      const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
      const avgScoreMod =
        (getScoreMod(currentPoint) + getScoreMod(nextPoint)) / 2;
      const adjustedDistance = avgScoreMod * distance;
      pathLength = pathLength + adjustedDistance;
      currentPoint = nextPoint;
    }
  }
  return Math.round(pathLength * baseScoreMod);
};
