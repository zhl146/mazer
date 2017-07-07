import Maze from "./Maze";

export default function Score( name, diffPoints, date) {
    this.name = name;
    this.diffPoints = diffPoints;
    this.date = date;
    this.score = this.calculateScore()
}

// Returns an integer indicating the user's score. If negative, there was
// a problem applying the user's actions (cheating or bug).
Score.prototype.calculateScore = function() {
    // userMaze starts out the same as the default maze
    var userMaze = new Maze(this.date);
    var defaultPath = userMaze.findPath()

    // apply user's changes to the maze
    // should make the maze the same as the one the user submitted
    for (var i = 0; i < this.diffPoints.length; i++ ) {
        var result = userMaze.doActionOnTile(this.diffPoints[i]);
        if (result === false) {
            return -1;
        }
    }

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
