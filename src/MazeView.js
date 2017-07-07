import anime from 'animejs';

import Maze from './shared/Maze';
import Tile from './shared/Tile';
import Point from './shared/Point';

const colors = ['#849483', '#4e937a', '#b4656f', '#948392', '#c7f2a7'];

export default function MazeView(id) {
    var seed = Math.random();
    console.log("SEED: " + seed);

    this.maze = new Maze(seed);
    this.tileElements = [];
    this.element = document.getElementById(id);

    this.setupMaze();

    this.pathSvgView = new PathSvgView(this.element.getBoundingClientRect(), this.maze.waypoints.length - 1);
    this.element.appendChild(this.pathSvgView.getElement());

    this.drawPath();
}

MazeView.prototype.setupMaze = function() {
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

    for (var y = 0; y < this.maze.maze.length; y++) {
        for (var x = 0; x < this.maze.maze[y].length; x++) {
            this.setupTile(new Point(x, y));
        }
    }
}

MazeView.prototype.setupTile = function(point) {
    var mazeTile = this.maze.maze[point.y][point.x];
    var tileWrapper = this.tileElements[point.y][point.x];

    var waypointIndex = this.maze.waypoints.indexOfPoint(point);
    if (waypointIndex >= 0) {
        var tileTextElement = tileWrapper.querySelector('.tile_text');

        var text = "";
        if (waypointIndex == 0) {
            text = "S";
        } else if (waypointIndex == this.maze.waypoints.length - 1) {
            text = "E";
        } else {
            text = "" + waypointIndex;
        }

        tileTextElement.innerHTML = text;
        tileWrapper.appendChild(tileTextElement);
    }

    var tileElement = tileWrapper.querySelector('.tile');
    if (waypointIndex >= 0) {
        tileWrapper.className = "tile_wrapper tile_color_natural";
        tileElement.className = "tile tile_waypoint";
    } else if (!mazeTile.isPassable()) {
        if (mazeTile.userPlaced) {
            tileWrapper.className = "tile_wrapper tile_color_natural";
            tileElement.className = "tile tile_unwalkable_user";
        } else {
            tileWrapper.className = "tile_wrapper tile_color_natural";
            tileElement.className = "tile tile_unwalkable_natural";
        }
    } else {
        if (mazeTile.userPlaced) {
            tileWrapper.className = "tile_wrapper tile_color_user";
            tileElement.className = "tile tile_walkable_user";
        } else {
            tileWrapper.className = "tile_wrapper tile_color_natural";
            tileElement.className = "tile tile_walkable_natural";
        }
    }
}

MazeView.prototype.drawPath = function() {
    var path = this.maze.findPath();

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
}

// Renders the G-values of the specified index of pathfinder run,
// where 0 is most recent
MazeView.prototype.debug_showGTrackers = function(i) {
    console.log(this.maze.pathfinder.lastGTracker);
    if (this.maze.pathfinder.lastGTracker[i] == null) {
        return;
    }

    for (var y = 0; y < this.tileElements.length; y++) {
        for (var x = 0; x < this.tileElements[y].length; x++) {
            this.tileElements[y][x].querySelector('.tile_text').innerHTML = this.maze.pathfinder.lastGTracker[i][y][x];
        }
    }
}

MazeView.prototype.tileClicked = function(mouseEvent, point) {
    if (!this.maze.isModifiable(point)) {
        return;
    }

    var tile = this.maze.maze[point.y][point.x];
    tile.userPlaced = !tile.userPlaced;
    tile.type = (tile.type == Tile.Type.Empty ? Tile.Type.Blocker : Tile.Type.Empty);

    this.setupTile(point);
    this.drawPath();
}

function PathSvgView(containerBoundingRect, segmentCount) {
    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    svgElement.setAttribute('class', "path-container");
    svgElement.setAttribute('width', containerBoundingRect.width);
    svgElement.setAttribute('height', containerBoundingRect.height);

    var innerElement = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    innerElement.setAttribute('class', 'svg-paths');
    svgElement.appendChild(innerElement);

    var pathElements = [];
    for (var i = 0; i < segmentCount; i++) {
        var pathElement = document.createElementNS("http://www.w3.org/2000/svg", 'path');
        pathElement.setAttribute('stroke', colors[i%colors.length]);

        innerElement.appendChild(pathElement);

        pathElements.push(pathElement);
    }

    this.pathElements = pathElements;
    this.svgElement = svgElement;

    this.currentAnimation = null;
}

PathSvgView.prototype.drawPath = function(path) {
    // If any segment is empty, empty all segments and do nothing
    var haveEmptySegment = false;
    for (var i = 0; i < path.length; i++) {
        if (path[i].length == 0) {
            haveEmptySegment = true;
            break;
        }
    }

    if (haveEmptySegment) {
        for (var i = 0; i < path.length; i++) {
            this.pathElements[i].setAttribute('d', "");
        }
        return;
    }

    // If all segments are unempty, continue and draw all paths
    for (var i = 0; i < path.length; i++) {
        var svgSegment = [];

        for (var j = 0; j < path[i].length; j++) {
            svgSegment.push(path[i][j].x + " " + path[i][j].y);
        }

        var pathString = svgSegment.join(" L");
        pathString = "M" + pathString;
        
        this.pathElements[i].setAttribute('d', pathString);
    }

    this.animateSvg();
}

PathSvgView.prototype.animateSvg = function() {
    var lineTimeline = anime.timeline();

    if (this.currentAnimation != null) {
        this.currentAnimation.pause();
    }

    for (var i = 0; i < this.pathElements.length; i++) {
        var easing = null;
        if (i === 0) {
            easing = 'easeInSine';
        } else if (i === this.pathElements.length-1) {
            easing = 'easeOutSine';
        } else {
            easing = 'linear';
        }

        var self = this;
        (function() {
            var pathElement = self.pathElements[i];
            var duration = Math.min(10*pathElement.getAttribute('d').length, 2000);
            pathElement.setAttribute('visibility', 'hidden');
            lineTimeline.add({
                targets: pathElement,
                strokeDashoffset: [anime.setDashoffset, 0],
                easing: easing,
                duration: duration,
                begin: function(anim) {
                    pathElement.setAttribute('visibility', 'auto');
                }
            });
        })();
    }

    this.currentAnimation = lineTimeline;
}

PathSvgView.prototype.getElement = function() {
    return this.svgElement;
}
