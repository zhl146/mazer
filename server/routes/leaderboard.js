import express from 'express'

import leaderboard from '../controllers/leaderboardController'

let router = express.Router()

/* gets json with leaderboard stats */
router.post('/scores', async function(req, res, next) {
  try {
    const { body } = req
    const { skip, limit, seed } = body

    let scores = await leaderboard.getScores(skip, limit, seed)
    if (!scores) {
      res.status(400).json({ error: 'Out of bounds' })
    } else {
      console.log('top scores: ', scores)
      res.status(200).json({ scores: scores })
    }
  } catch (ex) {
    console.log('Error')
    console.log(ex)
    res.status(500).json({ error: ex })
  }
})

/* gets json with leaderboard stats */
router.post('/range', async function(req, res, next) {
  try {
    const { body } = req
    const { userId, range, seed } = body
    console.log('body', body)

    let scores = await leaderboard.getScoresAround(userId, range, seed)
    if (!scores) {
      res.status(400).json({ error: 'Out of bounds' })
    } else {
      console.log('closest scores: ', scores)
      res.status(200).json({ scores: scores })
    }
  } catch (ex) {
    console.log('Error')
    console.log(ex)
    res.status(500).json({ error: ex })
  }
})

export default router
