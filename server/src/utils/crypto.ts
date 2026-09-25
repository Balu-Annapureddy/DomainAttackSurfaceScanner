import crypto from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_OPTIONS: crypto.ScryptOptions = {
  N: 16384, // CPU/memory cost parameter (standard recommendation)
  r: 8,     // Block size parameter
  p: 1,     // Parallelization parameter
};

/**
 * Derives a secure password hash using the Scrypt key derivation function (RFC 7914).
 * Scrypt is memory-hard and highly resistant to specialized ASIC/GPU hardware brute-forcing.
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt:${salt}:${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verifies a candidate password against an existing scrypt hash using constant-time comparison.
 * Prevents timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const parts = storedHash.split(':');
    if (parts.length !== 3 || parts[0] !== 'scrypt') {
      return resolve(false);
    }

    const salt = parts[1];
    const keyHex = parts[2];
    if (!salt || !keyHex) {
      return resolve(false);
    }
    const originalKey = Buffer.from(keyHex, 'hex');

    crypto.scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (err, derivedKey) => {
      if (err) return reject(err);
      if (originalKey.length !== derivedKey.length) {
        return resolve(false);
      }
      resolve(crypto.timingSafeEqual(originalKey, derivedKey));
    });
  });
}

/**
 * Validates basic password security constraints without unnecessary complexity.
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, reason: 'Password cannot exceed 128 characters' };
  }
  return { valid: true };
}
