export default function Tile(type) {
    this.type = type;
    this.userPlaced = false;
    this.scoreMod = 1;
    this.scoreZoneCenter = false;
}

Tile.Type = {
    Empty: 0,
    Blocker: 1,
};

Tile.prototype.isPassable = function() {
    return this.type === Tile.Type.Empty;
};
