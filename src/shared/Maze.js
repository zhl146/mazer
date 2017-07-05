
import seedrandom from 'seedrandom';
import Tile from './Tile';

export default function Maze() {
    this.maze = null;
}

Maze.prototype.generate = function(seed) {
    var random = seedrandom(seed);
    var maze = [];

    for (var y = 0; y < 20; y++) {
        var row = [];
        for (var x = 0; x < 20; x++) {
            var tileTypeNumber = Math.floor(random() * 2.0);
            row.push(new Tile(tileTypeNumber));
        }

        maze.push(row);
    }

    this.maze = maze;
}
