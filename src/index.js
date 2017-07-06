
import './stylesheets/style.scss';

import Point from './shared/Point';

import MazeView from './MazeView';

var view = new MazeView('maze_container');

view.displaySvgPathForTilePath([new Point(0,0),
        new Point(2,1),
        new Point(3,4),
        new Point(0,5),
        new Point(10,6),
        new Point(5,16),
        new Point(19,19)]);

window.setTimeout(function() {
    view.displaySvgPathForTilePath([new Point(0,0),
            new Point(2,1),
            new Point(3,4),
            new Point(0,5),
            new Point(1,18),
            new Point(5,16),
            new Point(19,19)]);
}, 2000);
