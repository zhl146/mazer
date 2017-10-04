import ScoreModel from "../database/ScoreModel";
import SeedUtil from "./maze-functions/generate-seed";

const shouldReturnSolution = function(seed) {
    let date = SeedUtil.seedToDate(seed);
    if (date === null) {
        return true;
    }
    // Increment to next day so today compares to false
    date.setDate(date.getDate() + 1);

    let now = new Date();
    console.log(now, date);
    return date < now;
};

const leaderboardController = async (start, seed, length) => {
    if (start === undefined || start < 0) {
        start = 0;
    }

    if (length === undefined) {
        length = 10;
    } else if (length > 100) {
        length = 100;
    }

    let query = {
        date: seed
    };

    let options = {
        skip: start,
        limit: length,
        sort: {
            score: -1
        }
    };

    let projection = {
        name: 1,
        score: 1,
        _id: 0
    };

    if (shouldReturnSolution(seed)) {
        projection["solution"] = 1;
    }
    console.log("about to begin");
    let returnValue = await ScoreModel.find(query, projection, options);
    console.log("returned");
    return returnValue;
};

export default leaderboardController;
