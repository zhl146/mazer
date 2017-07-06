var express = require('express');
var router = express.Router();

var seed = require('./maze-functions/generate-seed');
var leaderboard = require('../database/database-stuff');

/* validates a user solution and does stuff */
/* turn this into a post later */
router.post('/check', function(req, res, next) {
    // take the posted maze coords and use pathfinder to get path
    // get user identifier
    // record path length in database with user identifier
    res.send('this should validate maze solution')
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    leaderboard.save({
        name: 'zhen',
        score: 1000,
        date: seed.generate(),
        solution: ['this should be an array of solutions']
    });
    leaderboard.retrieve({'date': seed.generate()});
    res.send(seed.generate())
});

module.exports = router;