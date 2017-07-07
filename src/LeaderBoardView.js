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

LeaderBoardView.prototype.populateLeaderBoard = function() {
    var startIndex = 0;
    var numScores = 10;

    var xhr = new XMLHttpRequest();
    // this is the maze checking URL
    var url = 'http://localhost:3000/leaderboard/' + this.seed + '?start=' + startIndex + '&' + '?length=' + numScores;
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            this.addScoresToLeaderboard(response.scores);
        }
    }.bind(this);
    xhr.send(null);
};

LeaderBoardView.prototype.addScoresToLeaderboard = function(scores) {

    var topTen = document.getElementById('top-scores');

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

    for (var i = 0; i < scores.length; i++) {
        var score = makeScore(i+1, scores[i].name, scores[i].score);
        topTen.appendChild(score);
    }

    for (var i = scores.length; i < 10; i++) {
        score = makeScore(i+1, 'derpman', 9000);
        topTen.appendChild(score);
    }

};

LeaderBoardView.prototype.createScoreEntry =function(score) {
    
};

LeaderBoardView.prototype.show = function () {
    this.populateLeaderBoard();
    this.leaderBoard.classList.remove('hidden');
};

LeaderBoardView.prototype.hide = function() {
    this.leaderBoard.classList.add('hidden');
};