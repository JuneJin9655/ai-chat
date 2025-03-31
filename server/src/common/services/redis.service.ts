import { InjectRedis } from '@nestjs-modules/ioredis';
import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

// 定义数据类型接口
interface ChatMessagesData {
  messages: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  source?: string;
  queryTime?: number;
}

// 定义缓存统计接口
interface CacheStats {
  hitRate: string;
  hits: number;
  misses: number;
  redisInfo: Record<string, string>;
}

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@InjectRedis() private readonly _redis: Redis) {}

  // 添加 getter 方法以允许访问 Redis 客户端
  get redis(): Redis {
    return this._redis;
  }

  async cacheChatMessages(
    chatId: string,
    page: number,
    limit: number,
    data: ChatMessagesData,
  ): Promise<void> {
    try {
      const key = this.getChatMessagesKey(chatId, page, limit);

      const isPopular = data.pagination?.total > 50;
      const ttl = isPopular ? 3600 : 300;
      await this._redis.setex(key, ttl, JSON.stringify(data));
      this.logger.debug(`Cached chat messages for ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(
        `Error caching chat messages: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getCachedChatMessages(
    chatId: string,
    page: number,
    limit: number,
  ): Promise<ChatMessagesData | null> {
    try {
      const key = this.getChatMessagesKey(chatId, page, limit);
      const data = await this._redis.get(key);

      if (!data) {
        this.cacheMisses++;
        return null;
      }

      this.cacheHits++;
      this.logger.debug(`Cache hit for ${key}`);
      return JSON.parse(data) as ChatMessagesData;
    } catch (error) {
      this.cacheMisses++;
      this.logger.error(
        `Error retrieving cached messages: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async invalidateChatCache(chatId: string): Promise<void> {
    try {
      const pattern = `app:chat:${chatId}:messages:*`;

      const keys = await this._redis.keys(pattern);

      if (keys.length > 0) {
        await this._redis.del(keys);
        this.logger.debug(
          `Invalidated ${keys.length} cache entries for chat ${chatId}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error invalidating chat cache: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async updateChatPopularity(
    chatId: string,
    messageCount: number,
  ): Promise<void> {
    try {
      if (messageCount > 50) {
        const pattern = `app:chat:${chatId}:messages:*`;
        const keys = await this._redis.keys(pattern);

        const pipeline = this._redis.pipeline();
        for (const key of keys) {
          pipeline.expire(key, 3600);
        }

        await pipeline.exec();
        this.logger.debug(
          `Updated TTL for ${keys.length} popular chat cache entries`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error updating chat popularity: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private getChatMessagesKey(
    chatId: string,
    page: number,
    limit: number,
  ): string {
    return `chat:${chatId}:messages:p${page}:l${limit}`;
  }

  //---------------------Watch------------------------//
  private cacheHits = 0;
  private cacheMisses = 0;

  async getCacheStats(): Promise<CacheStats> {
    const info = await this._redis.info();

    // 计算命中率
    const hitRate =
      this.cacheHits + this.cacheMisses > 0
        ? (this.cacheHits / (this.cacheHits + this.cacheMisses)) * 100
        : 0;

    return {
      hitRate: `${hitRate.toFixed(2)}%`,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      redisInfo: this.parseRedisInfo(info),
    };
  }

  // 辅助方法：解析 Redis INFO 命令返回的信息
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }
}
