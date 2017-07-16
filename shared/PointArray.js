export default function PointArray(size){
    this.content = [];
    this.content.length = size;
    return this.content.fill(0);
}

PointArray.prototype.pointIsAtLeastThisFar = function(point, distance) {
    // every only returns true only if every element in the tested array passes the callback function test
    return this.content.every( (pointInArray) => pointInArray.calculateDistance(point) > distance );
};

PointArray.prototype.containsPoint = function(pointToCheck) {
    // some returns true as soon as an element in the array passes the callback function test
    return this.content.some( (pointInArray) => pointInArray.matches(pointToCheck) );
};

PointArray.prototype.indexOfPoint = function(pointToFind) {
    // findIndex method returns index of the first element in the array that satisfies the the callback
    // otherwise returns -1
    return this.content.findIndex( (pointInArray) => pointInArray.matches(pointToFind) );
};

PointArray.prototype.removePoint = function(pointToRemove) {
    // returns a new array with elements that match the callback
    return this.content.filter( (pointInArray) => !pointInArray.matches(pointToRemove) );
};