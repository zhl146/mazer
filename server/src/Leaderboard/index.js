import getPool from "../mongodb";
import { lightFormat } from "date-fns";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

export const getDaySeed = async (dateString) => {
  const pool = await getPool();

  const existingSeed = await pool
    .db("mazer")
    .collection("dailySeeds")
    .findOne({ _id: dateString })
    .then(({ seed }) => seed)
    .catch(() => null);

  if (existingSeed) return existingSeed;
  else {
    await saveDaySeed();
    return getDaySeed(dateString);
  }
};

export const saveDaySeed = async () => {
  const pool = await getPool();
  return pool
    .db("mazer")
    .collection("dailySeeds")
    .insert({
      _id: lightFormat(new Date(), "yyyy-MM-dd"),
      seed: uniqueNamesGenerator({
        dictionaries: [adjectives, colors, animals],
        style: "lowerCase",
        separator: "-",
      }),
    });
};

export const getLeaderboardPage = async (
  seed,
  pageNumber = 1,
  pageSize = 10
) => {
  const pool = await getPool();

  return pool
    .db("mazer")
    .collection("leaderboard")
    .find({
      seed,
    })
    .skip((pageNumber - 1) * pageSize)
    .limit(pageSize)
    .toArray();
};

export const getRelativeLeaderboard = async (seed, userId) => {};

export const saveScore = async (seed, diffPoints) => {};
