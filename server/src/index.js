import getPool from "./mongodb";
import { OAuth2Client } from "google-auth-library";

import { saveDaySeed, getDaySeed } from "./Leaderboard";
import { GOOGLE_CLIENT_ID } from "@mazer/shared";

const generateLeaderBoardData = () => {
  let data = [];

  for (let i = 0; i < 15; i++) {
    data.push({
      seed: "derp",
      userId: i,
      score: Math.round(Math.random() * 100000),
    });
  }

  return data;
};

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

const verifyToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const userId = payload["sub"];
  return userId;
};

const getUserId = (token) => verifyToken(token).catch(() => null);

export const test = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;

  const { token } = JSON.parse(event.body);

  const userId = await getUserId(token);

  if (!userId)
    return {
      statusCode: "403",
    };

  const mongoPool = await getPool();

  const result = await getDaySeed("2020-08-17");

  // const aggregation = await mongoPool
  //   .db("mazer")
  //   .collection("leaderboard")
  //   .aggregate([
  //     {
  //       $facet: {
  //         countBefore: [],
  //       },
  //     },
  //   ]);

  // const result = await mongoPool
  //   .db("mazer")
  //   .collection("leaderboard")
  //   .find()
  //   .toArray();

  return {
    statusCode: "200",
    body: JSON.stringify(result),
  };
};
