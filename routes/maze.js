import express from 'express';

import seed from './maze-functions/generate-seed';
import leaderboard from '../database/database-stuff';

import Score from '../src/shared/Score';

var router = express.Router();

/* validates a user solution and does stuff */
/* turn this into a post later */
router.post('/check', function(req, res, next) {
    var solution = req.body;
    var score = new Score('', solution.diffPoints, solution.seed);
    res.json({'score': score.score});
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    var maze = new Maze(0);
    res.send(JSON.stringify(maze.maze));
    /*leaderboard.save({
        name: 'zhen',
        score: 1000,
        date: seed.generate(),
        solution: ['this should be an array of solutions']
    });
    leaderboard.retrieve({'date': seed.generate()});
    res.send(seed.generate())*/
});

module.exports = router;
