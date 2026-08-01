import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const CONNECTION_TIMEOUT_MS = 12000;

const options = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

function withTimeout(promise, ms, message) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function resetClientPromise() {
  global._mongoClientPromise = null;
}

export function getMongoClientPromise() {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);

    global._mongoClientPromise = withTimeout(
      client.connect(),
      CONNECTION_TIMEOUT_MS,
      "MongoDB connection timed out. If MONGODB_URI uses mongodb+srv://, switch to the standard mongodb:// string from Atlas or use DNS 8.8.8.8.",
    ).catch((error) => {
      resetClientPromise();
      client.close().catch(() => {});
      throw error;
    });
  }

  return global._mongoClientPromise;
}

export function getDb() {
  const dbName = process.env.MONGODB_DB_NAME || "building_sentence_app";
  return getMongoClientPromise().then((client) => client.db(dbName));
}

export function getUsersCollection() {
  return getDb().then((db) => db.collection("users"));
}

export default getMongoClientPromise;
