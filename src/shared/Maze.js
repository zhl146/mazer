import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';
import Pathfinder from './Pathfinder';

export default function Maze(seed) {
    var random = seedrandom(seed);

    // maze params
    this.xsize = 20;
    this.ysize = 20;

    // Used to find paths through this maze
    this.pathfinder = new Pathfinder(this);

    // holds the waypoints (points between start and end) that
    // need to be traveled to in order
    const numWaypoints = 2;
    const numPathVertexes = 20;

    var generatedMaze = [];
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
        if (pathVertices.indexOfPoint(newPoint) < 0) {
            pathVertices.push(newPoint);
        }
    }

    for (var i = 0; i < numPathVertexes - 1; i++) {
        var pathSegment = this.pathfinder.findPath(pathVertices[i], pathVertices[i+1]);
        if (i !== 0) {
            // Shift so that the path so that it's continuous (end of previous equals
            // start of next)
            pathSegment.shift();
        }
        protectedPath.push(...pathSegment);
    }

    this.start = pathVertices[0].copy();
    this.start.f = 0;
    this.start.g = 0;

    this.end = pathVertices[pathVertices.length-1].copy();

    // Select random vertices to delete, excluding start and end
    while (pathVertices.length > numWaypoints + 2) {
        var index = Math.floor(1.0 + random() * (pathVertices.length - 2.0));
        pathVertices.splice(index, 1);
    }

    this.waypoints = pathVertices;

    for (var y = 0; y < this.ysize; y++) {
        var row = [];
        for (var x = 0; x < this.xsize; x++) {
            newPoint = new Point(x, y);
            var tileType;
            if (protectedPath.indexOfPoint(newPoint) < 0) {
                var propensity = Math.floor(random() * 10.0);
                tileType =  propensity < 6 ? 'Blocker' : 'Empty'
            } else {
                tileType = 'Empty';
            }
            row.push(new Tile(Tile.Type[tileType]));
        }
        generatedMaze.push(row);
    }

    this.maze = generatedMaze;
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
            row.push(new Tile(Tile.Type.Empty));
        }
        maze.push(row);
    }
    this.maze = maze
};

Maze.prototype.findPath = function() {
    var path = [];

    for (var i = 0; i < this.waypoints.length - 1; i++) {
        var segment = this.pathfinder.findPath(this.waypoints[i], this.waypoints[i+1]);
        path.push(segment);
    }
    return path;
};

Maze.prototype.addBlocker = function(row, column) {
    this.maze[row][column].type = Tile.Type.Blocker;
    this.maze[row][column].userPlaced = true;
};

Maze.prototype.removeBlocker = function(row, column) {
    this.maze[row][column].type = Tile.Type.Empty;
};

Maze.prototype.applyChanges = function(diffPoints) {
    for (var i = 0; i < diffPoints.length; i++ ) {
        var point = diffPoints[i];
        this.maze[point.y][point.x].type = this.maze[point.y][point.x].type + point.operationType;
    }
};

Maze.prototype.getUserChanges = function(changedMaze) {
    var diffPoints = [];

    for ( var row = 0; row < this.xsize; row++) {
        for ( var column = 0; column < this.ysize; column++ ){
            var operationType = changedMaze.maze[row][column].type - this.maze[row][column].type;
            if ( operationType !== 0 ) {
                var newPoint = new Point(column, row);
                newPoint.operationType = operationType;
                diffPoints.push(newPoint);
            }
        }
    }
    return diffPoints;
};

// extend Array base type
Array.prototype.indexOfPoint = function(obj) {
    var i = this.length;
    while (i--) {
        if (this[i].x === obj.x && this[i].y === obj.y) {
            return i;
        }
    }
    return -1;
};
