import './stylesheets/style.scss';

import Maze from './shared/Maze';
import Tile from './shared/Tile';
import Pathfinder from './shared/Pathfinder';

function displayMaze() {
    var maze = new Maze(0);
    var path = new Pathfinder(maze);

    console.log(path.findPath(maze.start, maze.end));

    var element = document.getElementById('maze_container');

    for (var y = 0; y < maze.maze.length; y++) {
        var rowContainer = document.createElement('div');
        rowContainer.className = "tile_container";
        for (var x = 0; x < maze.maze.length; x++) {
            var tileWrapper = document.createElement('div');
            tileWrapper.className = "tile_wrapper";

            var tileElement = document.createElement('div');
            if (maze.maze[y][x].type == Tile.Type.Walkable) {
                tileElement.className = "tile tile_walkable";
            } else {
                tileElement.className = "tile tile_unwalkable";
            }

            tileWrapper.appendChild(tileElement);
            rowContainer.appendChild(tileWrapper);
        }

        element.appendChild(rowContainer);
    }
}

displayMaze();

