import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { REDIS } from '../redis/redis.module';

// One unique ID per process — set at module load, never changes
const INSTANCE_ID = uuidv4();

const RELEASE_SCRIPT = `
  if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
  else
    return 0
  end
`;

@Injectable()
export class DistributedLockService {
  private readonly logger = new Logger(DistributedLockService.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  /**
   * Acquire a Redis lock and run fn only on the winning container.
   * Other containers that fire at the same time silently skip.
   *
   * @param key    Unique lock name — use the cron job name
   * @param ttlMs  Lock TTL in ms. Set to just under the cron interval so
   *               a crashed holder doesn't block the next scheduled run.
   * @param fn     The job body to execute
   */
  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const lockKey = `cron-lock:${key}`;

    // ioredis v5 overload resolution picks KEEPTTL last; cast to avoid it
    const acquired = await (this.redis.set as (
      k: string, v: string, px: 'PX', ms: number, nx: 'NX',
    ) => Promise<'OK' | null>)(lockKey, INSTANCE_ID, 'PX', ttlMs, 'NX');

    if (!acquired) {
      this.logger.debug(
        `[${key}] Skipped — lock already held by another instance`,
      );
      return null;
    }

    try {
      return await fn();
    } finally {
      // Lua script ensures we only release the lock we own
      await this.redis.eval(RELEASE_SCRIPT, 1, lockKey, INSTANCE_ID);
    }
  }
}
