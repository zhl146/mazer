import express from 'express';

var router = express.Router();

/* validates a user solution and does stuff */
router.post('/check', async function(req, res, next) {
  try{
    let submission = req.body;

  } catch(error) {
    res.status(500).json({ 'error': error });
  }
});

/* should return a json describing the current maze */
router.get('/', function(req, res, next) {
  var seed = SeedUtil.dateToSeed(new Date());
  res.send(JSON.stringify({ 'seed': seed }));
});

export default router;
