import Redis from "ioredis";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required to use Artist OS");
  }

  if (!redisClient) {
    redisClient = new Redis(url);
  }

  return redisClient;
}

export function resetRedisForTests() {
  redisClient = null;
}
