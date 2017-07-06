import Path from 'svg-path-generator';
import anime from 'animejs';

import Maze from './shared/Maze';
import Tile from './shared/Tile';
import Point from './shared/Point';

export default function MazeView(id) {
    var seed = 0.6195641405638261 //Math.random();
    console.log("SEED: " + seed);

    this.maze = new Maze(Math.random());
    this.tileElements = [];
    this.element = document.getElementById(id);

    this.displayMaze();

    this.pathSvgView = new PathSvgView(this.element.getBoundingClientRect());
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

MazeView.prototype.displaySvgPathForTilePath = function(path) {
    // Translate the tile path into relative coords
    var svgPath = [];

    var containerBoundingRect = this.element.getBoundingClientRect();

    for (var i = 0; i < path.length; i++) {
        var point = path[i];

        var tileElement = this.tileElements[point.y][point.x];
        var boundingRect = tileElement.getBoundingClientRect();

        var center = new Point(boundingRect.left + boundingRect.width / 2.0,
                                boundingRect.top + boundingRect.height / 2.0);
        center.x -= containerBoundingRect.left;
        center.y -= containerBoundingRect.top;

        svgPath.push(center);
    }

    this.pathSvgView.drawPath(svgPath);
}

function PathSvgView(containerBoundingRect) {
    var svgElement = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
    svgElement.setAttribute('class', "path-container");
    svgElement.setAttribute('width', containerBoundingRect.width);
    svgElement.setAttribute('height', containerBoundingRect.height);

    var innerElement = document.createElementNS("http://www.w3.org/2000/svg", 'g');
    innerElement.setAttribute('class', 'svg-paths');
    svgElement.appendChild(innerElement);

    var pathElement = document.createElementNS("http://www.w3.org/2000/svg", 'path');
    innerElement.appendChild(pathElement);

    this.svgElement = svgElement;
}

PathSvgView.prototype.drawPath = function(path) {
    var svgPath = [];

    for (var i = 0; i < path.length; i++) {
        svgPath.push(path[i].x + " " + path[i].y);
    }

    var pathString = svgPath.join(" L");
    pathString = "M" + pathString

    this.animateSvg(pathString);
}

PathSvgView.prototype.animateSvg = function(pathSvgString) {
    this.svgElement.querySelector('path').setAttribute('d', pathSvgString);

    var lineDrawing = anime({
        targets: '.path-container path',
        strokeDashoffset: [anime.setDashoffset, 0],
        easing: 'easeInOutSine',
        duration: 1000,
    });
}

PathSvgView.prototype.getElement = function() {
    return this.svgElement;
}
