import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import Redis from 'ioredis';

@Injectable()
export class UserThrottlerStorageService implements ThrottlerStorage {
  constructor(@InjectRedis() private readonly redis: Redis) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, ttl);
    }

    const timeToExpire = await this.redis.ttl(key);
    const isBlocked = count > limit;

    return {
      totalHits: count,
      timeToExpire: timeToExpire > 0 ? timeToExpire : 0,
      isBlocked,
      timeToBlockExpire: isBlocked ? blockDuration : 0,
    };
  }

  async getRecord(key: string): Promise<ThrottlerStorageRecord | null> {
    const count = await this.redis.get(key);
    const ttl = await this.redis.ttl(key);

    if (!count || ttl < 0) return null;

    return {
      totalHits: parseInt(count, 10),
      timeToExpire: ttl,
      isBlocked: parseInt(count, 10) > 0,
      timeToBlockExpire: ttl,
    };
  }
}
