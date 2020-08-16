// const MongoClient = require("mongodb").MongoClient;
import { createGame } from "@mazer/shared";

const { MONGO_URL, MONGO_USER } = process.env;

// const auth = {
//   user: MONGO_USER,
//   password: MONGO_PASSWORD,
// };

// let cachedPool;

// const getConnectionPool = async () => {
//   if (cachedPool) return cachedPool;

//   const pool = MongoClient.connect(MONGO_URL, {
//     auth,
//     useUnifiedTopology: true,
//   });
//   cachedPool = pool;
//   return pool;
// };

const testHandler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  console.log(MONGO_URL, MONGO_USER);

  const newGame = createGame("derp");

  console.log(newGame);

  // const mongoPool = await getConnectionPool();

  // const result = await mongoPool
  //   .db("sample_mflix")
  //   .collection("movies")
  //   .findOne();

  return {
    statusCode: "200",
    body: newGame,
  };
};

module.exports.test = testHandler;
