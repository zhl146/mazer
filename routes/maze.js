import express from 'express';

import generateSeed from './maze-functions/generate-seed';
import ScoreModel from '../database/leaderBoard-model';

import Score from '../src/shared/Score';

var router = express.Router();

/* validates a user solution and does stuff */
/* turn this into a post later */
router.post('/check', function(req, res, next) {
    var solution = req.body;
    var score = new Score('', solution.diffPoints, solution.seed);

    if (score.score < 0) {
        res.status(400).json({ 'error' : 'u r cheater' });
        return;
    }

    // First search for duplicates
    ScoreModel.find({
        'name': solution.name,
        'score': score.score,
        'date': solution.seed, 
    }).then(existingScore => {
        if (existingScore.length > 0) {
            // Return the already-existing score to prevent spamming
            return Promise.resolve(existingDocs[0]);
        }

        var scoreModel = new ScoreModel();
        scoreModel.name = (solution.name ? solution.name : "Anonymous");
        scoreModel.score = score.score;
        scoreModel.date = solution.seed;
        scoreModel.solution = solution.diffPoints;

        return scoreModel.save();
    }).then(savedScore => {
        return ScoreModel.count({
            'date': solution.seed,
            'score': { '$gte': savedScore.score }
        });
    }).then(rank => {
        res.json({ 'rank': rank });
    }).catch(error => {
        if (error) {
            res.status(500).json({ 'error': err });
            return;
        }
    });
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    var seed = generateSeed();
    console.log(seed);
    res.send(JSON.stringify({ 'seed': seed }));
});

export default router;
