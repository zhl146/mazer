import express from 'express';
import SeedUtil from './maze-functions/generate-seed';
import ScoreModel from '../database/ScoreModel';
import { createMaze } from 'mazer-shared';

var router = express.Router();

/* validates a user solution and does stuff */
router.post('/check', async function(req, res, next) {
    try{
        let submission = req.body;
        let baseMaze = createMaze(submission.seed);
        let valid = baseMaze.applyUserChanges(submission.solution);
        let score = baseMaze.score;
        console.log(submission);
        if(!valid) res.status(400).json({'problem':'u r a cheat!'});
        // First search for duplicates
        let scoreModel = await ScoreModel.find({
            'email': submission.email
        });

        scoreModel = (scoreModel.length === 0? new ScoreModel: scoreModel[0]);

        if(scoreModel.score && scoreModel.score > submission.score) res.send(200);

        scoreModel.name = submission.name;
        scoreModel.email = submission.email;
        scoreModel.score = score;
        scoreModel.date = submission.seed;
        scoreModel.solution = submission.solution;

        let savedScore = await scoreModel.save();
        let rank = await ScoreModel.count({
            'date': submission.seed,
            'score': { '$gte': savedScore.score }
        });
        res.json({ 'rank': rank });
    } catch(error) {
        res.status(500).json({ 'error': error });
    }
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    var seed = SeedUtil.dateToSeed(new Date());
    res.send(JSON.stringify({ 'seed': seed }));
});

export default router;
