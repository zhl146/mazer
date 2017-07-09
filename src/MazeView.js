import anime from 'animejs';

import Maze from './shared/Maze';
import Tile from './shared/Tile';
import Point from './shared/Point';
import Score from './shared/Score';

const colors = ['#849483', '#4e937a', '#b4656f', '#948392', '#c7f2a7'];

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
    this.pathSvgView = new PathSvgView(this.element.getBoundingClientRect(), this.maze.waypoints.length - 1);
    this.element.appendChild(this.pathSvgView.getElement());

    this.redrawAll();

    window.addEventListener('resize', function() {
        // Redraw the SVG path every time the window resizes
        this.drawPath(self.lastPath);
    }.bind(this));

    this.pathSvgView.introAnimation();
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

    this.pathSvgView.drawPath(svgPath);
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
        this.pathSvgView.flashInvalidPathSegment(invalidPathSegmentIndex);
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
    document.getElementById('removal-cost').innerHTML = 'Cost to remove a natural blocker: '
        + this.maze.removalCost + ' action points';
    this.styleBtns();
};

MazeView.prototype.submitSolution = function(name) {
    // generate user actions to recreate the current maze
    var diffPoints = this.baseMaze.getUserChanges(this.maze);

    var xhr = new XMLHttpRequest();

    // this is the maze checking URL
    var url = 'http://localhost:3000/maze/check';
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-type", "application/json");
    var solutionComplete = new Promise(
        function(resolve, reject) {
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4 ) {
                    if (xhr.status === 200) {
                        var json = JSON.parse(xhr.responseText);
                        resolve(json.rank);
                    } else {
                        reject();
                    }
                }
            };
        }
    );

    var data = {
        "seed": this.maze.seed,
        "name": name,
        "diffPoints": diffPoints
    };
    xhr.send(JSON.stringify(data));

    return solutionComplete;
};

MazeView.prototype.tracePath = function() {
    this.pathSvgView.tracePath();
}

function PathSvgView(containerBoundingRect, segmentCount) {
    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    svgElement.setAttribute('class', "path-container");
    svgElement.setAttribute('width', '100%');
    svgElement.setAttribute('height', '100%');

    var innerElement = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    innerElement.setAttribute('class', 'svg-paths svg-paths-dashed');
    svgElement.appendChild(innerElement);

    var pathElements = [];
    for (var i = 0; i < segmentCount; i++) {
        var pathElement = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        pathElement.setAttribute('stroke', colors[i%colors.length]);

        innerElement.appendChild(pathElement);

        pathElements.push(pathElement);
    }

    this.graphicsElement = innerElement;
    this.pathElements = pathElements;
    this.svgElement = svgElement;

    this.loopingAnimation = null;
}

PathSvgView.prototype.clear = function() {
    for (var i = 0; i < path.length; i++) {
        this.pathElements[i].setAttribute('d', "");
    }
};

PathSvgView.prototype.drawPath = function(path) {
    for (var i = 0; i < path.length; i++) {
        var svgSegment = [];

        for (var j = 0; j < path[i].length; j++) {
            svgSegment.push(path[i][j].x + " " + path[i][j].y);
        }

        var pathString = svgSegment.join(" L");
        pathString = "M" + pathString;
        
        this.pathElements[i].setAttribute('d', pathString);
    }

    this.startAnimatingDashes();
};

PathSvgView.prototype.startAnimatingDashes = function() {
    if (this.loopingAnimation != null) {
        return;
    }

    var animation = anime({
        targets: this.pathElements,
        strokeDashoffset: [20, 0],
        easing: 'linear',
        duration: 1000,
        loop: true
    });

    this.loopingAnimation = animation;
};

PathSvgView.prototype.tracePath = function(allAtOnce) {
    if (this.loopingAninimation != null) {
        this.loopingAnimation.pause();
        this.loopingAnimation = null;
    }

    var lastPromise = null;
    for (var i = 0; i < this.pathElements.length; i++) {
        (function() {
            var pathElement = this.pathElements[i];
            var duration = Math.min(2*pathElement.getTotalLength(), 2000);

            var easing = null;
            if (i === 0) {
                easing = 'easeInSine';
            } else if (i === this.pathElements.length-1) {
                easing = 'easeOutSine';
            } else {
                easing = 'linear';
            }

            pathElement.classList.add('hidden');
            pathElement.style['stroke-dasharray'] = null;

            function doDrawing() {
                var lineDrawing = anime({
                    targets: pathElement,
                    strokeDashoffset: [anime.setDashoffset, 0],
                    easing: easing,
                    duration: duration,
                    begin: function(anim) {
                        pathElement.classList.remove('hidden');
                    }
                });

                return lineDrawing.finished;
            };

            if (lastPromise === null) {
                lastPromise = doDrawing();
            } else {
                lastPromise = lastPromise.then(doDrawing);
            }
        }).bind(this)();
    }

    lastPromise.then(this.animateToDashed.bind(this)).then(this.startAnimatingDashes.bind(this));
};

PathSvgView.prototype.introAnimation = function() {
    var lineDrawing = anime({
        targets: this.pathElements,
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: 'easeInOutSine',
        duration: 1000,
        delay: function(el, i) { return i * 250 },
    }).finished.then(this.animateToDashed.bind(this))
    .then(this.startAnimatingDashes.bind(this));
}

PathSvgView.prototype.animateToDashed = function() {
    for (var i = 0; i < this.pathElements.length; i++) {
        this.pathElements[i].setAttribute('stroke-dasharray', '20, 0');
        this.pathElements[i].style['stroke-dasharray'] = '20, 0';
    }

    var dashAnimation = anime({
        targets: this.pathElements,
        strokeDasharray: '10, 10',
        easing: 'easeInOutSine',
        duration: 500
    });

    return dashAnimation.finished.then(function(dashAnim) {
        for (var i = 0; i < this.pathElements.length; i++) {
            // Leaving this interferes with animejs, and we get the
            // stroke-dasharray from svg-paths-dashed anyway
            this.pathElements[i].removeAttribute('stroke-dasharray');
            this.pathElements[i].style['stroke-dasharray'] = null;
        }

        return Promise.resolve(dashAnim);
    }.bind(this));
}

PathSvgView.prototype.flashInvalidPathSegment = function(i) {
    if (this.pathElements[i].animation !== undefined &&
            !this.pathElements[i].animation.completed) {
        this.pathElements[i].animation.seek(1.0);
    }

    var animation = anime({
        targets: this.pathElements[i],
        stroke: '#FF0000',
        'stroke-width': 6,
        easing: 'linear',
        loop: 4,
        direction: 'alternate',
        duration: 100,
    });

    this.pathElements[i].animation = animation;
};

PathSvgView.prototype.getElement = function() {
    return this.svgElement;
};
