import express from "express";
import leaderboardController from "../controllers/leaderboardController";

let router = express.Router();

/* gets json with leaderboard stats */
router.get("/:seed", async function(req, res, next) {
    try {
        console.log(req.query);
        let start = parseInt(req.query.start);
        let length = parseInt(req.query.length);
        let seed = req.params.seed;

        let scores = await leaderboardController(start, seed, length);
        console.log("hi, scores returned");
        if (!scores) {
            res.status(400).json({ error: "Out of bounds" });
        } else {
            scores = scores.map(score => {
                delete score["email"];
                return score;
            });
            console.log("scores is: ", scores);
            res.status(200).json({ scores: scores });
        }
    } catch (ex) {
        console.log("Error");
        console.log(ex);
        res.status(500).json({ error: ex });
    }
});

export default router;
