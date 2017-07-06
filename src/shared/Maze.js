import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';

export default function Maze(seed) {
    var random = seedrandom(seed);
    var maze = [];
    
    this.xsize = 20;
    this.ysize = 20;

    var startX = Math.floor(random() * this.xsize);
    var startY = Math.floor(random() * this.ysize);

    this.start = new Point(startX, startY);

    var endX = Math.floor(random() * this.xsize);
    var endY = Math.floor(random() * this.ysize);

    this.end = new Point(endX, endY);

    this.start.f = 0;
    this.start.g = 0;

    for (var y = 0; y < this.ysize; y++) {
        var row = [];
        for (var x = 0; x < this.xsize; x++) {
            var tileTypeNumber = Math.floor(random() * 10.0);
            row.push(new Tile(tileTypeNumber === 9 ? 1 : 0));
        }

        maze.push(row);
    }

    this.maze = maze;
}

Maze.prototype.contains = function(point)
{
    return point.x >= 0 && point.y >= 0 &&
        point.x < this.xsize && point.y < this.ysize;
};
