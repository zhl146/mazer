export { default as createGame } from "./createGame";

import { getUpdatedBlocker as _getUpdatedBlocker } from "./MazeTile";

import { findPath as _findPath, joinPath as _joinPath } from "./Pathfinder";

import {
  getDifference as _getDifference,
  verifyOperations as _verifyOperations,
  surroundingBlockers as _surroundingBlockers,
} from "./Maze";

import { findMazePath as _findMazePath } from "./Pathfinder";

import { forEachTile as _forEachTile, copyTiles as _copyTiles } from "./Utils";

export const getUpdatedBlocker = _getUpdatedBlocker;

export const findPath = _findPath;
export const joinPath = _joinPath;

export const getDifference = _getDifference;
export const verifyOperations = _verifyOperations;
export const surroundingBlockers = _surroundingBlockers;

export const findMazePath = _findMazePath;

export const forEachTile = _forEachTile;
export const copyTiles = _copyTiles;
