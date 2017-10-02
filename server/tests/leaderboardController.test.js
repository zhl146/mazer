import mazeController from "../controllers/leaderboardController";
import test from "tape";
import ScoreModel from "../database/ScoreModel";

test("the leaderboard controller should successfully fetch scores", async assert => {
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
    assert.deepEqual(scores.length, 3);
    assert.deepEqual(scores[0].score, 9);
    assert.deepEqual(scores[1].score, 8);
    assert.deepEqual(scores[2].score, 7);
});

leaderboardControllerTest();
