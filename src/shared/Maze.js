import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';
import Pathfinder from './Pathfinder';

export default function Maze(seed) {
    var random = seedrandom(seed);

    // maze params
    this.xsize = 20;
    this.ysize = 20;

    // holds the waypoints (points between start and end) that
    // need to be traveled to in order

    var waypoints = [];
    var numWaypoints = 2;
    var numPathVertexes = numWaypoints*10;

    var maze = [];
    this.generateEmptyMaze();

    // we need to have at least one valid path through the maze
    var protectedPath = [];

    // holds genereated set of points that will create the protected path
    var pathVertices = [];

    // reusable point
    var newPoint;

    // generate start/end/waypoints
    while ( pathVertices.length < numPathVertexes ) {
        newPoint = this.generateNewPoint(random);
        if (!pathVertices.contains(newPoint)) {
            pathVertices.push(newPoint);
        }
    }

    for (var i = 0; i < numPathVertexes - 1; i++) {
        var pathfinder = new Pathfinder(this);
        var pathSegment = pathfinder.findPath(pathVertices[i], pathVertices[i+1]);
        if (i !== 0) {
            pathSegment.shift();
        }
        protectedPath.push(...pathSegment);
    }

    this.start = pathVertices.shift().copy();
    console.log(this.start)
    this.start.f = 0;
    this.start.g = 0;

    this.end = pathVertices.pop().copy();

    while (pathVertices.length > numWaypoints) {
        var index = Math.floor(Math.random() * pathVertices.length);
        pathVertices.splice(index, 1);
    }

    this.wayPoints = pathVertices;

    console.log('adfsdfgergegh')
    console.log(this.start)
    console.log(this.end)
    console.log(protectedPath);

    for (var y = 0; y < this.ysize; y++) {
        var row = [];
        for (var x = 0; x < this.xsize; x++) {
            newPoint = new Point(x, y);
            var tileTypeNumber;
            if (!protectedPath.contains(newPoint)) {
                var propensity = Math.floor(random() * 10.0);
                tileTypeNumber =  propensity < 6 ? 1 : 0
            } else {
                tileTypeNumber = 0;
            }
            row.push(new Tile(tileTypeNumber));
        }
        maze.push(row);
    }

    this.maze = maze;
};

Maze.prototype.isPassable = function(point)
{
    return point.x >= 0 && point.y >= 0 &&
        point.x < this.xsize && point.y < this.ysize &&
        this.maze[point.y][point.x].isPassable();
};

Maze.prototype.generateNewPoint = function(random) {
    var pointX = Math.floor(random() * this.xsize);
    var pointY = Math.floor(random() * this.ysize);
    return new Point(pointX, pointY);
};

Maze.prototype.generateEmptyMaze = function() {
    var maze =[];
    for (var y = 0; y < this.ysize; y++) {
        var row = [];
        for (var x = 0; x < this.xsize; x++) {
            row.push(new Tile(Tile.Type.Walkable));
        }
        maze.push(row);
    }
    this.maze = maze
};

// extend Array base type
Array.prototype.contains = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i].x === obj.x && this[i].y === obj.y) {
            return true;
        }
    }
    return false;
};