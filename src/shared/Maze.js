import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';
import Pathfinder from './Pathfinder';

export default function Maze(seed) {
    this.random = seedrandom(seed);
    this.seed = seed;

    // maze params
    this.xsize = 20;
    this.ysize = 20;

    this.unusedPoints = [];

    this.blockerProbability = 0.2;

    // how many action points the user gets to spend
    // adding a blocker always costs 1
    this.actionPoints = 10;

    // how many actions the user has used up
    this.actionsUsed = 0;

    // holds the waypoints (points between start and end) that
    // need to be traveled to in order
    this.numWaypoints = 2;

    // how many points are used to generate the protected path
    this.numPathVertexes = 20;

    // action point cost to remove a natural blocker
    this.removalCost = 5;

    this.generateMazeParams();

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
    // they must be at least 2 distance apart to be accepted
    while ( pathVertices.length < this.numPathVertexes ) {
        newPoint = this.generateNewPoint();
        if (pathVertices.pointIsAtLeastThisFar(newPoint, 2) ) {
            pathVertices.push(newPoint);
        }
    }

    // connect vertexes with path to create a random protected path between the start and end
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
        var index = Math.floor(1.0 + this.random() * (pathVertices.length - 2.0));
        pathVertices.splice(index, 1);
    }

    // the leftover points are the waypoints
    this.waypoints = pathVertices;

    this.generateBlockers();
    // for (var y = 0; y < this.ysize; y++) {
    //     var row = [];
    //     for (var x = 0; x < this.xsize; x++) {
    //         newPoint = new Point(x, y);
    //         var tileType;
    //         if (!protectedPath.containsPoint(newPoint)) {
    //             var propensity = this.random();
    //             tileType =  propensity <= this.blockerProbability ? 'Blocker' : 'Empty'
    //         } else {
    //             tileType = 'Empty';
    //         }
    //         row.push(new Tile(Tile.Type[tileType]));
    //     }
    //     generatedMaze.push(row);
    // }
    //
    // this.maze = generatedMaze;
};

Maze.prototype.isPassable = function(point)
{
    return this.contains(point) &&
        this.maze[point.y][point.x].isPassable();
};

Maze.prototype.isModifiable = function(point) {
    return this.contains(point) &&
        this.waypoints.indexOfPoint(point) < 0;
};

Maze.prototype.contains = function(point) {
    return point.x >= 0 && point.y >= 0 &&
        point.x < this.xsize && point.y < this.ysize;
};

Maze.prototype.generateNewPoint = function() {
    var randomPointIndex = this.generateRandomBetween(0, this.unusedPoints.length - 1);
    return this.unusedPoints.splice(randomPointIndex, 1)[0];
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

Maze.prototype.generateRandomBetween = function(min, max) {
    return this.random() * ( max - min ) + min;
};

Maze.prototype.generateMazeParams = function() {

    this.xsize = Math.floor(this.generateRandomBetween(15, 40));
    this.ysize = Math.floor(this.generateRandomBetween(15, 40));

    var size = this.xsize * this.ysize;

    this.numWaypoints = 0;
    this.numPathVertexes = Math.floor(this.generateRandomBetween(.6, 1) * Math.sqrt(size));
    for (var i = 0; i < this.numPathVertexes / 5; i++) {
        if (this.random() > 0.6) {
            this.numWaypoints++;
        }
    }

    this.blockerProbability = this.generateRandomBetween(0.2, 0.6);

    this.actionPoints = Math.floor(10 + this.generateRandomBetween(0.5, 1.5) * Math.sqrt(size));

    this.removalCost = Math.floor(this.generateRandomBetween(2, 10));

    // this creates a list of all points on our maze
    var newPoint;
    for ( var row = 0; row < this.ysize; row++) {
        for (var col = 0; col < this.xsize; col++) {
            newPoint = new Point(col, row);
            this.unusedPoints.push(newPoint);
        }
    }

    // console.log('xsize: ' + this.xsize);
    // console.log('ysize: ' + this.ysize);
    // console.log('blocker probability: ' + this.blockerProbability);
    // console.log('waypoints: ' + this.numWaypoints);
    // console.log('path vertexes: ' + this.numPathVertexes);
    // console.log('actions:' + this.actionPoints);
};

// Flips the tile type. Returns true for success, false for failure.
Maze.prototype.doActionOnTile = function(point) {
    if (!this.isModifiable(point)) {
        return false;
    }

    var tile = this.maze[point.y][point.x];

    // before we do anything, check if the user has enough action points
    // to do the desired action
    var operationCost = this.operationCostForActionOnTile(tile);
    if (this.actionsUsed + operationCost > this.actionPoints) {
        return false;
    }

    // Modify the tile
    tile.userPlaced = !tile.userPlaced;
    tile.type = (tile.type === Tile.Type.Empty ? Tile.Type.Blocker : Tile.Type.Empty);
    this.actionsUsed += operationCost;

    return true;
};

Maze.prototype.operationCostForActionOnTile = function(tile) {
    var operationCost = 0;
    if (tile.userPlaced) {
        if (tile.type === Tile.Type.Blocker) {
            operationCost = -1
        } else {
            operationCost = - this.removalCost;
        }
    }
    else {
        if (tile.type === Tile.Type.Blocker) {
            operationCost =  this.removalCost;
        } else {
            operationCost = 1
        }
    }
    
    return operationCost
};

Maze.prototype.generateBlockers = function() {
};

Maze.prototype.seedBlockers = function() {
    var numSeedPoints = 5;
    var blockerPoints = [];
    for (var i = 0; i < numSeedPoints; i++) {

         blockerPoints.push()
    }
};


// extra array functions to test arrays with points
Array.prototype.pointIsAtLeastThisFar = function(point, distance) {

    var calculateDistance = function(point1, point2) {
        var xDiff = point1.x - point2.x;
        var yDiff = point1.y - point2.y;
        return Math.sqrt(xDiff*xDiff + yDiff*yDiff);
    };

    for (var i = 0; i < this.length; i++) {
        if ( calculateDistance(this[i], point) < distance ) {
            return false;
        }
    }
    return true;
};

Array.prototype.containsPoint = function(obj) {
    return ( this.indexOfPoint(obj) >= 0 );
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
