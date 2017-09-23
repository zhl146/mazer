import express from 'express';
import SeedUtil from './maze-functions/generate-seed';
import ScoreModel from '../database/ScoreModel';
import { createMaze } from 'mazer-shared';

var router = express.Router();

/* validates a user solution and does stuff */
router.post('/check', function(req, res, next) {

    let submission = req.body;
    let baseMaze = createMaze(submission.seed);
    let valid = baseMaze.applyUserChanges(submission.solution);
    let score = baseMaze.score;
    console.log(submission);
    if(!valid) res.status(400).json({'problem':'u r a cheat!'});
    // First search for duplicates
    ScoreModel.find({
        'name': submission.user,
        'score': score,
        'date': submission.seed,
    }).then(existingScore => {
        if (existingScore.length > 0) {
            // Return the already-existing score to prevent spamming
            return Promise.resolve(existingScore[0]);
        }

        let scoreModel = new ScoreModel();
        scoreModel.name = submission.user;
        scoreModel.score = score;
        scoreModel.date = submission.seed;
        scoreModel.solution = submission.solution;

        return scoreModel.save();
    }).then(savedScore => {
        return ScoreModel.count({
            'date': submission.seed,
            'score': { '$gte': savedScore.score }
        });
    }).then(rank => {
        res.json({ 'rank': rank });
    }).catch(error => {
        if (error) {
            res.status(500).json({ 'error': error });
        }
    });
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    var seed = SeedUtil.dateToSeed(new Date());
    res.send(JSON.stringify({ 'seed': seed }));
});

export default router;
