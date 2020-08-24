import React, { useEffect, useState, useRef } from "react";

import "./App.css";

import Path from "./components/path";
import Tile from "./components/tile";
import ManaBar from "./components/manaBar";
import ScoreBar from "./components/topBar";

import { usePathError } from "./hooks";
import {
  createGame,
  verifyOperations,
  findMazePath,
  surroundingBlockers,
  getUpdatedBlocker,
  copyTiles,
} from "@mazer/shared";

// const GameContext = React.createContext({});

const useCanvas = () => {
  const [canvasRef, setCanvasRef] = useState(null);

  const canvasRefCallback = (ref) => ref && setCanvasRef(ref.getContext("2d"));

  return [canvasRef, canvasRefCallback];
};

const App = () => {
  const tileSize = 32;
  const [generatedGame, setGeneratedGame] = useState();
  const [tiles, setTiles] = useState([]);
  const [path, setPath] = useState();
  const [counters, setCounters] = useState({
    score: 0,
    actionPointsRemaining: 0,
  });
  const [pathError, startPathError] = usePathError(400);
  const [boardDimensions, setBoardDimensions] = useState({
    boardHeight: 0,
    boardWidth: 0,
  });

  const [touched, setTouched] = useState();

  const [layer1Canvas, setLayer1Canvas] = useCanvas();
  const [layer2Canvas, setLayer2Canvas] = useCanvas();
  const [layer3Canvas, setLayer3Canvas] = useCanvas();

  const initGameState = (newGame) => {
    setGeneratedGame(newGame);
    const tiles = copyTiles(newGame.tiles);
    setTiles(tiles);
    setTouched(tiles.map((row) => row.map(() => false)));
    setCounters({
      score: 0,
      actionPointsRemaining: newGame.maxActionPoints,
    });
    setPath(findMazePath(newGame.wayPoints, newGame.tiles));
    setBoardDimensions({
      boardHeight: tileSize * newGame.numRows,
      boardWidth: tileSize * newGame.numColumns,
    });
  };

  const resetGame = () => {
    initGameState(generatedGame);
  };

  const toggleTile = (tile) => () => {
    const { x, y } = tile;

    console.log("clicked", x, y);

    const [error, actionPointsRemaining, newScore, newPath] = verifyOperations(
      tiles,
      [tile],
      counters.actionPointsRemaining,
      generatedGame.naturalBlockerRemovalCost,
      generatedGame.wayPoints
    );

    if (error) {
      startPathError();
      return;
    }

    const newTile = getUpdatedBlocker(tile);

    const newTiles = [...tiles];

    newTiles[y][x] = newTile;

    const newTouched = [...touched];

    newTouched[y][x] = !touched[y][x];

    setTouched(newTouched);

    setTiles(newTiles);
    setCounters({
      score: newScore,
      actionPointsRemaining,
    });
    setPath(newPath);
  };

  useEffect(() => {
    const startGame = (seed) => {
      const newGame = createGame(seed);
      initGameState(newGame);
    };

    startGame("derp");
  }, []);

  if (!generatedGame) return null;

  const { boardHeight, boardWidth } = boardDimensions;

  return (
    <div
      style={{
        display: "flex",
        width: "100vw",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          border: "1px solid grey",
        }}
      >
        {/* <div
          style={{
            display: "flex",
            justifyContent: "center",
            background: "linear-gradient(to right, #eacda3, #d6ae7b)",
            padding: 8,
          }}
        >
          <div>{`score: ${counters.score}`}</div>
        </div> */}
        <ScoreBar score={counters.score}></ScoreBar>
        <div
          style={{
            position: "relative",
            display: "flex",
          }}
        >
          <div>
            <Path
              path={path}
              tileSize={tileSize}
              pathError={pathError}
              boardHeight={boardHeight}
              boardWidth={boardWidth}
            ></Path>
            <div style={{ zIndex: 10 }}>
              {tiles
                ? tiles.map((row, y) => (
                    <div style={{ display: "flex", height: tileSize }} key={y}>
                      {row.map((tile, x) => (
                        <div onClick={toggleTile(tile)} key={`${x},${y}`}>
                          <Tile
                            tileSize={tileSize}
                            touched={touched[y][x]}
                            {...surroundingBlockers(tiles, tile)}
                            {...tile}
                            layer1Canvas={layer1Canvas}
                            layer2Canvas={layer2Canvas}
                            layer3Canvas={layer3Canvas}
                          ></Tile>
                        </div>
                      ))}
                    </div>
                  ))
                : null}
            </div>
            <canvas
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 1,
                pointerEvents: "none",
              }}
              ref={setLayer1Canvas}
              height={boardHeight}
              width={boardWidth}
            ></canvas>
            <canvas
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2,
                pointerEvents: "none",
              }}
              ref={setLayer2Canvas}
              height={boardHeight}
              width={boardWidth}
            ></canvas>
            <canvas
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                zIndex: 2,
                pointerEvents: "none",
              }}
              ref={setLayer3Canvas}
              height={boardHeight}
              width={boardWidth}
            ></canvas>
          </div>
        </div>
        <ManaBar
          maxActionPoints={generatedGame.maxActionPoints}
          actionPointsRemaining={counters.actionPointsRemaining}
        ></ManaBar>
      </div>
    </div>
  );
};

export default App;
