import SeedUtil from './maze-functions/generate-seed'
import mongo from '../mongodb'
import * as R from 'ramda'

const shouldReturnSolution = function(seed) {
  let date = SeedUtil.seedToDate(seed)
  if (date === null) {
    return true
  }
  // Increment to next day so today compares to false
  date.setDate(date.getDate() + 1)

  let now = new Date()
  return date < now
}

const setRank = rank => R.set(R.lensProp('rank'), rank)
const omitSolution = R.omit(['solution'])
const setMyRank = (rank, myRank) =>
  myRank === rank ? R.set(R.lensProp('myScore'), true) : score => score

const getScores = async (skip, limit, seed) => {
  if (skip === undefined || skip < 0) {
    skip = 0
  }

  if (limit === undefined) {
    limit = 10
  } else if (limit > 100) {
    limit = 100
  }

  const scores = await mongo.scores
    .find({ seed })
    .sort({ score: -1 })
    .skip(skip)
    .limit(limit)
    .toArray()

  console.log('db scores: ', scores)

  return shouldReturnSolution(seed)
    ? scores.map((score, index) => setRank(skip + index + 1)(score))
    : scores.map((score, index) =>
        R.compose(
          omitSolution,
          setRank(skip + index + 1)
        )(score)
      )
}

const getScoresAround = async (userId, range, seed) => {
  if (range === undefined) {
    range = 0
  } else if (range > 50) {
    range = 50
  }

  console.log(userId)

  const playerScore = await mongo.scores.findOne({
    userId,
    seed,
  })

  console.log(playerScore)

  const playerRank = playerScore
    ? await mongo.scores.countDocuments({
        seed,
        score: { $gte: R.prop('score', playerScore) },
      })
    : null

  console.log(('current rank', playerRank))

  const skip = Math.max(playerRank - range - 1, 0)
  const startingRank = skip + 1

  let scores = await mongo.scores
    .find({ seed })
    .sort({ score: -1 })
    .skip(skip)
    .limit(range * 2 + 1)
    .toArray()

  console.log('fetched scores', scores)

  return shouldReturnSolution(seed)
    ? scores.map((score, index) =>
        R.compose(
          setRank(index + startingRank),
          setMyRank(index + startingRank, playerRank)
        )(score)
      )
    : scores.map((score, index) =>
        R.compose(
          omitSolution,
          setRank(index + startingRank),
          setMyRank(index + startingRank, playerRank)
        )(score)
      )
}

export default {
  getScores,
  getScoresAround,
}
