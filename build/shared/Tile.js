"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Tile;
function Tile(type) {
    this.type = type;
    this.userPlaced = false;
}

Tile.Type = {
    Empty: 0,
    Blocker: 1
};

Tile.prototype.isPassable = function () {
    return this.type === Tile.Type.Empty;
};