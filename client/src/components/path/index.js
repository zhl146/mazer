import React, { useRef, useEffect } from "react";
import anime from "animejs";

import "./path.css";

const Color = (r, g, b, a) => ({ r, g, b, a: a || 255 });

const ColorToString = ({ r, g, b, a }) => `rgba(${r}, ${b}, ${g}, ${a})`;

// Path colors
const NormalPathColor = Color(20, 150, 150, 0.5);
const ErrorPathColor = Color(250, 0, 0, 0.5);

// Stroke widths
const NormalLineWidth = 5;
const ErrorLineWidth = 7;

export default ({ path, tileSize, boardHeight, boardWidth, pathError }) => {
  const polylineRef = useRef(null);

  useEffect(() => {
    if (pathError)
      anime({
        targets: polylineRef.current,
        easing: "linear",
        stroke: ColorToString(ErrorPathColor),
        strokeWidth: ErrorLineWidth,
        duration: 100,
        direction: "alternate",
        loop: 4,
      });

    anime({
      targets: polylineRef.current,
      easing: "linear",
      strokeDashoffset: [0, -15],
      duration: 1500,
      loop: true,
    });
  }, [pathError, path]);

  if (!path || path.length < 1) return null;

  const polylinePoints =
    path &&
    path
      .reduce((path, segment) => path.concat(segment))
      .map(
        (point) =>
          `${point.x * tileSize + tileSize / 2},${point.y * tileSize +
            tileSize / 2}`
      )
      .join(" ");

  return (
    <svg
      className="maze-path"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        height: boardHeight,
        width: boardWidth,
        zIndex: 5,
      }}
    >
      <polyline
        ref={polylineRef}
        className="maze-path"
        points={polylinePoints}
        fill="none"
        stroke="#d6851a"
        strokeWidth={NormalLineWidth}
        strokeDasharray="10 5"
      />
    </svg>
  );
};
