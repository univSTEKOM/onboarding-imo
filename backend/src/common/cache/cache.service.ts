import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async clearKeys(pattern: string): Promise<void> {
    interface RedisStore {
      client?: {
        scan: (
          cursor: number,
          options: { MATCH: string; COUNT: number },
        ) => Promise<{ cursor: number; keys: string[] } | [string, string[]]>;
        del: (keys: string[]) => Promise<any>;
      };
      keys?: (pattern: string) => Promise<string[]>;
      del?: (keys: string[]) => Promise<any>;
    }
    const store = this.cacheManager.store as unknown as RedisStore;

    // Check if the store has a Redis client
    if (store.client) {
      const client = store.client;
      let cursor = 0;
      do {
        // node-redis v4+ scan returns { cursor: number, keys: string[] }
        // but cache-manager-redis-yet might expose it differently or use a specific version.
        // Let's handle generic scan if possible, but assuming node-redis v4 style or similar.
        // Actually, cache-manager-redis-yet v4/v5 uses node-redis v4.

        const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });

        // Handle different return types based on client version/lib
        let keys: string[] = [];
        if (typeof reply === 'object' && 'cursor' in reply && 'keys' in reply) {
          cursor = reply.cursor;
          keys = reply.keys;
        } else if (Array.isArray(reply)) {
          // ioredis style or older node-redis: [cursor, [keys]]
          cursor = Number(reply[0]);
          keys = reply[1];
        }

        if (keys.length > 0) {
          await client.del(keys);
        }
      } while (cursor !== 0);
    } else if (store.keys && store.del) {
      // Fallback for non-Redis stores (e.g. memory)
      const keys = await store.keys(pattern);
      if (keys.length > 0) {
        await store.del(keys);
      }
    }
  }
}
