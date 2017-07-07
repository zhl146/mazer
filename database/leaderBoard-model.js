import mongoose from 'mongoose';

export var Score = {};

(function() {
    mongoose.Promise = global.Promise;

    var leaderBoard = mongoose.Schema({
        name: String,
        score: Number,
        date: String,
        solution: Array
    });

    mongoose.connect('mongodb://localhost:27017/database');

    Score = mongoose.model('Score', leaderBoard);

    mongoose.disconnect();
})();
