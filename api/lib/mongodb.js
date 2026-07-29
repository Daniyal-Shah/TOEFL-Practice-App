import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

const options = {
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
};

let clientPromise;

export function getMongoClientPromise() {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
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
