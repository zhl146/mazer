
import MazeService from './MazeService';

// Initializer.
//  seed - The random seed of the maze for which we get the high scores.
//  backgroundColor - Color to set the background, for styling.
//  solutionDelegate - Object which must implement a function, `displaySolution`, which takes a list
//      of points and displays the resulting maze.
export default function LeaderBoardView(seed, backgroundColor, solutionDelegate) {
    this.seed = seed;
    this.playerRank = null;

    this.backgroundColor = backgroundColor;
    this.leaderBoard = document.getElementById('leaderboard');
    this.initLeaderBoard();

    this.solutionDelegate = solutionDelegate;
}

LeaderBoardView.prototype.initLeaderBoard = function() {
    const backBtn = document.getElementById('back-btn');
    backBtn.addEventListener('click', function() {
        this.hide();
    }.bind(this));

    const leaderboardBody = this.leaderBoard.firstElementChild;
    leaderboardBody.style.backgroundColor = this.backgroundColor;

};

LeaderBoardView.prototype.addScoresToLeaderboard = function(topTenScores, closeThreeScores, closeThreeStartRank) {
    let i;
    let score;
    this.clear();

    const topTen = document.getElementById('top-scores');
    const closeThree = document.getElementById('closest-scores');

    const makeScore = function ( rank, scoreValues ) {
        const scoreNumber = scoreValues.score;
        const nameText = scoreValues.name;
        const solutionArray = scoreValues.solution;

        const scoreContainer = document.createElement('div');
        const rankEl = document.createElement('span');
        const rankTextNode = document.createTextNode(rank);
        rankEl.appendChild(rankTextNode);

        let nameTextNode;
        const nameEl = document.createElement('span');
        if (solutionArray === undefined) {
            nameTextNode = document.createTextNode(nameText);
            nameEl.appendChild(nameTextNode);
        } else {
            const nameLink = document.createElement('a');
            nameLink.classList.add('solution-link');
            nameEl.appendChild(nameLink);
            nameTextNode = document.createTextNode(nameText);
            nameLink.appendChild(nameTextNode);

            nameLink.addEventListener('click', function () {
                this.solutionDelegate.displaySolution(solutionArray);
                this.hide();
            }.bind(this));
        }

        const scoreEl = document.createElement('span');
        const valueText = document.createTextNode(scoreNumber);
        scoreEl.appendChild(valueText);

        scoreContainer.appendChild(rankEl);
        scoreContainer.appendChild(nameEl);
        scoreContainer.appendChild(scoreEl);
        scoreContainer.classList.add('score');

        // differentiate the newest score
        if (rank === this.playerRank) {
            scoreContainer.style.background = 'rgba(0,255,75,.3)';
        }

        return scoreContainer;
    }.bind(this);

    for (i = 0; i < topTenScores.length; i++) {
        score = makeScore(i + 1, topTenScores[i]);
        topTen.appendChild(score);
    }

    // don't show redundant scores
    //closethree will only show if you are 11th or lower
    if (closeThreeStartRank > 8) {
        const dividerDiv =  document.createElement('div');
        dividerDiv.classList.add('leaderboard-divider');
        closeThree.appendChild(dividerDiv);
        for (i = 0; i < closeThreeScores.length; i++) {
            score = makeScore(closeThreeStartRank + i + 1, closeThreeScores[i]);
            closeThree.appendChild(score);
        }
    }
};

LeaderBoardView.prototype.fillScores = function(rank) {
    this.playerRank = rank;
    const mazeService = new MazeService();
    
    // subtract 2 from rank because start is zero-indexed
    const promiseArr = [mazeService.getScores(this.seed, 0, 10),
        mazeService.getScores(this.seed, rank - 2, 3)];

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
    const topTen = document.getElementById('top-scores');
    const closeThree = document.getElementById('closest-scores');

    while (topTen.hasChildNodes()) {
        topTen.removeChild(topTen.lastChild);
    }
    while (closeThree.hasChildNodes()) {
        closeThree.removeChild(closeThree.lastChild);
    }
};
