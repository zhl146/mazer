exports.save = function(data) {
    var leaderBoard = require('../database/leaderBoard-model');

    var score = new leaderBoard.Score({
        name: data.name,
        score: data.score,
        date: data.date,
        solution: data.solution
    });

    score.save(function (err) {
        if (err) return console.error(err);
    });
};

exports.retrieve = function(condition) {
    var leaderBoard = require('../database/leaderBoard-model');

    leaderBoard.Score.find(condition, function( err, score) {
        console.log(score)
    });
};
