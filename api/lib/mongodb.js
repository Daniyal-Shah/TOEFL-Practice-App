import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const options = {};

let client;
let clientPromise;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;

export function getDb() {
  const dbName = process.env.MONGODB_DB_NAME || "building_sentence_app";
  return clientPromise.then((client) => client.db(dbName));
}

export function getUsersCollection() {
  return getDb().then((db) => db.collection("users"));
}
