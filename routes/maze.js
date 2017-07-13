import express from 'express';

import SeedUtil from './maze-functions/generate-seed';
import ScoreModel from '../database/ScoreModel';

import Score from '../shared/Score';
import Maze from '../shared/Maze';

var router = express.Router();

/* validates a user solution and does stuff */
/* turn this into a post later */
router.post('/check', function(req, res, next) {
    var solution = req.body;

    var baseMaze = new Maze(solution.seed);
    var maze = new Maze(solution.seed);

    // apply user's changes to the maze
    // should make the maze the same as the one the user submitted
    for (var i = 0; i < solution.diffPoints.length; i++ ) {
        var result = maze.doActionOnTile(solution.diffPoints[i]);
        if (result === false) {
            // Invalid action
            res.status(400).json({ 'error' : 'u r cheater' });
            return;
        }
    }

    var scoreCalculator = new Score(baseMaze);
    var score = scoreCalculator.calculateScore(maze);

    if (!solution.name) {
        solution.name = "Anonymous";
    }

    // First search for duplicates
    ScoreModel.find({
        'name': solution.name,
        'score': score,
        'date': solution.seed, 
    }).then(existingScore => {
        if (existingScore.length > 0) {
            // Return the already-existing score to prevent spamming
            return Promise.resolve(existingScore[0]);
        }

        var scoreModel = new ScoreModel();
        scoreModel.name = solution.name;
        scoreModel.score = score;
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
