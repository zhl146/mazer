
import './stylesheets/style.scss';

import Point from './shared/Point';
import Pathfinder from './shared/Pathfinder';

import MazeView from './MazeView';
import LeaderBoardView from './LeaderBoardView';

var xhr = new XMLHttpRequest();
// this is the maze seed url
var url = 'http://localhost:3000/maze';
xhr.open("GET", url, true);

xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
        var view = new MazeView('maze_container', JSON.parse(xhr.responseText).seed);
    }
}.bind(this);

xhr.send(null);


var leaderboard = new LeaderBoardView();

var submitBtn = document.getElementById('submit-btn');
submitBtn.addEventListener("click", function() {
    view.submitSolution();
    leaderboard.show();
});
