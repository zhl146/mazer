"use strict";

class Point{
    constructor(x, y){
        this.x = x;
        this.y = y;
        this.parent = null;
        this.g = null;
    }

    calculateDistance( point ) {
        const xDiff = this.x - point.x;
        const yDiff = this.y - point.y;
        return Math.sqrt(xDiff*xDiff + yDiff*yDiff);
    }

    copy() {
        return new Point(this.x, this.y);
    }

    matches(pointToCompare) {
        return ( this.x === pointToCompare.x && this.y === pointToCompare.y );
    }

    setParent(parentPoint) {
        this.parent = parentPoint;
    }

    setG(cost) {
        this.g = this.parent.g + cost;
    }
    
    setH(endPoint) {
        const xDiff = Math.abs(endPoint.x - this.x);
        const yDiff = Math.abs(endPoint.y - this.y);
        this.h = 7 * (xDiff + yDiff);
    }

    setF() {
        this.f = this.g + this.h;
    }

}

module.exports = Point;
