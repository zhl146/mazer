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

    this.displayMaze();

    this.pathSvgView = new PathSvgView(this.element.getBoundingClientRect(), this.maze.waypoints.length - 1);
    this.element.appendChild(this.pathSvgView.getElement());
}

MazeView.prototype.displayMaze = function() {
    for (var y = 0; y < this.maze.maze.length; y++) {
        var rowContainer = document.createElement('div');
        rowContainer.className = "tile_container";

        this.tileElements.push([]);

        for (var x = 0; x < this.maze.maze.length; x++) {
            var tileWrapper = document.createElement('div');
            tileWrapper.className = "tile_wrapper";

            var tileElement = document.createElement('div');
            if (this.maze.maze[y][x].type == Tile.Type.Walkable) {
                tileElement.className = "tile tile_walkable";
            } else {
                tileElement.className = "tile tile_unwalkable";
            }

            tileWrapper.appendChild(tileElement);
            rowContainer.appendChild(tileWrapper);

            this.tileElements[y].push(tileWrapper);
        }

        this.element.appendChild(rowContainer);
    }
}

MazeView.prototype.drawPath = function() {
    var path = this.maze.findPath();

    // Translate the tile path into relative coords
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
}

PathSvgView.prototype.drawPath = function(path) {
    for (var i = 0; i < path.length; i++) {
        if (path[i].length == 0) {
            continue;
        }

        var svgSegment = [];

        for (var j = 0; j < path[i].length; j++) {
            svgSegment.push(path[i][j].x + " " + path[i][j].y);
        }

        var pathString = svgSegment.join(" L");
        pathString = "M" + pathString;
        
        this.pathElements[i].setAttribute('d', pathString);
    }

    this.animateSvg(pathString);
}

PathSvgView.prototype.animateSvg = function(pathSvgString) {
    var lineDrawing = anime({
        targets: '.path-container path',
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: 'easeInOutSine',
        duration: 1000,
        delay: function(el, i) { return i * 1000; },
    });
}

PathSvgView.prototype.getElement = function() {
    return this.svgElement;
}
