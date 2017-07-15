'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _generateSeed = require('./maze-functions/generate-seed');

var _generateSeed2 = _interopRequireDefault(_generateSeed);

var _ScoreModel = require('../database/ScoreModel');

var _ScoreModel2 = _interopRequireDefault(_ScoreModel);

var _Score = require('../shared/Score');

var _Score2 = _interopRequireDefault(_Score);

var _Maze = require('../shared/Maze');

var _Maze2 = _interopRequireDefault(_Maze);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

/* validates a user solution and does stuff */
/* turn this into a post later */
router.post('/check', function (req, res, next) {
    var solution = req.body;

    var baseMaze = new _Maze2.default(solution.seed);
    var maze = new _Maze2.default(solution.seed);

    // apply user's changes to the maze
    // should make the maze the same as the one the user submitted
    for (var i = 0; i < solution.diffPoints.length; i++) {
        var result = maze.doActionOnTile(solution.diffPoints[i]);
        if (result === false) {
            // Invalid action
            res.status(400).json({ 'error': 'u r cheater' });
            return;
        }
    }

    var scoreCalculator = new _Score2.default(baseMaze);
    var score = scoreCalculator.calculateScore(maze);

    if (!solution.name) {
        solution.name = "Anonymous";
    }

    // First search for duplicates
    _ScoreModel2.default.find({
        'name': solution.name,
        'score': score,
        'date': solution.seed
    }).then(function (existingScore) {
        if (existingScore.length > 0) {
            // Return the already-existing score to prevent spamming
            return Promise.resolve(existingScore[0]);
        }

        var scoreModel = new _ScoreModel2.default();
        scoreModel.name = solution.name;
        scoreModel.score = score;
        scoreModel.date = solution.seed;
        scoreModel.solution = solution.diffPoints;

        return scoreModel.save();
    }).then(function (savedScore) {
        return _ScoreModel2.default.count({
            'date': solution.seed,
            'score': { '$gte': savedScore.score }
        });
    }).then(function (rank) {
        res.json({ 'rank': rank });
    }).catch(function (error) {
        if (error) {
            res.status(500).json({ 'error': error });
        }
    });
});

/* should return a json describing the current maze */
router.get('/', function (req, res, next) {
    var seed = _generateSeed2.default.dateToSeed(new Date());
    res.send(JSON.stringify({ 'seed': seed }));
});

exports.default = router;