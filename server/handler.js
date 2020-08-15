const MongoClient = require('mongodb').MongoClient

const { MONGO_URL, MONGO_USER, MONGO_PASSWORD } = process.env

const auth = {
  user: MONGO_USER,
  password: MONGO_PASSWORD,
}

const getConnectionPool = async () => {
  let cachedPool

  if (cachedPool) return cachedPool

  const pool = MongoClient.connect(MONGO_URL, {
    auth,
    useUnifiedTopology: true,
  })
  cachedPool = pool
  return pool
}

const testHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false

  const mongoPool = await getConnectionPool()

  const result = await mongoPool
    .db('sample_mflix')
    .collection('movies')
    .findOne()

  return {
    statusCode: '200',
    body: result,
  }
}

module.exports.test = testHandler
