import SeedUtil from './maze-functions/generate-seed'
import { createMaze } from 'mazer-shared'
import mongo from '../mongodb'
import getIdFromToken from './getIdFromToken'

const submitSolution = async submission => {
  let baseMaze = createMaze(submission.seed)
  let valid = baseMaze.applyUserChanges(submission.solution)
  let score = baseMaze.score
  if (!valid) return { error: true, status: 'u r a cheat!' }
  // First search for duplicates

  const userId = await getIdFromToken(submission.token)

  let matchingScore = await mongo.scores.findOne({
    seed: submission.seed,
    userId,
  })

  console.log('matching scores', matchingScore)

  const newScore = {
    name: submission.name,
    userId,
    score,
    seed: submission.seed,
    solution: submission.solution,
  }

  if (!matchingScore) await mongo.scores.insertOne(newScore)
  else if (matchingScore.score <= score)
    await mongo.scores.updateOne({ _id: matchingScore._id }, { $set: newScore })

  return { error: false, status: 'success' }
}

const getDailySeed = () => {
  return SeedUtil.dateToSeed(new Date())
}

export default {
  POST: submitSolution,
  GET: getDailySeed,
}
