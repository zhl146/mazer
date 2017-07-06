export default function Point(x, y) {
    this.x = x;
    this.y = y;
};

Point.prototype.copy = function() {
  return new Point(this.x, this.y);
};

Point.prototype.setParent = function(parentPoint) {
    this.parent = parentPoint;
};

Point.prototype.setG = function() {
    this.g = this.parent.g + 1;
};

Point.prototype.setH = function(endPoint) {
    var xDiff = Math.abs( this.x - endPoint.x );
    var yDiff = Math.abs( this.y - endPoint.y );
    this.h = xDiff + yDiff;
};

Point.prototype.setF = function() {
    this.f = this.g + this.h;
};

Point.prototype.getAdjacent = function(maze, endpoint) {
    var pointArray = [];
    var newPoint;
    var self = this;

    var addPoint = function(newPoint) {
        if ( maze.isPassable(newPoint) ) {
            newPoint.setParent(self);
            newPoint.setG();
            newPoint.setH(endpoint);
            newPoint.setF();
            pointArray.push(newPoint)
        }
    };

    newPoint = new Point( this.x, this.y + 1 );
    addPoint(newPoint);
    newPoint = new Point( this.x + 1, this.y + 1 );
    addPoint(newPoint);
    newPoint = new Point( this.x + 1, this.y );
    addPoint(newPoint);
    newPoint = new Point( this.x + 1, this.y - 1 );
    addPoint(newPoint);
    newPoint = new Point( this.x, this.y - 1 );
    addPoint(newPoint);
    newPoint = new Point( this.x - 1, this.y - 1 );
    addPoint(newPoint);
    newPoint = new Point( this.x - 1, this.y );
    addPoint(newPoint);
    newPoint = new Point( this.x - 1, this.y + 1 );
    addPoint(newPoint);

    return pointArray;
};
