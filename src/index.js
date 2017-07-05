
import Maze from './shared/Maze';
import Tile from './shared/Tile';

function displayMaze() {
    var maze = new Maze(0);
    maze.generate();

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

