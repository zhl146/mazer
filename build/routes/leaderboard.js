'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _ScoreModel = require('../database/ScoreModel');

var _ScoreModel2 = _interopRequireDefault(_ScoreModel);

var _generateSeed = require('./maze-functions/generate-seed');

var _generateSeed2 = _interopRequireDefault(_generateSeed);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var router = _express2.default.Router();

var shouldReturnSolution = function shouldReturnSolution(seed) {
    var date = _generateSeed2.default.seedToDate(seed);
    if (date === null) {
        return true;
    }

    // Increment to next day so today compares to false
    date.setDate(date.getDate() + 1);

    var now = new Date();
    console.log(now, date);
    return date < now;
};

/* gets json with leaderboard stats */
router.get('/:seed', function (req, res, next) {
    var start = req.query.start;
    var length = req.query.length;

    if (start === undefined || start < 0) {
        start = 0;
    }

    if (length === undefined) {
        length = 10;
    } else if (length > 100) {
        length = 100;
    }

    var query = {
        'date': req.params.seed
    };

    var options = {
        'skip': start,
        'limit': length,
        'sort': {
            'score': -1
        }
    };

    var projection = {
        'name': 1,
        'score': 1,
        '_id': 0
    };

    if (shouldReturnSolution(req.params.seed)) {
        projection['solution'] = 1;
    }

    var scoreQuery = _ScoreModel2.default.find(query, projection, options, function (error, scores) {
        if (error) {
            res.status(500).json({ 'error': error });
        } else if (!scores) {
            res.status(400).json({ 'error': 'Out of bounds' });
        } else {
            res.json({ 'scores': scores });
        }
    });
});

exports.default = router;