export default function Tile(type) {
    this.type = type;
}

Tile.Type = {
    Walkable: 0,
    Unwalkable: 1,
}

Tile.prototype.isPassable = function() {
    return this.type == Tile.Type.Walkable;
}
