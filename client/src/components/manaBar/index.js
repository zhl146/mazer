import React from "react";
import useDimensions from "react-use-dimensions";

export default ({ maxActionPoints, actionPointsRemaining }) => {
  const [ref, { width }] = useDimensions();

  return (
    <div
      ref={ref}
      style={{
        height: 15,
        background: "grey",
        display: "flex",
        position: "relative",
        width: "100%",
      }}
    >
      <div
        style={{
          background: "#3146B0",
          position: "absolute",
          top: 0,
          left: 0,
          display: "flex",
          transition: " width 0.5s ease-in-out",
          height: 15,
          color: "white",
          width: (width * actionPointsRemaining) / maxActionPoints,
          justifyContent: "flex-end",
          paddingRight: 12,
        }}
      >
        {`${actionPointsRemaining} /
    ${maxActionPoints}`}
      </div>
    </div>
  );
};
