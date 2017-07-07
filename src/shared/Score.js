import Maze from "./Maze";

export default function Score( name, diffPoints, date) {
    this.name = name;
    this.diffPoints = diffPoints;
    this.date = date;
    this.score = this.calculateScore()
}

Score.prototype.calculateScore = function() {
    var removalCost = 5;

    // userMaze starts out the same as the default maze
    var userMaze = new Maze(this.date);
    var defaultPath = userMaze.findPath()

    var actionCounter = 0;
    var maxActions = userMaze.actionPoints;
    for (var i = 0; i < this.diffPoints.length; i++) {
        if (this.diffPoints[i].operationType === 1) {
            actionCounter++;
        } else {
            actionCounter = actionCounter + removalCost;
        }
    }

    if (actionCounter > maxActions) {
        return 0;
    }

    // apply user's changes to the maze
    // should make the maze the same as the one the user submitted
    userMaze.applyChanges(this.diffPoints);

    // use the new maze to calculate the user's submitted path
    var adjustedPath = userMaze.findPath();
    console.log(adjustedPath);

    var baseScore = Math.floor(this.calculatePathLength(defaultPath)*100);
    var unadjustedScore = Math.floor(this.calculatePathLength(adjustedPath)*100);

    var adjustedScore = unadjustedScore - baseScore;
    console.log(adjustedScore);
    return adjustedScore
};

Score.prototype.calculatePathLength = function(path) {
    var pathLength = 0;
    for (var i = 0; i < path.length; i++) {
        var currentPoint = path[i][0];
        for (var j = 1; j < path[i].length; j++) {
            var nextPoint = path[i][j];
            var xDiff = currentPoint.x - nextPoint.x;
            var yDiff = currentPoint.y - nextPoint.y;
            var distance = Math.sqrt(xDiff*xDiff + yDiff*yDiff);
            pathLength = pathLength + distance;
            currentPoint = nextPoint;
        }
    }
    return pathLength;
};