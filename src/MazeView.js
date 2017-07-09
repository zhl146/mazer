import anime from 'animejs';

import Maze from './shared/Maze';
import Tile from './shared/Tile';
import Point from './shared/Point';
import Score from './shared/Score';

import SvgPathDrawer from './SvgPathDrawer';
import MazeService from './MazeService';

export default function MazeView(id, seed) {
    this.seed = seed;
    console.log("SEED: " + this.seed);

    this.maze = new Maze(this.seed);
    this.baseMaze = new Maze(this.seed);

    this.scoreCalculator = new Score(this.baseMaze);

    this.tileElements = [];
    this.element = document.getElementById(id);
    this.submitBtn = document.getElementById('submit-btn');
    this.resetBtn = document.getElementById('reset-btn');
    this.traceBtn = document.getElementById('trace-btn');

    this.initializeViewInformation();

    this.generateTileElements();
    this.svgPathDrawer = new SvgPathDrawer(this.element.getBoundingClientRect(), this.maze.waypoints.length - 1);
    this.element.appendChild(this.svgPathDrawer.getElement());

    this.redrawAll();

    window.addEventListener('resize', function() {
        // Redraw the SVG path every time the window resizes
        this.drawPath(self.lastPath);
    }.bind(this));

    this.traceBtn.addEventListener("click", function() {
        this.togglePathDrawingMode();
    }.bind(this));

    this.svgPathDrawer.introAnimation();
}

MazeView.prototype.resetMaze = function() {
    this.maze = new Maze(this.seed);
    this.redrawAll();
    this.updateScore(0);
}

MazeView.prototype.redrawAll = function() {
    for (var y = 0; y < this.tileElements.length; y++) {
        for (var x = 0; x < this.tileElements[y].length; x++) {
            this.setupTile(new Point(x, y));
        }
    }

    this.lastPath = this.maze.findPath();
    this.drawPath(this.lastPath);
};

MazeView.prototype.generateTileElements = function() {
    for (var y = 0; y < this.maze.maze.length; y++) {
        var rowContainer = document.createElement('div');
        rowContainer.className = "tile_container";

        this.tileElements.push([]);

        for (var x = 0; x < this.maze.maze[y].length; x++) {
            var point = new Point(x,y);

            var tileWrapper = document.createElement('div');
            tileWrapper.className = "tile_wrapper";

            var tileElement = document.createElement('div');
            tileElement.className = "tile";

            var tileOverlay = document.createElement('div');
            tileOverlay.className = "tile_tint_overlay";

            var tileTextElement = document.createElement('div');
            tileTextElement.className = "tile_text absolute_center";

            (function(self, point) {
                var pointCapture = point.copy();
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

MazeView.prototype.styleBtns = function() {
    var buttons = document.querySelectorAll('.maze-btn');
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].style.backgroundColor = this.maze.tileset.colors.groundNatural;
    }
};

MazeView.prototype.setupTile = function(point) {
    var mazeTile = this.maze.maze[point.y][point.x];
    var tileWrapper = this.tileElements[point.y][point.x];

    var waypointIndex = this.maze.waypoints.indexOfPoint(point);
    if (waypointIndex >= 0) {
        var tileTextElement = tileWrapper.querySelector('.tile_text');

        var text = "";
        if (waypointIndex === 0) {
            text = "S";
        } else if (waypointIndex === this.maze.waypoints.length - 1) {
            text = "E";
        } else {
            text = "" + waypointIndex;
        }

        tileTextElement.innerHTML = text;
        tileWrapper.appendChild(tileTextElement);
    }

    var tileElement = tileWrapper.querySelector('.tile');
    if (waypointIndex >= 0) {
        tileWrapper.style.backgroundColor = this.maze.tileset.colors.groundNatural;
        tileWrapper.className = "tile_wrapper";
        tileElement.className = "tile tile_waypoint";
    } else if (!mazeTile.isPassable()) {
        tileWrapper.style.backgroundColor = this.maze.tileset.colors.groundNatural;
        tileWrapper.className = "tile_wrapper";
        if (mazeTile.userPlaced) {
            tileElement.style.backgroundColor = this.maze.tileset.colors.blockerUser;
            tileElement.className = "tile tile_unwalkable_user";
        } else {
            tileElement.style.backgroundColor = this.maze.tileset.colors.blockerNatural;
            tileElement.className = "tile tile_unwalkable_natural";
        }
    } else {
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
};

MazeView.prototype.drawPath = function(path) {
    // Translate the tile path into relative screen coords
    var svgPath = [];

    var containerBoundingRect = this.element.getBoundingClientRect();

    for (var i = 0; i < path.length; i++) {
        var svgSegment = [];

        for (var j = 0; j < path[i].length; j++) {
            var point = path[i][j];

            var tileElement = this.tileElements[point.y][point.x];
            var boundingRect = tileElement.getBoundingClientRect();

            var center = new Point(boundingRect.left + boundingRect.width / 2.0,
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

    for (var y = 0; y < this.tileElements.length; y++) {
        for (var x = 0; x < this.tileElements[y].length; x++) {
            this.tileElements[y][x].querySelector('.tile_text').innerHTML = this.maze.pathfinder.lastGTracker[i][y][x];
        }
    }
};

MazeView.prototype.tileClicked = function(mouseEvent, point) {
    if (!this.maze.doActionOnTile(point)) {
        return;
    }

    // If the path is blocked at any point, do not allow the user to place the tile
    var path = this.maze.findPath();
    var invalidPathSegmentIndex = this.findInvalidPathSegmentIndex(path);
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
    for (var i = 0; i < path.length; i++) {
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

    for (var i = 0; i < pathA.length; i++) {
        if (pathA[i].length !== pathB[i].length) {
            return true;
        }

        for (var j = 0; j < pathA[i].length; j++) {
            if (pathA[i][j].x !== pathB[i][j].x || pathA[i][j].y !== pathB[i][j].y) {
                return true;
            }
        }
    }

    return false;
};

MazeView.prototype.updateActionsUsed = function() {
    var actionString = 'actions left: ' + (this.maze.actionPoints - this.maze.actionsUsed) + '/' + this.maze.actionPoints;
    document.getElementById('action-counter').innerHTML = actionString;
};

MazeView.prototype.updateScore = function (score) {
    var scoreCounter = document.getElementById('current-score');
    var currentScore = scoreCounter.innerHTML;

    var myObject = {
        score: currentScore,
    };

    var JSobjectProp = anime({
        targets: myObject,
        score: score,
        easing: 'easeInOutQuad',
        round: 1,
        update: function() {
            scoreCounter.innerHTML = myObject.score;
        }
    });
};

MazeView.prototype.initializeViewInformation = function () {
    document.getElementById('current-score').innerHTML = '0';
    document.getElementById('action-counter').innerHTML = 'actions left: '
        + this.maze.actionPoints + '/' + this.maze.actionPoints;
    document.getElementById('removal-cost').innerHTML = 'Cost to remove a blocker: '
        + this.maze.removalCost + ' AP';
    this.styleBtns();
};

MazeView.prototype.submitSolution = function(name) {
    // generate user actions to recreate the current maze
    var diffPoints = this.baseMaze.getUserChanges(this.maze);
    var mazeService = new MazeService();

    return mazeService.submitSolution(this.maze.seed, name, diffPoints);
};

MazeView.prototype.togglePathDrawingMode = function() {
    var pathMode = this.svgPathDrawer.pathDrawingMode;
    pathMode = (pathMode+1)%SvgPathDrawer.PathDrawingMode.Count;
    this.svgPathDrawer.setMode(pathMode);

    var nextPathMode = (pathMode+1)%SvgPathDrawer.PathDrawingMode.Count;
    console.log(nextPathMode);
    this.traceBtn.innerHTML = SvgPathDrawer.PathDrawingMode.toString(nextPathMode);
}
