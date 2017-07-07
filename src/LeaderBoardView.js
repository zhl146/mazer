export default function LeaderBoardView() {
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
    this.getRemoteScores()
};

LeaderBoardView.prototype.getRemoteScores = function() {
    var startIndex = 0;
    var numScores = 10;

    var xhr = new XMLHttpRequest();
    // this is the maze checking URL
    var url = 'http://localhost:3000/leaderboard?begin=' + startIndex + '&' + '?num=' + numScores;
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var json = JSON.parse(xhr.responseText);
            // NEED TO EDIT TO RECEIVE THINGS FROM SERVER
            this.addScoresToLeaderboard(json.scores);
        }
    }.bind(this);
    xhr.send(null);
};

LeaderBoardView.prototype.addScoresToLeaderboard = function(scores) {

};

LeaderBoardView.prototype.show = function () {
    this.leaderBoard.classList.remove('hidden');
};

LeaderBoardView.prototype.hide = function() {
    this.leaderBoard.classList.add('hidden');
};