"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Score;
function Score(baseMaze) {
    var defaultPath = baseMaze.findPath();
    this.baseScore = Math.floor(this.calculatePathLength(defaultPath) * 100);
}

// Returns an integer indicating the user's score. If negative, there was
// a problem applying the user's actions (cheating or bug).
Score.prototype.calculateScore = function (maze) {
    // use the new maze to calculate the user's submitted path
    var adjustedPath = maze.findPath();

    var unadjustedScore = Math.floor(this.calculatePathLength(adjustedPath) * 100);
    var adjustedScore = unadjustedScore - this.baseScore;

    return adjustedScore;
};

Score.prototype.calculatePathLength = function (path) {
    var pathLength = 0;
    for (var i = 0; i < path.length; i++) {
        var currentPoint = path[i][0];
        for (var j = 1; j < path[i].length; j++) {
            var nextPoint = path[i][j];
            var xDiff = currentPoint.x - nextPoint.x;
            var yDiff = currentPoint.y - nextPoint.y;
            var distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            pathLength = pathLength + distance;
            currentPoint = nextPoint;
        }
    }
    return pathLength;
};