import express from 'express';
import ScoreModel from '../database/ScoreModel'
import SeedUtil from './maze-functions/generate-seed'

var router = express.Router();

var shouldReturnSolution = function(seed)
{
    var date = SeedUtil.seedToDate(seed);
    if (date === null) {
        return true;
    }

    // Increment to next day so today compares to false
    date.setDate(date.getDate() + 1);
    
    var now = new Date();
    console.log(now, date);
    return date < now;
}

/* gets json with leaderboard stats */
router.get('/:seed', function(req, res, next) {
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
        'date': req.params.seed,
    }

    var options = {
        'skip': start,
        'limit': length,
        'sort': {
            'score': -1
        },
    };

    var projection = {
        'name': 1,
        'score': 1,
        '_id': 0,
    };

    if (shouldReturnSolution(req.params.seed)) {
        projection['solution'] = 1;
    }

    var scoreQuery = ScoreModel.find(query, projection, options, function(error, scores) {
        if (error) {
            res.status(500).json({ 'error': error });
        } else if (!scores) {
            res.status(400).json({ 'error': 'Out of bounds' });
        } else {
            res.json({ 'scores': scores });
        }
    });
});

export default router;
