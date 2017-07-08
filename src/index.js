
import './stylesheets/style.scss';

import Point from './shared/Point';
import Pathfinder from './shared/Pathfinder';

import MazeView from './MazeView';
import LeaderBoardView from './LeaderBoardView';
import UsernamePopupView from './UsernamePopupView';
import XhrPromise from './XhrPromise';

var getMazeSeed = function() {
    var xhr = new XMLHttpRequest();
    var url = 'http://localhost:3000/maze';
    xhr.responseType = 'json';
    xhr.open("GET", url, true);

    return new XhrPromise(xhr)
        .then(function(response) {
            return Promise.resolve(response.seed);
        });
};

var initView = function(seed) {
    var mazeView = new MazeView('maze_container', seed);
    var leaderboard = new LeaderBoardView(seed);
    var usernamePopup = new UsernamePopupView(seed);

    mazeView.submitBtn.addEventListener("click", function() {
        usernamePopup.show();
    });

    usernamePopup.submitBtn.addEventListener("click", function() {
        mazeView.submitSolution(usernamePopup.input.value)
            .then(
                function(rank) {
                    usernamePopup.hide();
                    leaderboard.fillScores(rank);
                    leaderboard.show();
                }
            )
    });
};

getMazeSeed().then(initView);
