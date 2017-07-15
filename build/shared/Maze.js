'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Maze;

var _seedrandom = require('seedrandom');

var _seedrandom2 = _interopRequireDefault(_seedrandom);

var _Tile = require('./Tile');

var _Tile2 = _interopRequireDefault(_Tile);

var _Point = require('./Point');

var _Point2 = _interopRequireDefault(_Point);

var _Pathfinder = require('./Pathfinder');

var _Pathfinder2 = _interopRequireDefault(_Pathfinder);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Maze(seed) {
    var _this = this;

    var i = void 0;
    this.random = (0, _seedrandom2.default)(seed);
    this.seed = seed;

    // ------------------------------------------------------
    // maze params
    // ------------------------------------------------------
    this.xsize = 20;
    this.ysize = 20;
    this.tileset = {};

    // array of points
    // anything unused at the end has a chance of becoming a blocker
    this.unusedPoints = [];

    // array of points
    // these points will all become blockers
    this.blockerPoints = [];

    this.blockerSeeds = 15;

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

    // this function overwrites all of the above defaults
    this.generateMazeParams();

    // ------------------------------------------------------
    // pathfinding
    // ------------------------------------------------------

    // Used to find paths through this maze
    this.pathfinder = new _Pathfinder2.default(this);

    this.generateEmptyMaze();

    // we need to have at least one valid path through the maze
    var protectedPath = [];

    // holds generated set of points that will create the protected path
    var pathVertices = [];

    // reusable point
    var newPoint;

    // generate start/end/waypoints
    // they must be at least 2 distance apart to be accepted
    var savedPoints = [];
    while (pathVertices.length < this.numPathVertexes) {
        newPoint = this.generateNewPoint();
        if (pathVertices.pointIsAtLeastThisFar(newPoint, 2)) {
            pathVertices.push(newPoint);
        } else {
            savedPoints.push(newPoint);
        }
    }
    // we rejected some points in the previous step; make sure we put them back on the unused points array
    savedPoints.forEach(function (point) {
        return _this.unusedPoints.push(point);
    });

    // connect vertexes with path to create a random protected path between the start and end
    for (i = 0; i < this.numPathVertexes - 1; i++) {
        var pathSegment = this.pathfinder.findPath(pathVertices[i], pathVertices[i + 1]);
        if (i !== 0) {
            // Shift so that the path so that it's continuous (end of previous equals start of next)
            pathSegment.shift();
        }
        pathSegment.forEach(function (point) {
            return protectedPath.push(point);
        });
    }

    // we shouldn't put anything where the protected path is
    // so they are removed from the unused points array
    protectedPath.forEach(function (point) {
        _this.unusedPoints = _this.removePointInArray(_this.unusedPoints, point);
    });

    // Select random vertices to delete, excluding start and end
    while (pathVertices.length > this.numWaypoints + 2) {
        var index = Math.floor(1.0 + this.random() * (pathVertices.length - 2.0));
        pathVertices.splice(index, 1);
    }

    // the leftover points are the waypoints
    this.waypoints = pathVertices;

    // ------------------------------------------------------
    // blocker generation
    // ------------------------------------------------------

    this.generateBlockers();
};

Maze.tilesets = [{
    'name': 'desert',
    "colors": {
        'groundNatural': 'sandybrown',
        'groundUser': 'peru',
        'blockerNatural': 'darkred',
        'blockerUser': 'tomato'
    }
}, {
    'name': 'forest',
    "colors": {
        'groundNatural': '#8FCB9B',
        'groundUser': '#636940',
        'blockerNatural': '#0C8346',
        'blockerUser': '#054A29'
    }
}, {
    'name': 'winter',
    "colors": {
        'groundNatural': 'rgb(240,240,240)',
        'groundUser': '#BAA68D',
        'blockerNatural': 'rgb(175,175,175)',
        'blockerUser': 'rgb(75,75,75)'
    }
}, {
    'name': 'dark',
    "colors": {
        'groundNatural': '#689165',
        'groundUser': '#748067',
        'blockerNatural': '#436436',
        'blockerUser': '#14281D'
    }
}];

// make sure that the point is in the bounds
// and make sure that it is empty
Maze.prototype.isPassable = function (point) {
    return this.contains(point) && this.maze[point.y][point.x].isPassable();
};

// make sure that the point is in the bounds
// and make sure that it's not a waypoint (waypoints shouldn't be messed with)
Maze.prototype.isModifiable = function (point) {
    return this.contains(point) && !this.waypoints.containsPoint(point);
};

// makes sure that the point is in the bounds of the maze
Maze.prototype.contains = function (point) {
    return point.x >= 0 && point.y >= 0 && point.x < this.xsize && point.y < this.ysize;
};

// takes a point from the list of unused points, removes it from the list and returns it
Maze.prototype.generateNewPoint = function () {
    var randomPointIndex = this.generateRandomIntBetween(0, this.unusedPoints.length - 1);
    return this.unusedPoints.splice(randomPointIndex, 1)[0];
};

// initializes a xsize X ysize maze of empty tiles
Maze.prototype.generateEmptyMaze = function () {
    var _this2 = this;

    this.maze = this.createArrayofLength(this.ysize).map(function () {
        return _this2.createArrayofLength(_this2.xsize).map(function () {
            return new _Tile2.default(_Tile2.default.Type.Empty);
        });
    });
};

// invokes pathfinder to find all paths between waypoints
Maze.prototype.findPath = function () {
    var path = [];

    for (var i = 0; i < this.waypoints.length - 1; i++) {
        var segment = this.pathfinder.findPath(this.waypoints[i], this.waypoints[i + 1]);
        path.push(segment);
    }

    return path;
};

// change a maze tile to blocker type
Maze.prototype.setBlocker = function (point) {
    this.maze[point.y][point.x].type = _Tile2.default.Type.Blocker;
};

// calculates all points that changed and the operation to change them
Maze.prototype.getUserChanges = function (userMaze) {
    var diffPoints = [];
    var changedMaze = userMaze.maze;

    for (var row = 0; row < this.ysize; row++) {
        for (var column = 0; column < this.xsize; column++) {
            var operationType = changedMaze[row][column].type - this.maze[row][column].type;
            if (operationType !== 0) {
                var newPoint = new _Point2.default(column, row);
                newPoint.operationType = operationType;
                diffPoints.push(newPoint);
            }
        }
    }
    return diffPoints;
};

// generates a random int inclusive of min and max
Maze.prototype.generateRandomIntBetween = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(this.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
};

// generates the maze parameters that define how the maze will look
Maze.prototype.generateMazeParams = function () {
    this.tileset = Maze.tilesets[this.generateRandomIntBetween(0, 3)];

    this.xsize = Math.floor(this.generateRandomIntBetween(15, 40));
    this.ysize = Math.floor(this.generateRandomIntBetween(15, 40));

    var size = this.xsize * this.ysize;

    this.blockerSeeds = this.generateRandomIntBetween(15, Math.floor(size / 50));

    this.numWaypoints = 1;
    this.numPathVertexes = Math.floor(this.generateRandomIntBetween(6, 10) / 10 * Math.sqrt(size));
    for (var i = 0; i < this.numPathVertexes / 5; i++) {
        if (this.random() > 0.6) {
            this.numWaypoints++;
        }
    }

    this.actionPoints = Math.floor(10 + this.generateRandomIntBetween(5, 15) / 10 * Math.sqrt(size));

    this.removalCost = Math.floor(this.generateRandomIntBetween(2, 5));

    // this creates a 1-D list of all points on our maze
    var newPoint = void 0;
    for (var row = 0; row < this.ysize; row++) {
        for (var col = 0; col < this.xsize; col++) {
            newPoint = new _Point2.default(col, row);
            this.unusedPoints.push(newPoint);
        }
    }
};

// Flips the tile type. Returns true for success, false for failure.
// only use for user actions because it changes the userPlaced flag
Maze.prototype.doActionOnTile = function (point) {
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
    tile.type = tile.type === _Tile2.default.Type.Empty ? _Tile2.default.Type.Blocker : _Tile2.default.Type.Empty;
    this.actionsUsed += operationCost;

    return true;
};

// calculates the operation cost to do an action on a tile
Maze.prototype.operationCostForActionOnTile = function (tile) {
    var operationCost = 0;
    if (tile.userPlaced) {
        if (tile.type === _Tile2.default.Type.Blocker) {
            operationCost = -1;
        } else {
            operationCost = -this.removalCost;
        }
    } else {
        if (tile.type === _Tile2.default.Type.Blocker) {
            operationCost = this.removalCost;
        } else {
            operationCost = 1;
        }
    }

    return operationCost;
};

// generates a list of tiles that should have blockers placed on them
// then changes the tile types to blocker
Maze.prototype.generateBlockers = function () {
    var _this3 = this;

    var seedPoints = this.generateSeedPoints();
    var seedDecayFactor = void 0;

    seedPoints.forEach(function (seedPoint) {
        seedDecayFactor = _this3.generateRandomIntBetween(2, 10) / 10;
        _this3.unusedPoints.forEach(function (unusedPoint) {
            var distance = seedPoint.calculateDistance(unusedPoint);
            var threshold = Math.exp(-seedDecayFactor * distance);
            if (_this3.random() < threshold) {
                _this3.blockerPoints.push(unusedPoint);
                _this3.unusedPoints.removePoint(unusedPoint);
            }
        });
    });

    seedPoints.forEach(function (point) {
        return _this3.blockerPoints.push(point);
    });
    this.blockerPoints.forEach(function (point) {
        return _this3.setBlocker(point);
    });
};

// gets some random points to place as seed blockers
// the closer a tile is to a seed, the higher the probability of placing a blocker on it
Maze.prototype.generateSeedPoints = function () {
    var seedPoints = [];
    while (seedPoints.length < this.blockerSeeds) {
        seedPoints.push(this.generateNewPoint());
    }
    return seedPoints;
};

// returns an array with the point removed from it
Maze.prototype.removePointInArray = function (array, pointToRemove) {
    return array.filter(function (pointInArray) {
        return !pointInArray.matches(pointToRemove);
    });
};

// creates an 0'ed array of the desired length
Maze.prototype.createArrayofLength = function (desiredLength) {
    var newArray = [];
    newArray.length = desiredLength;
    return newArray.fill(0);
};

// extra array functions to test arrays with points

Array.prototype.pointIsAtLeastThisFar = function (point, distance) {
    // every only returns true only if every element in the tested array pasts to callback function test
    return this.every(function (pointInArray) {
        return pointInArray.calculateDistance(point) > distance;
    });
};

Array.prototype.containsPoint = function (pointToCheck) {
    return this.indexOfPoint(pointToCheck) >= 0;
};

Array.prototype.indexOfPoint = function (pointToFind) {
    // findIndex method returns index of the first element in the array that satisfies the the callback
    // otherwise returns -1
    return this.findIndex(function (pointInArray) {
        return pointInArray.matches(pointToFind);
    });
};

Array.prototype.removePoint = function (pointToRemove) {
    // returns a new array with elements that match the callback
    this.filter(function (pointInArray) {
        return !pointInArray.matches(pointToRemove);
    });
};