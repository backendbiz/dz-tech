import { MongoClient, Db } from 'mongodb'

const MONGODB_URI = process.env.DATABASE_URI as string

if (!MONGODB_URI) {
  throw new Error('Please define the DATABASE_URI environment variable')
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined
}

const options = {
  maxPoolSize: 10, // max connections in pool
  minPoolSize: 2, // keep at least 2 connections warm
  maxIdleTimeMS: 30000, // close idle connections after 30s
  serverSelectionTimeoutMS: 5000, // fail fast if MongoDB is unreachable
  socketTimeoutMS: 45000,
}

function createClient(): MongoClient {
  return new MongoClient(MONGODB_URI, options)
}

// In development, reuse the client across HMR reloads to avoid connection leaks
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClient) {
    global._mongoClient = createClient()
  }
}

const client: MongoClient =
  process.env.NODE_ENV === 'development' ? global._mongoClient! : createClient()

// Connect once and reuse — MongoClient manages the pool internally
const clientPromise: Promise<MongoClient> = client.connect()

export async function getDb(dbName?: string): Promise<Db> {
  const connectedClient = await clientPromise
  return connectedClient.db(dbName)
}

// Call this only on process exit or in tests — not after each request
export async function closeDb(): Promise<void> {
  await client.close()
  if (process.env.NODE_ENV === 'development') {
    global._mongoClient = undefined
  }
}
