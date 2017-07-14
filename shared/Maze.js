import seedrandom from 'seedrandom';
import Tile from './Tile';
import Point from './Point';
import Pathfinder from './Pathfinder';

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

    // we need to have at least one valid path through the maze
    var protectedPath = [];

    // holds generated set of points that will create the protected path
    var pathVertices = [];

    // reusable point
    var newPoint;

    // generate start/end/waypoints
    // they must be at least 2 distance apart to be accepted
    while ( pathVertices.length < this.numPathVertexes ) {
        newPoint = this.generateNewPoint();
        if (pathVertices.pointIsAtLeastThisFar(newPoint, 2) ) {
            pathVertices.push(newPoint);
        } else {
            this.unusedPoints.push(newPoint);
        }
    }

    // connect vertexes with path to create a random protected path between the start and end
    for (i = 0; i < this.numPathVertexes - 1; i++) {
        const pathSegment = this.pathfinder.findPath(pathVertices[i], pathVertices[i + 1]);
        if (i !== 0) {
            // Shift so that the path so that it's continuous (end of previous equals
            // start of next)
            pathSegment.shift();
        }
        protectedPath.push(...pathSegment);
    }

    // we shouldn't put anything where the protected path is
    // so they are removed from the unused points array
    for (i = 0; i < protectedPath.length; i++) {
        this.unusedPoints.removePoint(protectedPath[i]);
    }

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

Maze.tilesets = [
    {
        'name': 'desert',
        "colors": {
            'groundNatural': 'sandybrown',
            'groundUser': 'peru',
            'blockerNatural': 'darkred',
            'blockerUser': 'tomato',
        }
    },
    {
        'name': 'forest',
        "colors": {
            'groundNatural': '#8FCB9B',
            'groundUser': '#636940',
            'blockerNatural': '#0C8346',
            'blockerUser': '#054A29',
        }
    },
    {
        'name': 'winter',
        "colors": {
            'groundNatural': 'rgb(240,240,240)',
            'groundUser': '#BAA68D',
            'blockerNatural': 'rgb(175,175,175)',
            'blockerUser': 'rgb(75,75,75)',
        }
    },
    {
        'name': 'dark',
        "colors": {
            'groundNatural': '#689165',
            'groundUser': '#748067',
            'blockerNatural': '#436436',
            'blockerUser': '#14281D',
        }
    }
];

Maze.prototype.isPassable = (point) => {
    return this.contains(point) &&
        this.maze[point.y][point.x].isPassable();
};

Maze.prototype.isModifiable = (point) => {
    return this.contains(point) &&
        this.waypoints.indexOfPoint(point) < 0;
};

Maze.prototype.contains = (point) => {
    return point.x >= 0 &&
        point.y >= 0 &&
        point.x < this.xsize &&
        point.y < this.ysize;
};

Maze.prototype.generateNewPoint = () => {
    const randomPointIndex = this.generateRandomBetween(0, this.unusedPoints.length - 1);
    return this.unusedPoints.splice(randomPointIndex, 1)[0];
};

Maze.prototype.generateEmptyMaze = () => {
    const maze = [];
    for (let y = 0; y < this.ysize; y++) {
        const row = [];
        for (let x = 0; x < this.xsize; x++) {
            row.push(new Tile(Tile.Type.Empty));
        }
        maze.push(row);
    }
    this.maze = maze
};

Maze.prototype.findPath = () => {
    const path = [];

    for (let i = 0; i < this.waypoints.length - 1; i++) {
        const segment = this.pathfinder.findPath(this.waypoints[i], this.waypoints[i + 1]);
        path.push(segment);
    }

    return path;
};

Maze.prototype.setBlocker = (point) => {
    this.maze[point.y][point.x].type = Tile.Type.Blocker;
};

Maze.prototype.getUserChanges = (userMaze) => {
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

Maze.prototype.generateRandomBetween = (min, max) => {
    return this.random() * ( max - min ) + min;
};

Maze.prototype.generateMazeParams = () => {
    this.tileset = Maze.tilesets[Math.floor(this.generateRandomBetween(0, 3))];

    this.xsize = Math.floor(this.generateRandomBetween(15, 40));
    this.ysize = Math.floor(this.generateRandomBetween(15, 40));

    const size = this.xsize * this.ysize;

    this.blockerSeeds = this.generateRandomBetween(15, size / 50);

    this.numWaypoints = 0;
    this.numPathVertexes = Math.floor(this.generateRandomBetween(.6, 1) * Math.sqrt(size));
    for (let i = 0; i < this.numPathVertexes / 5; i++) {
        if (this.random() > 0.6) {
            this.numWaypoints++;
        }
    }

    this.actionPoints = Math.floor(10 + this.generateRandomBetween(0.5, 1.5) * Math.sqrt(size));

    this.removalCost = Math.floor(this.generateRandomBetween(2, 10));

    // this creates a list of all points on our maze
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
Maze.prototype.doActionOnTile = (point) => {
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

Maze.prototype.operationCostForActionOnTile = (tile) => {
    var operationCost = 0;
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

Maze.prototype.generateBlockers = () => {
    let i;
    const seedPoints = this.generateSeedPoints();
    const seedDecayFactor = [];
    for (i = 0; i < seedPoints.length; i++) {
        seedDecayFactor[i] = this.generateRandomBetween(.2, 1);

        for (let j = 0; j < this.unusedPoints.length; j++) {
            const seedPoint = seedPoints[i];
            let exponent = seedDecayFactor[i];
            const distance = seedPoint.calculateDistance(this.unusedPoints[j]);
            const threshold = Math.exp(- exponent * distance);
            if ( this.random() < threshold ) {
                this.blockerPoints.push(this.unusedPoints.splice(j, 1)[0]);
            }
        }
    }

    this.blockerPoints.push(...seedPoints);
    for (i = 0; i < this.blockerPoints.length; i++) {
        const point = this.blockerPoints[i];
        this.setBlocker(point);
    }
};

Maze.prototype.generateSeedPoints = () => {
    const seedPoints = [];
    for (let i = 0; i < this.blockerSeeds; i++) {
        seedPoints.push(this.generateNewPoint())
    }
    return seedPoints;
};


// extra array functions to test arrays with points
Array.prototype.pointIsAtLeastThisFar = (point, distance) => {

    for (let i = 0; i < this.length; i++) {
        if ( this[i].calculateDistance(point) < distance ) {
            return false;
        }
    }
    return true;
};

Array.prototype.containsPoint = (obj) => {
    return ( this.indexOfPoint(obj) >= 0 );
};

Array.prototype.indexOfPoint = (obj) => {
    let i = this.length;
    while (i--) {
        if (this[i].x === obj.x && this[i].y === obj.y) {
            return i;
        }
    }
    return -1;
};

Array.prototype.removePoint = (point) => {
    this.filter( (pointInArray) => pointInArray.x !== point.x && pointInArray.y !== point.y);
};