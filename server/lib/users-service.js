import { getUsersCollection } from "./mongodb.js";
import { slugifyName } from "./slug.js";
import { migrateTestResults } from "./test-results.js";

function formatUser(user) {
  return {
    slug: user.slug,
    name: user.name,
    testResults: migrateTestResults(user.testResults || {}),
  };
}

export async function upsertUser(name) {
  const trimmed = name?.trim();
  if (!trimmed) {
    throw new Error("Name is required");
  }

  const slug = slugifyName(trimmed);
  const users = await getUsersCollection();
  const now = new Date();

  await users.updateOne(
    { slug },
    {
      $setOnInsert: { slug, createdAt: now, testResults: {} },
      $set: { name: trimmed, updatedAt: now },
    },
    { upsert: true },
  );

  const user = await users.findOne({ slug });

  return formatUser(user);
}

export async function getUserBySlug(slug) {
  const users = await getUsersCollection();
  const user = await users.findOne({ slug });

  if (!user) {
    return null;
  }

  return formatUser(user);
}

export async function saveUserTestResult(slug, taskId, testIndex, answers) {
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  if (answers === undefined || answers === null) {
    throw new Error("Answers are required");
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ slug });

  if (!user) {
    return null;
  }

  const testKey = String(testIndex);
  const now = new Date();
  const updatePath = `testResults.${taskId}.${testKey}`;

  await users.updateOne(
    { slug },
    {
      $set: {
        [updatePath]: {
          answers,
          completedAt: now,
        },
        updatedAt: now,
      },
    },
  );

  const updatedUser = await users.findOne({ slug });

  return {
    testResults: migrateTestResults(updatedUser.testResults || {}),
  };
}

export async function deleteUserTestResult(slug, taskId, testIndex) {
  if (!taskId) {
    throw new Error("Task ID is required");
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ slug });

  if (!user) {
    return null;
  }

  const testKey = String(testIndex);
  const now = new Date();
  const updatePath = `testResults.${taskId}.${testKey}`;

  await users.updateOne(
    { slug },
    {
      $unset: { [updatePath]: "" },
      $set: { updatedAt: now },
    },
  );

  const updatedUser = await users.findOne({ slug });

  return {
    testResults: migrateTestResults(updatedUser.testResults || {}),
  };
}

export async function checkDatabaseConnection() {
  const users = await getUsersCollection();
  await users.findOne({}, { projection: { _id: 1 } });
  return true;
}
