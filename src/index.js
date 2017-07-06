
import './stylesheets/style.scss';

import Point from './shared/Point';
import Pathfinder from './shared/Pathfinder';

import MazeView from './MazeView';

var view = new MazeView('maze_container');

var pathfinder = new Pathfinder(view.maze);

view.displaySvgPathForTilePath(pathfinder.findPath(view.maze.start, view.maze.end));
