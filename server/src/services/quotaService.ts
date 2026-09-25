import type { Request } from 'express';
import { db } from '../db';
import { config } from '../config';
import type { QuotaInfo, User } from '../../../shared/types';

export function getIdentityKey(req: Request, user?: User | null): { key: string; isRegistered: boolean; limit: number } {
  if (user) {
    return {
      key: `user:${user.id}`,
      isRegistered: true,
      limit: config.registeredScanLimit,
    };
  }

  // Express req.ip respects app.set('trust proxy', config.trustProxy)
  // When trust proxy is disabled, Express safely ignores client-supplied X-Forwarded-For.
  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  return {
    key: `ip:${ip}`,
    isRegistered: false,
    limit: config.anonymousScanLimit,
  };
}

export async function getQuotaStatus(req: Request, user?: User | null): Promise<QuotaInfo> {
  const { key, isRegistered, limit } = getIdentityKey(req, user);
  const quota = await db.getQuota(key, config.scanLimitWindowMs);
  const now = Date.now();
  const elapsed = now - quota.windowStart;
  const remainingTimeMs = Math.max(0, config.scanLimitWindowMs - elapsed);
  const resetsInSeconds = Math.ceil(remainingTimeMs / 1000);

  const used = quota.scanCount;
  const remaining = Math.max(0, limit - used);

  return {
    used,
    limit,
    remaining,
    resetsInSeconds,
    isRegistered,
  };
}

export async function consumeScanQuota(req: Request, user?: User | null): Promise<{ allowed: boolean; quota: QuotaInfo }> {
  const { key, isRegistered, limit } = getIdentityKey(req, user);
  const result = await db.tryConsumeQuota(key, limit, config.scanLimitWindowMs);

  const quota: QuotaInfo = {
    used: result.used,
    limit,
    remaining: result.remaining,
    resetsInSeconds: result.resetsInSeconds,
    isRegistered,
  };

  return {
    allowed: result.allowed,
    quota,
  };
}
