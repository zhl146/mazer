import { MongoClient } from "mongodb";

const { MONGO_URL, MONGO_USER, MONGO_PASSWORD } = process.env;

const auth = {
  user: MONGO_USER,
  password: MONGO_PASSWORD,
};

let cachedPool;

export default async () => {
  if (cachedPool) return cachedPool;

  const pool = await MongoClient.connect(MONGO_URL, {
    auth,
    useUnifiedTopology: true,
  });

  cachedPool = pool;
  return pool;
};
