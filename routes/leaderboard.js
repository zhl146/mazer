/**
 * Created by developer on 7/5/17.
 */

var express = require('express');
var router = express.Router();

/* gets json with leaderboard stats */
router.get('/', function(req, res, next) {
    res.send('this should return json with leaderboard stats')
});

module.exports = router;