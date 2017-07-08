export default function LeaderBoardView(seed) {
    this.seed = seed;
    this.leaderBoard = document.getElementById('leaderboard');
    this.initLeaderBoard();
}

LeaderBoardView.prototype.initLeaderBoard = function() {
    (function(self) {
        var backBtn = document.getElementById('back-btn');
        backBtn.addEventListener('click', function() {
            self.hide();
        })
    })(this)
};

LeaderBoardView.prototype.getScores = function(start, length) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        // this is the maze checking URL
        var url = 'http://localhost:3000/leaderboard/' + this.seed + '?start=' + start + '&length=' + length;
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState !== 4) {
                return;
            }

            if (xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                resolve(response.scores);
            } else {
                reject(xhr);
            }
        }.bind(this);
        xhr.send(null);
    }.bind(this));
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
    var self = this;
    // subtract 2 from rank because start is zero-indexed
    return Promise.all([this.getScores(0, 10), this.getScores(rank-2, 3)])
        .then(function(values) {
            self.addScoresToLeaderboard(values[0], values[1], Math.max(rank-2, 0));
        }.bind(this));
};

LeaderBoardView.prototype.show = function () {
    this.leaderBoard.classList.remove('hidden');
};

LeaderBoardView.prototype.hide = function() {
    this.leaderBoard.classList.add('hidden');
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
