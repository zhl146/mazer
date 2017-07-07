export default function LeaderBoardView() {
    this.leaderBoard = document.getElementById('leaderboard');
    this.initLeaderBoard();
}

LeaderBoardView.prototype.initLeaderBoard = function() {
    (function(self) {
        console.log(self)
        var backBtn = document.getElementById('back-btn');
        backBtn.addEventListener('click', function() {
            self.hide();
        })
    })(this)
};

LeaderBoardView.prototype.populateLeaderBoard = function() {

};

LeaderBoardView.prototype.getRemoteScores = function() {

};

LeaderBoardView.prototype.show = function () {
    this.leaderBoard.classList.remove('hidden');
};

LeaderBoardView.prototype.hide = function() {
    this.leaderBoard.classList.add('hidden');
};