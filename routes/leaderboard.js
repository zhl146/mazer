import express from 'express';
import ScoreModel from '../database/leaderBoard-model'

var router = express.Router();

/* gets json with leaderboard stats */
router.get('/', function(req, res, next) {
    var start = req.query.start;
    var length = req.query.length;

    if (start === undefined) {
        start = 0;
    }

    if (length === undefined) {
        length = 10;
    } else if (length > 100) {
        length = 100;
    }

    var scoreQuery = ScoreModel.find({}, undefined, {
        'skip': start,
        'limit': length
    }, function(error, scores) {
        if (error) {
            res.status(500).json({ 'error': err });
        } else if (!scores) {
            res.status(400).json({ 'error': 'Out of bounds' });
        } else {
            res.json({ 'scores': scores });
        }
    });
});

export default router;
