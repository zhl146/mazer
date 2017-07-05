
import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';

export default function Maze(seed) {
    var random = seedrandom(seed);
    var maze = [];
    
    var xsize = 20;
    var ysize = 20;

    for (var y = 0; y < ysize; y++) {
        var row = [];
        for (var x = 0; x < xsize; x++) {
            var tileTypeNumber = Math.floor(random() * 2.0);
            row.push(new Tile(tileTypeNumber));
        }

        maze.push(row);
    }

    this.maze = maze;
}

Maze.prototype.contains = function(point)
{
    return point.x >= 0 && point.y >= 0 &&
        point.x < xsize && point.y < ysize;
}
