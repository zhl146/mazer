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

const getScores = async (skip, limit, seed) => {
    if (skip === undefined || skip < 0) {
        skip = 0;
    }

    if (limit === undefined) {
        limit = 10;
    } else if (limit > 100) {
        limit = 100;
    }

    let returnValue = await mongo.scores
        .find({ seed })
        .sort({ score: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

    return returnValue;
};

const getScoresAround = async (userId, range, seed) => {
    if (range === undefined) {
        range = 0;
    } else if (range > 50) {
        range = 50;
    }

    const playerScore = mongo.scores.findOne({
        userId,
        seed
    });

    const playerRank = mongo.scores.count({
        seed,
        score: { $gte: playerScore.score }
    });

    let returnValue = await mongo.scores
        .find({ seed })
        .sort({ score: -1 })
        .skip(Math.max(playerRank - range, 0))
        .limit(range * 2 + 1)
        .toArray();

    return returnValue;
};

export default {
    getScores,
    getScoresAround
};
