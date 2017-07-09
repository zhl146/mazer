import mongoose from 'mongoose';

var scoreSchema = mongoose.Schema({
    name: String,
    score: Number,
    date: String,
    solution: Array
});

var ScoreModel = mongoose.model('ScoreModel', scoreSchema);

export default ScoreModel;
