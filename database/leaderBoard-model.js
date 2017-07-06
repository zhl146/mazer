(function() {
    var mongoose = require('mongoose');

    mongoose.Promise = global.Promise;

    var leaderBoard = mongoose.Schema({
        name: String,
        score: Number,
        date: String,
        solution: Array
    });

    mongoose.connect('mongodb://localhost:27017/database');

    exports.Score = mongoose.model('Score', leaderBoard);

    mongoose.disconnect();
})();
