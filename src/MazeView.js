import anime from 'animejs';

import Maze from '../shared/Maze';
import Point from '../shared/Point';
import Score from '../shared/Score';

import SvgPathDrawer from './SvgPathDrawer';
import MazeService from './MazeService';

export default function MazeView(id, seed) {
    this.seed = seed;
    this.mazeService = new MazeService();

    this.maze = new Maze(this.seed);
    this.baseMaze = new Maze(this.seed);

    this.scoreCalculator = new Score(this.baseMaze);

    this.tileElements = [];
    this.contentContainer = document.getElementById('content');
    this.element = document.getElementById(id);
    this.submitBtn = document.getElementById('submit-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.traceBtn = document.getElementById('trace-btn');
    this.helpBtn = document.getElementById('help-btn');

    this.initializeViewInformation();

    this.generateTileElements();
    this.svgPathDrawer = new SvgPathDrawer(this.element.getBoundingClientRect(),
        this.maze.waypoints.length - 1,
        this.maze.tileset.pathColors);
    this.element.appendChild(this.svgPathDrawer.getElement());

    this.setTileSize();
    //this.setContentSize();
    this.redrawAll();

    window.addEventListener('resize', function() {
        // reset tile size every time the window resizes
        this.setTileSize();
        this.setContentSize();
        // Redraw the SVG path every time the window resizes
        this.drawPath(this.lastPath);
    }.bind(this));

    this.traceBtn.addEventListener("click", function() {
        this.togglePathDrawingMode();
    }.bind(this));

    this.svgPathDrawer.introAnimation();
}

MazeView.prototype.resetMaze = function(diffPoints) {
    this.maze = new Maze(this.seed);

    if (diffPoints) {
        for (let i = 0; i < diffPoints.length; i++) {
            this.maze.doActionOnTile(diffPoints[i]);
        }
    }

    this.redrawAll();
    this.updateScore(this.scoreCalculator.calculateScore(this.maze));
    this.updateActionsUsed();
};

MazeView.prototype.redrawAll = function() {
    for (let y = 0; y < this.tileElements.length; y++) {
        for (let x = 0; x < this.tileElements[y].length; x++) {
            this.setupTile(new Point(x, y));
        }
    }

    this.lastPath = this.maze.findPath();
    this.drawPath(this.lastPath);
};

MazeView.prototype.generateTileElements = function() {
    for (let y = 0; y < this.maze.maze.length; y++) {
        const rowContainer = document.createElement('div');
        rowContainer.className = "tile_container";

        this.tileElements.push([]);

        for (let x = 0; x < this.maze.maze[y].length; x++) {
            const point = new Point(x, y);

            const tileWrapper = document.createElement('div');
            tileWrapper.className = "tile_wrapper";

            const tileElement = document.createElement('div');
            tileElement.className = "tile";

            const tileOverlay = document.createElement('div');
            tileOverlay.className = "tile_tint_overlay";

            const tileTextElement = document.createElement('div');
            tileTextElement.className = "tile_text absolute_center";

            (function(self, point) {
                const pointCapture = point.copy();
                tileOverlay.addEventListener("mousedown", function(mouseEvent) {
                    self.tileClicked(mouseEvent, pointCapture);
                });
            })(this, point);

            tileWrapper.appendChild(tileElement);
            tileWrapper.appendChild(tileOverlay);
            tileWrapper.appendChild(tileTextElement);
            rowContainer.appendChild(tileWrapper);

            this.tileElements[y].push(tileWrapper);
        }

        this.element.appendChild(rowContainer);
    }
};

MazeView.prototype.applyPaletteBackground = function() {
    const buttons = document.querySelectorAll('.default-background');
    buttons.forEach( (buttonElement) => buttonElement.style.backgroundColor = this.maze.tileset.colors.groundNatural )
};

MazeView.prototype.setContentSize = function() {
    const headerHeight = document.getElementById('resource-container').offsetHeight;
    let footerHeight = document.getElementById('bottom-container').offsetHeight;
    const yDimension = ( window.innerHeight - headerHeight - footerHeight - 70) / this.maze.ysize;
    const xDimension = ( window.innerWidth - 20 ) / this.maze.xsize;

    const tileDimension = xDimension > yDimension ? yDimension : xDimension;
    const contentWidth = tileDimension * this.maze.xsize;

    this.contentContainer.style.width = contentWidth;
};

MazeView.prototype.setTileSize = function() {

    const headerHeight = document.getElementById('resource-container').offsetHeight;
    let footerHeight = document.getElementById('bottom-container').offsetHeight;

    const yDimension = ( window.innerHeight - headerHeight - footerHeight - 70) / this.maze.ysize;
    const xDimension = ( window.innerWidth - 20 ) / this.maze.xsize;
    // console.log('x: ' + xDimension);
    // console.log('y: ' + yDimension);

    const tileDimension = xDimension > yDimension ? yDimension : xDimension;

    const tiles = document.querySelectorAll('.tile_wrapper');

    for (let i = 0; i< tiles.length; i++) {
        tiles[i].style.height = tileDimension + 'px';
        tiles[i].style.width = tileDimension + 'px';
    }
};

MazeView.prototype.setupTile = function(point) {
    const mazeTile = this.maze.maze[point.y][point.x];
    const tileWrapper = this.tileElements[point.y][point.x];
    const tileElement = tileWrapper.querySelector('.tile');

    // check type of tile
    // set tile style based on type
    const waypointIndex = this.maze.waypoints.indexOfPoint(point);
    if (waypointIndex >= 0) {
        const tileTextElement = tileWrapper.querySelector('.tile_text');

        let text = "";
        let size = "";
        if (waypointIndex === 0) {
            text = "S";
            size = '1.4em'
        } else if (waypointIndex === this.maze.waypoints.length - 1) {
            text = "E";
            size = '1.4em';
        } else {
            text = "" + waypointIndex;
            size = '1.1em';
        }

        // if it is, then set text on it
        tileTextElement.innerHTML = text;
        tileTextElement.style.fontSize = size;
        tileWrapper.appendChild(tileTextElement);

        // set background color and style
        tileWrapper.style.backgroundColor = this.maze.tileset.colors.groundNatural;
        tileWrapper.className = "tile_wrapper";
        tileElement.className = "tile tile_waypoint";
    }
    // tile is blocked
    else if (!mazeTile.isPassable()) {
        tileWrapper.style.backgroundColor = this.maze.tileset.colors.groundNatural;
        tileWrapper.className = "tile_wrapper";
        if (mazeTile.userPlaced) {
            tileElement.style.backgroundColor = this.maze.tileset.colors.blockerUser;
            tileElement.className = "tile tile_unwalkable_user";
        } else {
            tileElement.style.backgroundColor = this.maze.tileset.colors.blockerNatural;
            tileElement.className = "tile tile_unwalkable_natural";
        }
    }
    // tile is not blocked
    else {
        if (mazeTile.userPlaced) {
            tileWrapper.style.backgroundColor = this.maze.tileset.colors.groundUser;
            tileWrapper.className = "tile_wrapper";
            tileElement.className = "tile tile_walkable_user";
        } else {
            tileWrapper.style.backgroundColor = this.maze.tileset.colors.groundNatural;
            tileWrapper.className = "tile_wrapper";
            tileElement.className = "tile tile_walkable_natural";
        }
    }

    // visualize bonus scoring zones

    function shadeBlend(p,c0,c1) {
        const n=p<0?p*-1:p,u=Math.round,w=parseInt;
        if(c0.length>7){
            const f=c0.split(","),t=(c1?c1:p<0?"rgb(0,0,0)":"rgb(255,255,255)").split(","),R=w(f[0].slice(4)),G=w(f[1]),B=w(f[2]);
            return "rgb("+(u((w(t[0].slice(4))-R)*n)+R)+","+(u((w(t[1])-G)*n)+G)+","+(u((w(t[2])-B)*n)+B)+")"
        }else{
            const f=w(c0.slice(1),16),t=w((c1?c1:p<0?"#000000":"#FFFFFF").slice(1),16),R1=f>>16,G1=f>>8&0x00FF,B1=f&0x0000FF;
            return "#"+(0x1000000+(u(((t>>16)-R1)*n)+R1)*0x10000+(u(((t>>8&0x00FF)-G1)*n)+G1)*0x100+(u(((t&0x0000FF)-B1)*n)+B1)).toString(16).slice(1)
        }
    }

    if (this.maze.getScoreMod(point) > 1) {
        // blend whatever background color it already has with red - higher multiplier means more red blended
        tileWrapper.style.backgroundColor = shadeBlend(this.maze.getScoreMod(point) / 10,
            tileWrapper.style.backgroundColor,
            'rgb(255,0,0');

        if (this.maze.isScoreZoneCenter(point)) {
            const tileTextElement = tileWrapper.querySelector('.tile_text');
            tileTextElement.innerHTML = this.maze.getScoreMod(point) + 'X';
            tileTextElement.style.fontSize = '1em';
            tileWrapper.appendChild(tileTextElement);
        }
    }


};

MazeView.prototype.drawPath = function(path) {
    // Translate the tile path into relative screen coords
    const svgPath = [];

    const containerBoundingRect = this.element.getBoundingClientRect();

    for (let i = 0; i < path.length; i++) {
        const svgSegment = [];

        for (let j = 0; j < path[i].length; j++) {
            const point = path[i][j];

            const tileElement = this.tileElements[point.y][point.x];
            const boundingRect = tileElement.getBoundingClientRect();

            const center = new Point(boundingRect.left + boundingRect.width / 2.0,
                boundingRect.top + boundingRect.height / 2.0);
            center.x -= containerBoundingRect.left;
            center.y -= containerBoundingRect.top;

            svgSegment.push(center);
        }

        svgPath.push(svgSegment);
    }

    this.svgPathDrawer.drawPath(svgPath);
};

// Renders the G-values of the specified index of pathfinder run,
// where 0 is most recent
MazeView.prototype.debug_showGTrackers = function(i) {
    console.log(this.maze.pathfinder.lastGTracker);
    if (this.maze.pathfinder.lastGTracker[i] === null) {
        return;
    }

    for (let y = 0; y < this.tileElements.length; y++) {
        for (let x = 0; x < this.tileElements[y].length; x++) {
            this.tileElements[y][x].querySelector('.tile_text').innerHTML = this.maze.pathfinder.lastGTracker[i][y][x];
        }
    }
};

MazeView.prototype.tileClicked = function(mouseEvent, point) {
    if (!this.maze.doActionOnTile(point)) {
        return;
    }

    // If the path is blocked at any point, do not allow the user to place the tile
    const path = this.maze.findPath();
    const invalidPathSegmentIndex = this.findInvalidPathSegmentIndex(path);
    if (invalidPathSegmentIndex >= 0) {
        // Undo and flash blocked path
        this.svgPathDrawer.flashInvalidPathSegment(invalidPathSegmentIndex);
        this.maze.doActionOnTile(point);
        return;
    }

    // The action has taken place
    this.updateActionsUsed();

    // Modify the actual maze view to reflect the changes
    this.setupTile(point);

    // Get the new score
    this.updateScore(this.scoreCalculator.calculateScore(this.maze));

    // Only redraw the path if the new path is different
    if (this.pathsDiffer(path, this.lastPath)) {
        this.drawPath(path);
    }
    this.lastPath = path;
};

MazeView.prototype.findInvalidPathSegmentIndex = function(path) {
    for (let i = 0; i < path.length; i++) {
        if (path[i].length === 0) {
            return i;
        }
    }

    return -1;
};

MazeView.prototype.pathsDiffer = function(pathA, pathB) {
    if (pathA.length !== pathB.length) {
        return true;
    }

    for (let i = 0; i < pathA.length; i++) {
        if (pathA[i].length !== pathB[i].length) {
            return true;
        }

        for (let j = 0; j < pathA[i].length; j++) {
            if (pathA[i][j].x !== pathB[i][j].x || pathA[i][j].y !== pathB[i][j].y) {
                return true;
            }
        }
    }

    return false;
};

MazeView.prototype.toggleHelp = function() {
    let displayStyle = document.getElementById('help-container').style.display;
    displayStyle = displayStyle !== 'block'? 'block' : 'none';
    document.getElementById('help-container').style.display = displayStyle;
};

MazeView.prototype.updateActionsUsed = function() {
    document.getElementById('action-counter').innerHTML = (this.maze.actionPoints - this.maze.actionsUsed) +
        '/' + this.maze.actionPoints;
};

MazeView.prototype.updateScore = function (score) {
    const scoreCounter = document.getElementById('current-score');
    const currentScore = scoreCounter.innerHTML;

    const myObject = {
        score: currentScore,
    };

    const JSobjectProp = anime({
        targets: myObject,
        score: score,
        easing: 'easeInOutQuad',
        round: 1,
        duration: 300,
        update: () => scoreCounter.innerHTML = myObject.score
    });
};

MazeView.prototype.initializeViewInformation = function () {
    this.updateTopScore();
    setInterval(() => this.updateTopScore(), 30000);
    document.getElementById('help-action-points').innerHTML = this.maze.actionPoints;
    document.getElementById('current-score').innerHTML = '0';
    document.getElementById('action-counter').innerHTML = this.maze.actionPoints + '/' + this.maze.actionPoints;
    document.getElementById('help-removal-cost').innerHTML = this.maze.removalCost;
    document.getElementById('removal-cost').innerHTML = 'Cost to remove a blocker: '
        + this.maze.removalCost + ' AP';
    this.applyPaletteBackground();
};

MazeView.prototype.submitSolution = function(name) {
    // generate user actions to recreate the current maze
    const diffPoints = this.baseMaze.getUserChanges(this.maze);
    return this.mazeService.submitSolution(this.maze.seed, name, diffPoints);
};

MazeView.prototype.updateTopScore = function() {
    this.mazeService.getScores(this.seed, 0, 1)
        .then( (scoreArray) => {
            let score;
            if (scoreArray[0]) {
                score = scoreArray[0].score;
            } else {
                score = '0';
            }
            document.getElementById('top-score').innerHTML = score;
        })
};

MazeView.prototype.togglePathDrawingMode = function() {
    let pathMode = this.svgPathDrawer.pathDrawingMode;
    pathMode = (pathMode+1)%SvgPathDrawer.PathDrawingMode.Count;
    this.svgPathDrawer.setMode(pathMode);

    const nextPathMode = (pathMode + 1) % SvgPathDrawer.PathDrawingMode.Count;
    this.traceBtn.innerHTML = SvgPathDrawer.PathDrawingMode.toString(nextPathMode);
};

MazeView.prototype.displaySolution = function(diffPoints) {
    this.resetMaze(diffPoints);
};
