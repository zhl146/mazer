import React from "react";

export default ({ zoomIn, zoomOut, center }) => (
  <div style={{}}>
    <button
      onClick={center}
      style={{
        zIndex: 999,
      }}
    >
      <i className="material-icons">O</i>
    </button>
    <button
      onClick={zoomIn}
      style={{
        zIndex: 999,
      }}
    >
      <i className="material-icons">+</i>
    </button>
    <button
      onClick={zoomOut}
      style={{
        zIndex: 999,
      }}
    >
      <i className="material-icons">-</i>
    </button>
  </div>
);
