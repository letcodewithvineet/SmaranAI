import { MongoClient, ObjectId, type Document } from "mongodb";

const uri = process.env.MONGO_URL ?? process.env.MONGO_LOCAL_URL;
const dbName = process.env.MONGODB_DB ?? "virasatAI_db";
const collectionName = process.env.MONGODB_COLLECTION ?? "MiniJobPortal";

type GlobalWithMongo = typeof globalThis & {
  _virasatMongoClientPromise?: Promise<MongoClient>;
};

const globalWithMongo = globalThis as GlobalWithMongo;

function getClientPromise() {
  if (!uri) {
    throw new Error("MONGO_URL or MONGO_LOCAL_URL is not configured.");
  }

  if (!globalWithMongo._virasatMongoClientPromise) {
    const client = new MongoClient(uri);
    globalWithMongo._virasatMongoClientPromise = client.connect();
  }

  return globalWithMongo._virasatMongoClientPromise;
}

export async function getMemorialCollection() {
  const client = await getClientPromise();
  return client.db(dbName).collection(collectionName);
}

export async function saveMemorialRecord(record: Document) {
  const collection = await getMemorialCollection();
  const now = new Date();
  const result = await collection.insertOne({
    ...record,
    createdAt: now,
    updatedAt: now,
  });

  return result.insertedId.toString();
}

export async function listMemorialRecords(limit = 25) {
  const collection = await getMemorialCollection();
  return collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export async function updateMemorialRecord(id: string, record: Document) {
  const collection = await getMemorialCollection();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        ...record,
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" },
  );

  return result;
}

export async function updateMemorialMembership(
  id: string,
  membership: Document,
) {
  const collection = await getMemorialCollection();
  const now = new Date();
  const result = await collection.findOneAndUpdate(
    { _id: new ObjectId(id) },
    {
      $set: {
        membership: {
          ...membership,
          updatedAt: now,
        },
        updatedAt: now,
      },
    },
    { returnDocument: "after" },
  );

  return result;
}

export async function deleteMemorialRecord(id: string) {
  const collection = await getMemorialCollection();
  const result = await collection.deleteOne({ _id: new ObjectId(id) });
  return result.deletedCount === 1;
}
