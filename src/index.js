
import './stylesheets/style.scss';

import Point from './shared/Point';
import Pathfinder from './shared/Pathfinder';

import MazeView from './MazeView';
import LeaderBoardView from './LeaderBoardView';
import UsernamePopupView from './UsernamePopupView';

var xhr = new XMLHttpRequest();
// this is the maze seed url
var url = 'http://localhost:3000/maze';
xhr.open("GET", url, true);

var mazeView = null;
var leaderboard = null;
var usernamePopup = new UsernamePopupView();

var seed = null;

xhr.onreadystatechange = function() {
    if (xhr.readyState === 4 && xhr.status === 200) {
        seed = JSON.parse(xhr.responseText).seed;
        initView(seed);
    }
};

xhr.send(null);


var initView = function(seed) {
    mazeView = new MazeView('maze_container', seed);
    leaderboard = new LeaderBoardView(seed);

    var submitBtn = document.getElementById('submit-btn');
    submitBtn.addEventListener("click", function() {
        usernamePopup.show();
    });

    usernamePopup.submitBtn.addEventListener("click", function() {
        usernamePopup.hide();
        mazeView.submitSolution(usernamePopup.input.value);
        leaderboard.show();
    });

};