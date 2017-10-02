import SeedUtil from "./maze-functions/generate-seed";
import ScoreModel from "../database/ScoreModel";
import { createMaze } from "mazer-shared";

const controllerPOST = async submission => {
    let baseMaze = createMaze(submission.seed);
    let valid = baseMaze.applyUserChanges(submission.solution);
    let score = baseMaze.score;
    console.log(submission);
    if (!valid) return { error: true, status: "u r a cheat!", rank: null };
    // First search for duplicates
    let scoreModel = await ScoreModel.find({
        email: submission.email
    });

    scoreModel = scoreModel.length === 0 ? new ScoreModel() : scoreModel[0];

    if (scoreModel.score && scoreModel.score >= score) {
        let rank = await ScoreModel.count({
            date: submission.seed,
            score: { $gte: score }
        });
        return { error: false, status: "success", rank: rank };
    }

    scoreModel.name = submission.name;
    scoreModel.email = submission.email;
    scoreModel.score = score;
    scoreModel.date = submission.seed;
    scoreModel.solution = submission.solution;

    let savedScore = await scoreModel.save();
    let rank = await ScoreModel.count({
        date: submission.seed,
        score: { $gte: savedScore.score }
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
