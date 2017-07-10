
import './stylesheets/style.scss';

import MazeView from './MazeView';
import LeaderBoardView from './LeaderBoardView';
import UsernamePopupView from './UsernamePopupView';
import MazeService from './MazeService';

var getUrlParameter = function(parameterName) {
    var pageQueryString = window.location.search.substring(1);
    var urlVariables = pageQueryString.split('&');
    for (var i = 0; i < urlVariables.length; i++) 
    {
        var keyValuePair = urlVariables[i].split('=');
        if (keyValuePair[0] === parameterName)
        {
            return keyValuePair[1];
        }
    }
    return null;
};

var generateRandomSeed = function() {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var seed = [];
    for (var i = 0; i < 8; i++) {
        seed.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return seed.join('');
};

var getMazeSeed = function() {
    var urlParamSeed = getUrlParameter("seed");
    if (urlParamSeed === "random") {
        var randomSeed = generateRandomSeed();
        history.replaceState(null, "", "/?seed=" + randomSeed);

        return Promise.resolve(randomSeed);
    } else if (urlParamSeed !== null) {
        return Promise.resolve(urlParamSeed);
    } else {
        var mazeService = new MazeService();
        return mazeService.getDailySeed();
    }

    var xhr = new XMLHttpRequest();
    var url = 'http://localhost:3000/maze';
    xhr.responseType = 'json';
    xhr.open("GET", url, true);

    return XhrPromise(xhr)
        .then(function(response) {
            var seed = Math.random();
            return Promise.resolve(seed);
            // return Promise.resolve(response.seed);
        });
};

var initView = function(seed) {
    var mazeView = new MazeView('maze_container', seed);
    var leaderboard = new LeaderBoardView(seed, mazeView.maze.tileset.colors.groundNatural);
    var usernamePopup = new UsernamePopupView(mazeView.maze.tileset.colors.groundNatural);

    mazeView.submitBtn.addEventListener("click", function() {
        usernamePopup.show();
    });

    mazeView.resetBtn.addEventListener("click", function() {
        mazeView.resetMaze();
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

window.onload = function() {
    getMazeSeed()
        .catch(function(error) {
            alert("Something went wrong! You can play locally, but score submission might not work. Error details: " + error);
            return Promise.resolve(Math.random());
        }).then(initView);
};
