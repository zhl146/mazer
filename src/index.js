
import './stylesheets/style.scss';

import MazeView from './MazeView';
import LeaderBoardView from './LeaderBoardView';
import UsernamePopupView from './UsernamePopupView';
import MazeService from './MazeService';

const getUrlParameter = function ( parameterName ) {
    const pageQueryString = window.location.search.substring(1);
    const urlVariables = pageQueryString.split('&');
    for (let i = 0; i < urlVariables.length; i ++) {
        const keyValuePair = urlVariables[i].split('=');
        if (keyValuePair[0] === parameterName) {
            return keyValuePair[1];
        }
    }
    return null;
};

const generateRandomSeed = function () {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const seed = [];
    for (let i = 0; i < 8; i ++) {
        seed.push(chars[Math.floor(Math.random() * chars.length)]);
    }
    return seed.join('');
};

const getMazeSeed = function () {
    const urlParamSeed = getUrlParameter("seed");
    if (urlParamSeed === "random") {
        const loc = window.location.pathname;
        const dir = loc.substring(0, loc.lastIndexOf('/'));
        const randomSeed = generateRandomSeed();

        history.replaceState(null, "", dir + "/?seed=" + randomSeed);

        return Promise.resolve(randomSeed);
    } else if (urlParamSeed !== null) {
        return Promise.resolve(urlParamSeed);
    } else {
        const mazeService = new MazeService();
        return mazeService.getDailySeed();
    }
};

const initView = function ( seed ) {
    const mazeView = new MazeView('maze_container', seed);
    const leaderboard = new LeaderBoardView(seed, mazeView.maze.tileset.colors.groundNatural, mazeView);
    const usernamePopup = new UsernamePopupView(mazeView.maze.tileset.colors.groundNatural);

    mazeView.submitBtn.addEventListener("click", function () {
        usernamePopup.show();
    });

    mazeView.resetBtn.addEventListener("click", function () {
        mazeView.resetMaze();
    });

    mazeView.helpBtn.addEventListener("click", function () {
        mazeView.toggleHelp();
    });

    usernamePopup.submitBtn.addEventListener("click", function () {
        mazeView.submitSolution(usernamePopup.input.value)
            .then(
                ( rank ) => {
                    mazeView.updateTopScore();
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
