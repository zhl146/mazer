import express from 'express';

var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendfile(__dirname + '/index.html');
});

module.exports = router;
