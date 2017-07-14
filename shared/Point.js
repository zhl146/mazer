export default function Point(x, y) {
    this.x = x;
    this.y = y;
};

Point.prototype.calculateDistance = function ( point ) {
    const xDiff = this.x - point.x;
    const yDiff = this.y - point.y;
    return Math.sqrt(xDiff*xDiff + yDiff*yDiff);
};

Point.prototype.copy = function() {
  return new Point(this.x, this.y);
};

Point.prototype.matches = function ( pointToCompare ) {
    return ( this.x === pointToCompare.x && this.y === pointToCompare.y );
};

Point.prototype.setParent = function(parentPoint) {
    this.parent = parentPoint;
};

Point.prototype.setG = function(cost) {
    this.g = this.parent.g + cost;
};

Point.prototype.setH = function(endPoint) {
    const xDiff = Math.abs(endPoint.x - this.x);
    const yDiff = Math.abs(endPoint.y - this.y);
    this.h = 7 * (xDiff + yDiff);
};

Point.prototype.setF = function() {
    this.f = this.g + this.h;
};

Point.prototype.getAdjacent = function(maze, endpoint) {
    const pointArray = [];
    let newPoint;
    const self = this;

    const addPoint = function ( newPoint, isDiagonal ) {
        if (maze.isPassable(newPoint)) {
            newPoint.setParent(self);
            newPoint.setG(isDiagonal ? 14 : 10);
            newPoint.setH(endpoint);
            newPoint.setF();
            pointArray.push(newPoint)
        }
    };

    newPoint = new Point( this.x, this.y + 1 );
    addPoint(newPoint, false);
    newPoint = new Point( this.x + 1, this.y + 1 );
    addPoint(newPoint, true);
    newPoint = new Point( this.x + 1, this.y );
    addPoint(newPoint, false);
    newPoint = new Point( this.x + 1, this.y - 1 );
    addPoint(newPoint, true);
    newPoint = new Point( this.x, this.y - 1 );
    addPoint(newPoint, false);
    newPoint = new Point( this.x - 1, this.y - 1 );
    addPoint(newPoint, true);
    newPoint = new Point( this.x - 1, this.y );
    addPoint(newPoint, false);
    newPoint = new Point( this.x - 1, this.y + 1 );
    addPoint(newPoint, true);

    return pointArray;
};
