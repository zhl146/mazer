
import './stylesheets/style.scss';

import Point from './shared/Point';
import Pathfinder from './shared/Pathfinder';

import MazeView from './MazeView';
import LeaderBoardView from './LeaderBoardView';

var view = new MazeView('maze_container');
var leaderboard = new LeaderBoardView();

var submitBtn = document.getElementById('submit-btn');
submitBtn.addEventListener("click", function() {
    view.submitSolution();
    leaderboard.show();
});
