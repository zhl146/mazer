
export default function Score(baseMaze) {
    this.maze = baseMaze;
    const defaultPath = baseMaze.findPath();
    this.baseScore = Math.floor(this.calculatePathLength(defaultPath)*100);
}

// Returns an integer indicating the user's score. If negative, there was
// a problem applying the user's actions (cheating or bug).
Score.prototype.calculateScore = function(maze) {
    // use the new maze to calculate the user's submitted path
    const adjustedPath = maze.findPath();

    const unadjustedScore = Math.floor(this.calculatePathLength(adjustedPath)*100);
    return unadjustedScore - this.baseScore;
};

Score.prototype.calculatePathLength = function(path) {
    let pathLength = 0;
    for (let i = 0; i < path.length; i++) {
        let currentPoint = path[i][0];
        for (let j = 1; j < path[i].length; j++) {
            const nextPoint = path[i][j];
            const xDiff = currentPoint.x - nextPoint.x;
            const yDiff = currentPoint.y - nextPoint.y;
            const distance = Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            const avgScoreMod = ( this.maze.getScoreMod(currentPoint) + this.maze.getScoreMod(nextPoint) ) / 2;
            const adjustedDistance = avgScoreMod * distance;
            pathLength = pathLength + adjustedDistance;
            currentPoint = nextPoint;
        }
    }
    return pathLength;
};
