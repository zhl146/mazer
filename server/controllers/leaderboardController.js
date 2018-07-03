import SeedUtil from "./maze-functions/generate-seed";
import mongo from "../mongodb";

const shouldReturnSolution = function(seed) {
    let date = SeedUtil.seedToDate(seed);
    if (date === null) {
        return true;
    }
    // Increment to next day so today compares to false
    date.setDate(date.getDate() + 1);

    let now = new Date();
    console.log(now, date);
    console.log(date < now);
    return date < now;
};

const leaderboardController = async (skip, limit, seed, email) => {
    if (skip === undefined || skip < 0) {
        skip = 0;
    }

    if (limit === undefined) {
        limit = 10;
    } else if (limit > 100) {
        limit = 100;
    }

    const playerScore = await mongo.scores.findOne({ email, seed });

    console.log(playerScore);

    if (shouldReturnSolution(seed)) {
        projection["solution"] = 1;
    }
    console.log("about to begin");
    let returnValue = await mongo.scores
        .find({ seed })
        .skip(skip)
        .limit(limit)
        .sort({ score: -1 })
        .toArray();

    console.log(returnValue);

    return returnValue;
};

export default leaderboardController;
