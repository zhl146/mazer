import express from "express";
import mazeController from "../controllers/mazeController";
let router = express.Router();

/* validates a user solution and does stuff */
router.post("/check", async function(req, res, next) {
    try {
        let submission = req.body;
        let respsonse = mazeController.POST(submission);
        //on cheating return 400
        res.status(400).json();
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

/* should return a json describing the current maze */
router.get("/", function(req, res, next) {
    try {
        let seed = mazeController.GET();
        res.send(JSON.stringify({ seed: seed }));
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

export default router;
