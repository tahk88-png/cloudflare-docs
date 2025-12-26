import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client: Redis;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.client = new Redis(redisUrl);
  }

  /**
   * Acquire distributed lock
   */
  async acquireLock(key: string, ttlSeconds: number): Promise<string> {
    const lockValue = `${Date.now()}-${Math.random()}`;
    const result = await this.client.set(key, lockValue, 'EX', ttlSeconds, 'NX');
    
    if (result === 'OK') {
      return lockValue;
    }
    
    throw new Error('Failed to acquire lock');
  }

  /**
   * Release distributed lock
   */
  async releaseLock(key: string, lockValue: string): Promise<void> {
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.client.eval(script, 1, key, lockValue);
  }

  /**
   * Set value with TTL
   */
  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.setex(key, ttlSeconds, value);
  }

  /**
   * Get value
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete key
   */
  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
