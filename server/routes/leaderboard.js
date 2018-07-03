import express from "express";
import getEmailfromIdToken from "../controllers/getEmailFromIdToken";

import leaderboardController from "../controllers/leaderboardController";

let router = express.Router();

/* gets json with leaderboard stats */
router.post("/", async function(req, res, next) {
    try {
        const { body } = req;
        const { skip, limit, seed, token } = body;

        const email = await getEmailfromIdToken(token);

        let scores = await leaderboardController(skip, limit, seed, email);
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
