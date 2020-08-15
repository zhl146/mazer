import ColorScheme from "color-scheme";

const shadeColor2 = (color, percent) => {
  const f = parseInt(color.slice(1), 16),
    t = percent < 0 ? 0 : 255,
    p = percent < 0 ? percent * -1 : percent,
    R = f >> 16,
    G = (f >> 8) & 0x00ff,
    B = f & 0x0000ff;
  return (
    "#" +
    (
      0x1000000 +
      (Math.round((t - R) * p) + R) * 0x10000 +
      (Math.round((t - G) * p) + G) * 0x100 +
      (Math.round((t - B) * p) + B)
    )
      .toString(16)
      .slice(1)
  );
};

export default (randomIntBetween) => {
  const colorScheme = new ColorScheme();
  const hue = randomIntBetween(0, 359000) / 1000;

  const mazeColors = colorScheme
    .from_hue(hue)
    .scheme("contrast")
    .variation("pale")
    .colors()
    .map((color) => "#" + color);

  const generatedPathColors = colorScheme
    .from_hue(hue)
    .scheme("contrast")
    .variation("hard")
    .colors()
    .splice(4)
    .map((color) => "#" + color);

  const basePathColor = generatedPathColors[0];

  const pathColors = [];

  for (let i = -0.4; i <= 0.8; i += 0.2) {
    pathColors.push(shadeColor2(basePathColor, i));
  }

  return {
    name: "randomlyGeneratedTileset",
    colors: {
      groundNatural: mazeColors[2],
      groundUser: mazeColors[0],
      blockerNatural: mazeColors[3],
      blockerUser: mazeColors[1],
    },
    pathColors: pathColors,
  };
};
