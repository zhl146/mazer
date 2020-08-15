import React, { useEffect, useRef, useState } from "react";

import { getTileSetCoords } from "../../tileset";

import tileSetPath from "./celianna_TileA1.png";
import tileSetPath2 from "./celianna_TileA2.png";
import pickAxePath from "./pickAxe.png";

const useImage = (tileSetPath) => {
  const [img, setImg] = useState();

  useEffect(() => {
    const tileSet = new Image();
    tileSet.src = tileSetPath;
    tileSet.onload = () => setImg(tileSet);
  }, [tileSetPath]);

  return img;
};

export default React.memo((props) => {
  const {
    x,
    y,
    wayPointIndex,
    scoreMod,
    isScoreZoneCenter,
    isNaturalBlocker,
    touched,
    isBlocker,
    n,
    e,
    s,
    w,
    ne,
    se,
    sw,
    nw,
    layer1Canvas,
    layer2Canvas,
    layer3Canvas,
    tileSize,
  } = props;

  if (!layer1Canvas || !layer2Canvas) return null;

  const [hover, setHover] = useState(false);

  const tileSet2 = useImage(tileSetPath2);
  const pickAxe = useImage(pickAxePath);

  useEffect(() => {
    const ctx = layer3Canvas;
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#90ee90";

    if (hover) {
      ctx.fillRect(
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize, // target width
        tileSize // target height
      );
    } else {
      ctx.clearRect(
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize, // target width
        tileSize // target height
      );
    }
  }, [layer3Canvas, x, y, tileSize, hover]);

  useEffect(() => {
    const ctx = layer1Canvas;

    if (!pickAxe || !tileSet2) return;

    console.log(touched);

    if (touched) {
      ctx.clearRect(
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize, // target width
        tileSize // target height
      );
      ctx.drawImage(
        tileSet2, // image
        0,
        0,
        32, // source width
        32, // source height
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize, // target width
        tileSize // target height
      );
      ctx.drawImage(
        pickAxe, // image
        0,
        0,
        32, // source width
        32, // source height
        x * tileSize + tileSize / 4, // target x
        y * tileSize + tileSize / 6, // target y
        tileSize / 2.1, // target width
        tileSize / 2.1 // target height
      );
    } else {
      ctx.clearRect(
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize, // target width
        tileSize // target height
      );

      ctx.drawImage(
        tileSet2, // image
        0,
        0,
        32, // source width
        32, // source height
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize, // target width
        tileSize // target height
      );
    }
  }, [layer1Canvas, x, y, tileSize, tileSet2, touched, pickAxe]);

  useEffect(() => {
    const ctx = layer2Canvas;

    if (!tileSet2) return;

    ctx.clearRect(
      x * tileSize, // target x
      y * tileSize, // target y
      tileSize, // target width
      tileSize // target height
    );

    if (isBlocker) {
      const [q1, q2, q3, q4] = getTileSetCoords(
        { n, e, s, w, ne, se, sw, nw },
        { xOffset: 5 * 4, yOffset: 2 * 6 }
      );

      ctx.drawImage(
        tileSet2, // image
        q1[0],
        q1[1],
        16, // source width
        16, // source height
        x * tileSize, // target x
        y * tileSize, // target y
        tileSize / 2, // target width
        tileSize / 2 // target height
      );
      ctx.drawImage(
        tileSet2, // image
        q2[0],
        q2[1],
        16, // source width
        16, // source height
        x * tileSize + tileSize / 2, // target x
        y * tileSize, // target y
        tileSize / 2, // target width
        tileSize / 2 // target height
      );
      ctx.drawImage(
        tileSet2, // image
        q3[0],
        q3[1],
        16, // source width
        16, // source height
        x * tileSize, // target x
        y * tileSize + tileSize / 2, // target y
        tileSize / 2, // target width
        tileSize / 2 // target height
      );
      ctx.drawImage(
        tileSet2, // image
        q4[0],
        q4[1],
        16, // source width
        16, // source height
        x * tileSize + tileSize / 2, // target x
        y * tileSize + tileSize / 2, // target y
        tileSize / 2, // target width
        tileSize / 2 // target height
      );
    }
  }, [
    n,
    e,
    s,
    w,
    ne,
    se,
    sw,
    nw,
    layer2Canvas,
    tileSize,
    x,
    y,
    isBlocker,
    tileSet2,
  ]);

  return (
    <div
      className="tile-hover"
      style={{
        display: "flex",
        padding: 0,
        margin: 0,
        fontSize: 12,
        height: tileSize,
        width: tileSize,
        justifyContent: "center",
        alignItems: "center",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    ></div>
  );
});
