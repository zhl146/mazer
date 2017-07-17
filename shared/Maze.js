import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';
import Pathfinder from './Pathfinder';

const ColorScheme = require('color-scheme');

export default function Maze(seed) {
    let i;
    this.random = seedrandom(seed);
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

    this.numScoringZones = 0;

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
    this.pathfinder = new Pathfinder(this);

    this.generateEmptyMaze();

    this.generateScoreZones();

    // we need to have at least one valid path through the maze
    var protectedPath = [];

    // holds generated set of points that will create the protected path
    var pathVertices = [];

    // reusable point
    var newPoint;

    // generate start/end/waypoints
    // they must be at least 2 distance apart to be accepted
    let savedPoints = [];
    while ( pathVertices.length < this.numPathVertexes ) {
        newPoint = this.generateNewPoint();
        if (pathVertices.pointIsAtLeastThisFar(newPoint, 2) ) {
            pathVertices.push(newPoint);
        } else {
            savedPoints.push(newPoint);
        }
    }
    // we rejected some points in the previous step; make sure we put them back on the unused points array
    savedPoints.forEach( (point) => this.unusedPoints.push(point) );

    // connect vertexes with path to create a random protected path between the start and end
    for (i = 0; i < this.numPathVertexes - 1; i++) {
        const pathSegment = this.pathfinder.findPath(pathVertices[i], pathVertices[i + 1]);
        if (i !== 0) {
            // Shift so that the path so that it's continuous (end of previous equals start of next)
            pathSegment.shift();
        }
        pathSegment.forEach( (point) => protectedPath.push(point));
    }

    // we shouldn't put anything where the protected path is
    // so they are removed from the unused points array
    protectedPath.forEach( (point) => {
        this.unusedPoints = this.removePointInArray(this.unusedPoints, point);
    });

    // Select random vertices to delete, excluding start and end
    while (pathVertices.length > this.numWaypoints + 2) {
        const index = Math.floor(1.0 + this.random() * (pathVertices.length - 2.0));
        pathVertices.splice(index, 1);
    }

    // the leftover points are the waypoints
    this.waypoints = pathVertices;

    // ------------------------------------------------------
    // blocker generation
    // ------------------------------------------------------

    this.generateBlockers();
};

// make sure that the point is in the bounds
// and make sure that it is empty
Maze.prototype.isPassable = function(point) {
    return this.contains(point) &&
        this.maze[point.y][point.x].isPassable();
};

// make sure that the point is in the bounds
// and make sure that it's not a waypoint (waypoints shouldn't be messed with)
Maze.prototype.isModifiable = function(point) {
    return this.contains(point) &&
        !this.waypoints.containsPoint(point);
};

// makes sure that the point is in the bounds of the maze
Maze.prototype.contains = function(point) {
    return point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.xsize &&
        point.y < this.ysize;
};

// takes a point from the list of unused points, removes it from the list and returns it
Maze.prototype.generateNewPoint = function() {
    const randomPointIndex = this.generateRandomIntBetween(0, this.unusedPoints.length - 1);
    return this.unusedPoints.splice(randomPointIndex, 1)[0];
};

// initializes a xsize X ysize maze of empty tiles
Maze.prototype.generateEmptyMaze = function() {
    this.maze = this.createArrayofLength(this.ysize)
        .map( () => this.createArrayofLength(this.xsize)
                .map( () => new Tile(Tile.Type.Empty) )
        );
};

// invokes pathfinder to find all paths between waypoints
Maze.prototype.findPath = function() {
    const path = [];

    for (let i = 0; i < this.waypoints.length - 1; i++) {
        const segment = this.pathfinder.findPath(this.waypoints[i], this.waypoints[i + 1]);
        path.push(segment);
    }

    return path;
};

// change a maze tile to blocker type
Maze.prototype.setBlocker = function(point) {
    this.maze[point.y][point.x].type = Tile.Type.Blocker;
};

// calculates all points that changed and the operation to change them
Maze.prototype.getUserChanges = function(userMaze) {
    const diffPoints = [];
    const changedMaze = userMaze.maze;

    for (let row = 0; row < this.ysize; row++) {
        for (let column = 0; column < this.xsize; column++ ){
            const operationType = changedMaze[row][column].type - this.maze[row][column].type;
            if ( operationType !== 0 ) {
                const newPoint = new Point(column, row);
                newPoint.operationType = operationType;
                diffPoints.push(newPoint);
            }
        }
    }
    return diffPoints;
};

// generates a random int inclusive of min and max
Maze.prototype.generateRandomIntBetween = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(this.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
};

// generates the maze parameters that define how the maze will look
Maze.prototype.generateMazeParams = function() {
    const colorScheme = new ColorScheme;
    const hue = this.generateRandomIntBetween(0, 359000) / 1000;

    const mazeColors = colorScheme.from_hue(hue)
        .scheme('contrast')
        .variation('pale')
        .colors()
        .map( (color) => '#' + color);

    const generatedPathColors = colorScheme.from_hue(hue)
        .scheme('contrast')
        .variation('hard')
        .colors()
        .splice(4)
        .map( (color) => '#' + color);

    const basePathColor = generatedPathColors[0];

    function shadeColor2(color, percent) {
        const f=parseInt(color.slice(1),16),t=percent<0?0:255,p=percent<0?percent*-1:percent,R=f>>16,G=f>>8&0x00FF,B=f&0x0000FF;
        return "#"+(0x1000000+(Math.round((t-R)*p)+R)*0x10000+(Math.round((t-G)*p)+G)*0x100+(Math.round((t-B)*p)+B)).toString(16).slice(1);
    }

    const pathColors = [];

    for (let i = -.4; i <= .8; i+=.2) {
        pathColors.push(shadeColor2(basePathColor, i))
    }

    this.tileset = {
        'name': 'randomlyGeneratedTileset',
        "colors": {
            'groundNatural': mazeColors[2],
            'groundUser': mazeColors[0],
            'blockerNatural': mazeColors[3],
            'blockerUser': mazeColors[1],
        },
        "pathColors": pathColors
    };

    this.xsize = Math.floor(this.generateRandomIntBetween(15, 40));
    this.ysize = Math.floor(this.generateRandomIntBetween(15, 40));

    const size = this.xsize * this.ysize;

    this.blockerSeeds = this.generateRandomIntBetween(15, Math.floor(size / 50) );

    this.numScoringZones = this.generateRandomIntBetween(1, Math.floor(size / 300));

    this.numWaypoints = 1;
    this.numPathVertexes = Math.floor( this.generateRandomIntBetween(6, 10) / 10 * Math.sqrt(size) );
    for (let i = 0; i < this.numPathVertexes / 5; i++) {
        if (this.random() > 0.6) {
            this.numWaypoints++;
        }
    }

    this.actionPoints = Math.floor(10 + this.generateRandomIntBetween(5, 15) / 10 * Math.sqrt(size));

    this.removalCost = Math.floor(this.generateRandomIntBetween(2, 5));

    // this creates a 1-D list of all points on our maze
    let newPoint;
    for (let row = 0; row < this.ysize; row++) {
        for (let col = 0; col < this.xsize; col++) {
            newPoint = new Point(col, row);
            this.unusedPoints.push(newPoint);
        }
    }
};

// Flips the tile type. Returns true for success, false for failure.
// only use for user actions because it changes the userPlaced flag
Maze.prototype.doActionOnTile = function(point) {
    if (!this.isModifiable(point)) {
        return false;
    }

    const tile = this.maze[point.y][point.x];

    // before we do anything, check if the user has enough action points
    // to do the desired action
    const operationCost = this.operationCostForActionOnTile(tile);
    if (this.actionsUsed + operationCost > this.actionPoints) {
        return false;
    }

    // Modify the tile
    tile.userPlaced = !tile.userPlaced;
    tile.type = (tile.type === Tile.Type.Empty ? Tile.Type.Blocker : Tile.Type.Empty);
    this.actionsUsed += operationCost;

    return true;
};

// calculates the operation cost to do an action on a tile
Maze.prototype.operationCostForActionOnTile = function(tile) {
    let operationCost = 0;
    if (tile.userPlaced) {
        if (tile.type === Tile.Type.Blocker) {
            operationCost = -1
        } else {
            operationCost = - this.removalCost;
        }
    }
    else {
        if (tile.type === Tile.Type.Blocker) {
            operationCost =  this.removalCost;
        } else {
            operationCost = 1
        }
    }

    return operationCost
};

// generates a list of tiles that should have blockers placed on them
// then changes the tile types to blocker
Maze.prototype.generateBlockers = function() {
    // the closer a tile is to a seed, the higher the probability of placing a blocker on it
    const seedPoints = this.generateSeedPoints(this.blockerSeeds);
    let seedDecayFactor;

    seedPoints.forEach( (seedPoint) => {
        seedDecayFactor = this.generateRandomIntBetween(2, 10) / 10;
        this.unusedPoints.forEach( (unusedPoint) => {
            const distance = seedPoint.calculateDistance(unusedPoint);
            const threshold = Math.exp( -seedDecayFactor * distance );
            if ( this.random() < threshold ) {
                this.blockerPoints.push(unusedPoint);
                this.unusedPoints.removePoint(unusedPoint);
            }
        })
    });

    seedPoints.forEach( (point) => this.blockerPoints.push(point) );
    this.blockerPoints.forEach( (point) => this.setBlocker(point) );
};

// gets some random points to place as seeds
Maze.prototype.generateSeedPoints = function(numSeeds) {
    const seedPoints = [];
    while( seedPoints.length < numSeeds ) {
        seedPoints.push(this.generateNewPoint())
    }
    return seedPoints;
};

// returns an array with the point removed from it
Maze.prototype.removePointInArray = function(array, pointToRemove) {
    return array.filter( (pointInArray) => !pointInArray.matches(pointToRemove) );
};

// creates an 0'ed array of the desired length
Maze.prototype.createArrayofLength = function(desiredLength) {
    let newArray = [];
    newArray.length = desiredLength;
    return newArray.fill(0);
};

Maze.prototype.getScoreMod = function(point) {
    return this.maze[point.y][point.x].scoreMod;
};

Maze.prototype.generateScoreZones = function() {
    const scoreSeeds = this.generateSeedPoints(this.numScoringZones);
    const scoreSizeArray = [];

    scoreSeeds.forEach( (seed) => {
        scoreSizeArray.push( this.generateRandomIntBetween(2, 6) );
        this.setScoreZoneCenter(seed);
    });
    for (let i = 0; i < scoreSeeds.length; i++) {
        this.expandScoreZone(scoreSizeArray[i], 7 - scoreSizeArray[i], scoreSeeds[i]);
    }
};

Maze.prototype.expandScoreZone = function(zoneSize, zoneModifier, seedPoint) {
    for (let rowOffset = -zoneSize; rowOffset <= zoneSize; rowOffset++ ) {
        let absoluteColumn = ( zoneSize - Math.abs(rowOffset) );
        for (let columnOffset = -absoluteColumn; columnOffset <= absoluteColumn; columnOffset++) {
            const newPoint = new Point(seedPoint.x + rowOffset, seedPoint.y + columnOffset);
            if (this.contains(newPoint)) {
                this.incrementScoreZone(newPoint, zoneModifier);
            }
        }
    }
};

Maze.prototype.isScoreZoneCenter = function (point) {
    return this.maze[point.y][point.x].scoreZoneCenter;
};

Maze.prototype.incrementScoreZone = function(point, amount) {
    this.maze[point.y][point.x].scoreMod += amount;
};

Maze.prototype.setScoreZoneCenter = function(point) {
    this.maze[point.y][point.x].scoreZoneCenter = true;
};

// extra array functions to test arrays with points

Array.prototype.pointIsAtLeastThisFar = function(point, distance) {
    // every only returns true only if every element in the tested array pasts to callback function test
    return this.every( (pointInArray) => pointInArray.calculateDistance(point) > distance );
};

Array.prototype.containsPoint = function(pointToCheck) {
    return ( this.indexOfPoint(pointToCheck) >= 0 );
};

Array.prototype.indexOfPoint = function(pointToFind) {
    // findIndex method returns index of the first element in the array that satisfies the the callback
    // otherwise returns -1
    return this.findIndex( (pointInArray) => pointInArray.matches(pointToFind) );
};

Array.prototype.removePoint = function(pointToRemove) {
    // returns a new array with elements that match the callback
    this.filter( (pointInArray) => !pointInArray.matches(pointToRemove) );
};