import SeedUtil from "./maze-functions/generate-seed";
import ScoreModel from "../database/ScoreModel";
import { createMaze } from "mazer-shared";

const controllerPOST = async submission => {
    let baseMaze = createMaze(submission.seed);
    let valid = baseMaze.applyUserChanges(submission.solution);
    let score = baseMaze.score;
    if (!valid) return { error: true, status: "u r a cheat!", rank: null };

    // First search for duplicates
    let matchingScores = await ScoreModel.find({
        date: submission.seed,
        email: submission.email
    });

    let scoreModel =
        matchingScores.length === 0 ? new ScoreModel() : matchingScores[0];

    if (!scoreModel.score || scoreModel.score <= score) {
        scoreModel.name = submission.name;
        scoreModel.email = submission.email;
        scoreModel.score = score;
        scoreModel.date = submission.seed;
        scoreModel.solution = submission.solution;

        scoreModel = await scoreModel.save();
    }

    let rank = await ScoreModel.count({
        date: submission.seed,
        score: { $gte: scoreModel.score }
    });
    return { error: false, status: "success", rank: rank };
};

const controllerGET = () => {
    return SeedUtil.dateToSeed(new Date());
};

export default {
    POST: controllerPOST,
    GET: controllerGET
};
