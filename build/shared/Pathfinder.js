'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Pathfinder;

var _Maze = require('./Maze');

var _Maze2 = _interopRequireDefault(_Maze);

var _Point = require('./Point');

var _Point2 = _interopRequireDefault(_Point);

var _BinaryHeap = require('./BinaryHeap');

var _BinaryHeap2 = _interopRequireDefault(_BinaryHeap);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function PointSet() {
    // this is a set of x, y pairs
    // looks like { 'x coord': ('y coord' : true) }
    // if the point is in the set, it's value is true
    this.set = {};
}

PointSet.prototype.add = function (point) {
    // checks if the x value exists, otherwise set it to an empty object
    if (!this.set[point.x]) this.set[point.x] = {};
    // sets the point to true;
    this.set[point.x][point.y] = true;
};

// checks if the pointset contains a point
PointSet.prototype.has = function (point) {
    // doesn't the second condition imply the first?
    return this.set[point.x] && this.set[point.x][point.y];
};

PointSet.prototype.del = function (point) {
    if (!this.set[point.x]) return;
    delete this.set[point.x][point.y];
};

function Pathfinder(maze) {
    this.maze = maze;

    this.lastGTracker = [null, null, null, null, null];
}

// takes a start point and end point
// returns an array of points as an ending path
// return empty array if fails to find solution
Pathfinder.prototype.findPath = function (start, end) {
    if (!this.maze.isPassable(start)) {
        console.log("Start point is impassable", start);
        return [];
    }

    if (!this.maze.isPassable(end)) {
        console.log("End point is impassable", end);
        return [];
    }

    start.g = 0;
    start.f = 0;

    // list of tiles that have been explored
    var closedSet = new PointSet();

    // list of tiles to explore
    var openSet = new _BinaryHeap2.default(function (point) {
        return point.f;
    });

    var gTracker = new Array(this.maze.ysize);

    for (var i = 0; i < this.maze.ysize; i++) {
        gTracker[i] = new Array(this.maze.xsize);
        for (var j = 0; j < this.maze.xsize; j++) {
            gTracker[i][j] = -1;
        }
    }

    // add the ending point
    openSet.push(start);
    gTracker[start.y][start.x] = 0;

    var counter = 0;
    while (openSet.size()) {

        var currentPoint = openSet.pop();
        if (counter >= 2000) {
            break;
        }
        counter++;

        if (currentPoint.x === end.x && currentPoint.y === end.y) {
            break;
        }

        closedSet.add(currentPoint);

        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            for (var _iterator = currentPoint.getAdjacent(this.maze, end)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var neighbor = _step.value;

                if (closedSet.has(neighbor)) {
                    continue;
                }

                var neighborG = gTracker[neighbor.y][neighbor.x];
                var currentG = gTracker[currentPoint.y][currentPoint.x];

                if (neighborG < 0) {
                    openSet.push(neighbor);
                    gTracker[neighbor.y][neighbor.x] = neighbor.g;
                } else if (neighbor.g < neighborG) {
                    openSet.push(neighbor);
                    gTracker[neighbor.y][neighbor.x] = neighbor.g;
                }
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
        }
    }

    this.lastGTracker.unshift(gTracker);
    this.lastGTracker.pop();

    if (gTracker[end.y][end.x] < 0) {
        // Never visited end node, so no path
        return [];
    }

    var path = [];
    var node = currentPoint;
    path.unshift(node);
    while (node.parent) {
        path.unshift(node.parent);
        node = node.parent;
    }
    this.lastGTracker.unshift(gTracker);
    this.lastGTracker.pop();
    return path;
};