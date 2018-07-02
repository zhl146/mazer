import mongoose from "mongoose";

mongoose.Promise = global.Promise;

let scoreSchema = mongoose.Schema({
    name: String,
    email: String,
    score: Number,
    date: String,
    solution: Array
});

let ScoreModel = mongoose.model("ScoreModel", scoreSchema);

export default ScoreModel;
