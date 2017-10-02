import leaderboardController from "../controllers/leaderboardController";
import test from "tape-async";
import sleep from "sleep-promise";
import ScoreModel from "../database/ScoreModel";
import mongoose from "mongoose";

const setup = async () => {
    for (let i = 0; i < 10; i++) {
        let scoremodel = new ScoreModel();
        scoremodel.name = "pms" + i.toString();
        scoremodel.email = "pms" + i.toString() + "@gmail.com";
        scoremodel.score = i;
        scoremodel.date = "testseed";
        scoremodel.solution = JSON.stringify([]);
        let savedScore = await scoremodel.save();
    }
    let scores = await leaderboardController(0, "testseed", 3); //leaderboardController(start, seed, length)
    let scores2 = await leaderboardController(1, "testseed", 4); //leaderboardController(start, seed, length)
    console.log("derpderp");
    return {
        scores,
        scores2
    };
};

test("the leaderboard controller should successfully fetch scores", async assert => {
    await mongoose.connect("mongodb://localhost/mazer_scores_DB", {
        server: { reconnectTries: 10 }
    });

    const { scores, scores2 } = await setup();

    assert.deepEqual(scores.length, 3);
    assert.deepEqual(scores[0].score, 9);
    assert.deepEqual(scores[1].score, 8);
    assert.deepEqual(scores[2].score, 7);

    assert.deepEqual(scores2.length, 4);
    assert.deepEqual(scores[0].score, 8);
    assert.deepEqual(scores[1].score, 7);
    assert.deepEqual(scores[2].score, 6);
    assert.deepEqual(scores[2].score, 5);
});
