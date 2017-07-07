import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';
import Pathfinder from './Pathfinder';

export default function Maze(seed) {
    var random = seedrandom(seed);

    // maze params
    this.xsize = 20;
    this.ysize = 20;
    this.blockerProbability = 0.2;

    // how many action points the user gets to spend
    // adding a blocker always costs 1
    this.actionPoints = 10;
    // holds the waypoints (points between start and end) that
    // need to be traveled to in order
    this.numWaypoints = 2;

    // how many points are used to generate the protected path
    this.numPathVertexes = 20;

    // action point cost to remove a natural blocker
    this.removalCost = 5;

    this.pathLength = 0;

    this.generateMazeParams(random);

    // Used to find paths through this maze
    this.pathfinder = new Pathfinder(this);

    var generatedMaze = [];
    this.generateEmptyMaze();

    // we need to have at least one valid path through the maze
    var protectedPath = [];

    // holds generated set of points that will create the protected path
    var pathVertices = [];

    // reusable point
    var newPoint;

    // generate start/end/waypoints
    while ( pathVertices.length < this.numPathVertexes ) {
        newPoint = this.generateNewPoint(random);
        if (pathVertices.indexOfPoint(newPoint) < 0) {
            pathVertices.push(newPoint);
        }
    }

    for (var i = 0; i < this.numPathVertexes - 1; i++) {
        var pathSegment = this.pathfinder.findPath(pathVertices[i], pathVertices[i+1]);
        if (i !== 0) {
            // Shift so that the path so that it's continuous (end of previous equals
            // start of next)
            pathSegment.shift();
        }
        protectedPath.push(...pathSegment);
    }

    // Select random vertices to delete, excluding start and end
    while (pathVertices.length > this.numWaypoints + 2) {
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
                var propensity = random();
                tileType =  propensity <= this.blockerProbability ? 'Blocker' : 'Empty'
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
    return this.contains(point) &&
        this.maze[point.y][point.x].isPassable();
};

Maze.prototype.isModifiable = function(point) {
    return this.contains(point) &&
        this.waypoints.indexOfPoint(point) < 0;
}

Maze.prototype.contains = function(point) {
    return point.x >= 0 && point.y >= 0 &&
        point.x < this.xsize && point.y < this.ysize;
}

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

Maze.prototype.getUserChanges = function(userMaze) {
    var diffPoints = [];
    var changedMaze = userMaze.maze;

    for ( var row = 0; row < this.ysize; row++) {
        for ( var column = 0; column < this.xsize; column++ ){
            var operationType = changedMaze[row][column].type - this.maze[row][column].type;
            if ( operationType !== 0 ) {
                var newPoint = new Point(column, row);
                newPoint.operationType = operationType;
                diffPoints.push(newPoint);
            }
        }
    }
    return diffPoints;
};

Maze.prototype.generateMazeParams = function(random) {

    var generateRandomBetween = function(min, max) {
        return random() * ( max - min ) + min;
    };

    this.xsize = Math.floor(generateRandomBetween(15, 40));
    this.ysize = Math.floor(generateRandomBetween(15, 40));

    var size = this.xsize * this.ysize;

    this.numWaypoints = 0;
    this.numPathVertexes = Math.floor(generateRandomBetween(.6, 1) * Math.sqrt(size));
    for (var i = 0; i < this.numPathVertexes / 5; i++) {
        if (random() > 0.6) {
            this.numWaypoints++;
        }
    }

    this.blockerProbability = generateRandomBetween(0.2, 0.6);

    this.actionPoints = Math.floor(10 + generateRandomBetween(0.5, 1.5) * Math.sqrt(size));

    this.removalCost = Math.floor(generateRandomBetween(2, 10));

    // console.log('xsize: ' + this.xsize);
    // console.log('ysize: ' + this.ysize);
    // console.log('blocker probability: ' + this.blockerProbability);
    // console.log('waypoints: ' + this.numWaypoints);
    // console.log('path vertexes: ' + this.numPathVertexes);
    // console.log('actions:' + this.actionPoints);
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
