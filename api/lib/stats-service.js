import questionData from "../../src/data/questions.json" with { type: "json" };
import { getUsersCollection } from "./mongodb.js";
import { getScoreLevel, getTestScore } from "./scoring.js";

const QUESTIONS_PER_TEST = 10;

function chunkQuestions(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildUserStats(user, practiceTests) {
  const testResults = user.testResults || {};
  const testScores = [];
  let totalCorrect = 0;
  let totalQuestions = 0;

  practiceTests.forEach((testQuestions, index) => {
    const savedResult = testResults[index] ?? testResults[String(index)];
    const testScore = getTestScore(testQuestions, savedResult);

    if (!testScore) return;

    testScores.push({
      testIndex: index,
      score: testScore.score,
      total: testScore.total,
    });

    totalCorrect += testScore.score;
    totalQuestions += testScore.total;
  });

  const testsCompleted = testScores.length;
  const averagePercent =
    totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  return {
    slug: user.slug,
    name: user.name,
    testsCompleted,
    totalTests: practiceTests.length,
    totalCorrect,
    totalQuestions,
    averagePercent,
    level: getScoreLevel(averagePercent, testsCompleted),
    testScores,
  };
}

export async function getStatistics() {
  const practiceTests = chunkQuestions(questionData.questions, QUESTIONS_PER_TEST);
  const users = await getUsersCollection();
  const allUsers = await users
    .find({}, { projection: { slug: 1, name: 1, testResults: 1 } })
    .toArray();

  const leaderboard = allUsers
    .map((user) => buildUserStats(user, practiceTests))
    .sort((a, b) => {
      if (b.averagePercent !== a.averagePercent) {
        return b.averagePercent - a.averagePercent;
      }
      if (b.testsCompleted !== a.testsCompleted) {
        return b.testsCompleted - a.testsCompleted;
      }
      return a.name.localeCompare(b.name);
    });

  return {
    totalTests: practiceTests.length,
    questionsPerTest: QUESTIONS_PER_TEST,
    users: leaderboard,
  };
}
