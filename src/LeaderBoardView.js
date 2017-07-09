
import MazeService from './MazeService';

export default function LeaderBoardView(seed, backgroundColor) {
    this.seed = seed;
    this.backgroundColor = backgroundColor;
    this.leaderBoard = document.getElementById('leaderboard');
    this.initLeaderBoard();
}

LeaderBoardView.prototype.initLeaderBoard = function() {
    var backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', function() {
        this.hide();
    }.bind(this));

    var leaderboardBody = this.leaderBoard.firstElementChild;
    leaderboardBody.style.backgroundColor = this.backgroundColor;

};

LeaderBoardView.prototype.addScoresToLeaderboard = function(topTenScores, closeThreeScores, closeThreeStartRank) {
    this.clear();

    var topTen = document.getElementById('top-scores');
    var closeThree = document.getElementById('closest-scores');

    var makeScore = function(rank, name, score) {
        var scoreContainer = document.createElement('div');
        var rankEl = document.createElement('span');
        var rankText = document.createTextNode(rank);
        rankEl.appendChild(rankText);

        var nameEl = document.createElement('span');
        var nameText = document.createTextNode(name);
        nameEl.appendChild(nameText);

        var scoreEl = document.createElement('span');
        var valueText = document.createTextNode(score);
        scoreEl.appendChild(valueText);

        scoreContainer.appendChild(rankEl);
        scoreContainer.appendChild(nameEl);
        scoreContainer.appendChild(scoreEl);
        scoreContainer.classList.add('score');

        return scoreContainer;
    }

    for (var i = 0; i < topTenScores.length; i++) {
        var score = makeScore(i+1, topTenScores[i].name, topTenScores[i].score);
        topTen.appendChild(score);
    }

    for (var i = 0; i < closeThreeScores.length; i++) {
        var score = makeScore(closeThreeStartRank+i+1, closeThreeScores[i].name, closeThreeScores[i].score);
        closeThree.appendChild(score);
    }
};

LeaderBoardView.prototype.fillScores = function(rank) {
    var mazeService = new MazeService();
    
    // subtract 2 from rank because start is zero-indexed
    var promiseArr = [mazeService.getScores(this.seed, 0, 10),
                      mazeService.getScores(this.seed, rank-2, 3)];

    return Promise.all(promiseArr)
        .then(function(values) {
            this.addScoresToLeaderboard(values[0], values[1], Math.max(rank-2, 0));
        }.bind(this)).catch(function(error) {
            alert("Problem getting leaderboard values! " + error);
        }.bind(this));
};

LeaderBoardView.prototype.show = function () {
    this.leaderBoard.classList.remove('inactive');
};

LeaderBoardView.prototype.hide = function() {
    this.leaderBoard.classList.add('inactive');
};

LeaderBoardView.prototype.clear = function() {
    var topTen = document.getElementById('top-scores');
    var closeThree = document.getElementById('closest-scores');

    while (topTen.hasChildNodes()) {
        topTen.removeChild(topTen.lastChild);
    }
    while (closeThree.hasChildNodes()) {
        closeThree.removeChild(closeThree.lastChild);
    }
};
