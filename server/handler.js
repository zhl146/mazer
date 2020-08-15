const MongoClient = require('mongodb').MongoClient

const { MONGO_URL, MONGO_USER, MONGO_PASSWORD } = process.env

const auth = {
  user: MONGO_USER,
  password: MONGO_PASSWORD,
}

const getConnectionPool = async () => {
  let cachedPool

  if (cachedPool) return cachedPool

  const pool = MongoClient.connect(MONGO_URL, { auth })
  cachedPool = pool
  return pool
}

module.exports.test = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const mongoPool = await getConnectionPool()

  const result = await mongoPool
    .db('sample_airbnb')
    .collection('listingsAndReviews')
    .findOne()

  return {
    statusCode: '200',
    body: result,
  }
}
