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

    if (score.score >= 0) {
        var scoreModel = new ScoreModel();
        scoreModel.name = (solution.name ? solution.name : "Anonymous");
        scoreModel.score = score.score;
        scoreModel.date = solution.seed;
        scoreModel.solution = solution.diffPoints;

        console.log(score.score);

        scoreModel.save(function(error, product) {
            if (error) {
                res.status(500).json({ 'error': err });
                return;
            }

            ScoreModel.count({ 'score': { '$gte': product.score } }, function(error, count) {
                if (error) {
                    res.status(500).json({ 'error': err });
                } else {
                    res.json({ 'rank': count });
                }
            });
        });
    } else {
        res.status(400).json({ 'error' : 'u r cheater' });
    }

});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    res.send(JSON.stringify({ seed: generateSeed() }));
});

export default router;
