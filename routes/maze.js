/**
 * Created by developer on 7/5/17.
 */

var express = require('express');
var router = express.Router();

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
    res.send('this should return the daily maze')
});

/* validates a user solution and does stuff */
/* turn this into a post later */
router.get('/check', function(req, res, next) {
    res.send('this should validate maze solution')
});

module.exports = router;