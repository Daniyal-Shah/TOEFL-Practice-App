import { getUsersCollection } from "./mongodb.js";
import { slugifyName } from "./slug.js";

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

  return {
    slug: user.slug,
    name: user.name,
    testResults: user.testResults || {},
  };
}

export async function getUserBySlug(slug) {
  const users = await getUsersCollection();
  const user = await users.findOne({ slug });

  if (!user) {
    return null;
  }

  return {
    slug: user.slug,
    name: user.name,
    testResults: user.testResults || {},
  };
}

export async function saveUserTestResult(slug, testIndex, answers) {
  if (!Array.isArray(answers)) {
    throw new Error("Answers are required");
  }

  const users = await getUsersCollection();
  const user = await users.findOne({ slug });

  if (!user) {
    return null;
  }

  const testKey = String(testIndex);
  const now = new Date();
  const updatePath = `testResults.${testKey}`;

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
    testResults: updatedUser.testResults || {},
  };
}

export async function deleteUserTestResult(slug, testIndex) {
  const users = await getUsersCollection();
  const user = await users.findOne({ slug });

  if (!user) {
    return null;
  }

  const testKey = String(testIndex);
  const now = new Date();
  const updatePath = `testResults.${testKey}`;

  await users.updateOne(
    { slug },
    {
      $unset: { [updatePath]: "" },
      $set: { updatedAt: now },
    },
  );

  const updatedUser = await users.findOne({ slug });

  return {
    testResults: updatedUser.testResults || {},
  };
}

export async function checkDatabaseConnection() {
  const users = await getUsersCollection();
  await users.findOne({}, { projection: { _id: 1 } });
  return true;
}
