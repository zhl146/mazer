const u = 16;

const tileMap = {
  grass: [
    {
      description: "empty grass",
      coords: [0, 0],
      weight: 1,
    },
    {
      description: "foliage 1",
      coords: [u, 0],
      weight: 0.5,
    },
    {
      description: "foliage 2",
      coords: [2 * u, 0],
      weight: 0.5,
    },
    {
      description: "foliage 3",
      coords: [0, 1 * u],
      weight: 0.5,
    },
    {
      description: "foliage 4",
      coords: [u, 2 * u],
      weight: 0.5,
    },
    {
      description: "foliage 5",
      coords: [u, 3 * u],
      weight: 0.5,
    },
    {
      description: "grass with flowers 1",
      coords: [u, u],
      weight: 0.01,
    },
    {
      description: "grass with flowers 2",
      coords: [u, 2 * u],
      weight: 0.01,
    },
    {
      description: "grass with flowers 3",
      coords: [u, 3 * u],
      weight: 0.01,
    },
    {
      description: "grass with flowers 4",
      coords: [2 * u, u],
      weight: 0.01,
    },
    {
      description: "grass with flowers 5",
      coords: [2 * u, 2 * u],
      weight: 0.01,
    },
    {
      description: "grass with flowers 6",
      coords: [2 * u, 3 * u],
      weight: 0.01,
    },
  ],
};

const pickWeightedRandom = (array) => {
  const totalWeight = array.reduce((sum, { weight }) => sum + weight, 0);
  const threshold = Math.floor(Math.random() * totalWeight);

  console.log(totalWeight, threshold);

  let total = 0;
  for (let i = 0; i < array.length; ++i) {
    // Add the weight to our running total.
    const element = array[i];
    total += element.weight;

    // If this value falls within the threshold, we're done!
    if (total >= threshold) {
      return element;
    }
    console.log(total, threshold, element);
  }
  return {};
};

export const getRandomGrassTile = () => {
  const grassTile = pickWeightedRandom(tileMap.grass);

  return grassTile.coords;
};
