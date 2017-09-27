import mongoose from 'mongoose';

var scoreSchema = mongoose.Schema({
    name: String,
    email: {type: String, index: {unique: true, dropDups: true}},
    score: Number,
    date: String,
    solution: Array
});

var ScoreModel = mongoose.model('ScoreModel', scoreSchema);

export default ScoreModel;
