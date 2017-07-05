var express = require('express');
var router = express.Router();

var seed = require('./maze-functions/generate-seed');

/* validates a user solution and does stuff */
/* turn this into a post later */
router.get('/check', function(req, res, next) {
    res.send('this should validate maze solution')
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    res.send(seed.generateSeedFromDate())
});

module.exports = router;