import questionData from "../../src/data/questions.json" with { type: "json" };
import emailData from "../../src/data/emails.json" with { type: "json" };
import { getUsersCollection } from "./mongodb.js";
import { getScoreLevel, getTestScore } from "./scoring.js";
import { getTaskTestResults } from "./test-results.js";

const TASK_CONFIG = {
  "build-sentence": {
    type: "sentence",
    items: questionData.questions,
    questionsPerTest: 10,
    label: "Build a Sentence",
  },
  "write-email": {
    type: "email",
    items: emailData.prompts,
    questionsPerTest: 5,
    label: "Write an Email",
  },
};

function chunkItems(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function buildUserStats(user, taskId, taskConfig) {
  const practiceTests = chunkItems(
    taskConfig.items,
    taskConfig.questionsPerTest,
  );
  const taskResults = getTaskTestResults(user.testResults, taskId);
  const testScores = [];
  let totalCorrect = 0;
  let totalQuestions = 0;

  practiceTests.forEach((testQuestions, index) => {
    const savedResult = taskResults[index] ?? taskResults[String(index)];
    const testScore = getTestScore(taskConfig.type, testQuestions, savedResult);

    if (!testScore) return;

    testScores.push({
      testIndex: index,
      score: testScore.score ?? testScore.answered,
      total: testScore.total,
    });

    totalCorrect += testScore.score ?? testScore.answered;
    totalQuestions += testScore.total;
  });

  const testsCompleted = testScores.length;
  const averagePercent =
    taskConfig.type === "email"
      ? testsCompleted > 0
        ? Math.round((testsCompleted / practiceTests.length) * 100)
        : 0
      : totalQuestions > 0
        ? Math.round((totalCorrect / totalQuestions) * 100)
        : 0;

  return {
    slug: user.slug,
    name: user.name,
    taskId,
    taskLabel: taskConfig.label,
    taskType: taskConfig.type,
    testsCompleted,
    totalTests: practiceTests.length,
    totalCorrect,
    totalQuestions,
    averagePercent,
    level: getScoreLevel(averagePercent, testsCompleted),
    testScores,
  };
}

export async function getStatistics(taskId = "build-sentence") {
  const taskConfig = TASK_CONFIG[taskId];

  if (!taskConfig) {
    throw new Error("Invalid task ID");
  }

  const practiceTests = chunkItems(
    taskConfig.items,
    taskConfig.questionsPerTest,
  );
  const users = await getUsersCollection();
  const allUsers = await users
    .find({}, { projection: { slug: 1, name: 1, testResults: 1 } })
    .toArray();

  const leaderboard = allUsers
    .map((user) => buildUserStats(user, taskId, taskConfig))
    .filter((user) => user.testsCompleted > 0)
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
    taskId,
    taskLabel: taskConfig.label,
    taskType: taskConfig.type,
    totalTests: practiceTests.length,
    questionsPerTest: taskConfig.questionsPerTest,
    users: leaderboard,
  };
}
