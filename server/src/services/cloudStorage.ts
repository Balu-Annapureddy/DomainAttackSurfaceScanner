import { safeHead } from './safeHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface CloudStorageCheckResult {
  bucketName: string;
  provider: 'AWS_S3' | 'AZURE_BLOB';
  url: string;
  status: 'publicly_accessible' | 'private_bucket_exists' | 'not_found' | 'error';
  httpStatus: number;
}

export interface CloudStorageOptions {
  budget?: ScanRequestBudget;
  signal?: AbortSignal;
}

/**
 * Checks for commonly-patterned public cloud storage namespaces.
 *
 * SCOPE BOUNDARY COMPLIANCE:
 * - Uses ONLY HTTP HEAD requests to determine existence and authorization status.
 * - NEVER downloads, lists, or exposes bucket contents.
 * - Respects the existing scan request budget and SSRF-safe resolution pathways.
 */
export async function checkCloudStorageExposure(
  domain: string,
  options: CloudStorageOptions = {},
): Promise<CloudStorageCheckResult[]> {
  const parts = domain.split('.');
  const baseName = parts.length > 2 ? parts[parts.length - 2] : parts[0];
  if (!baseName || baseName.length < 3) return [];

  // Generate a small, focused list of high-probability bucket namespace candidates
  const candidateNames = [
    baseName.toLowerCase(),
    `${baseName.toLowerCase()}-assets`,
    `${baseName.toLowerCase()}-static`,
  ];

  const results: CloudStorageCheckResult[] = [];

  for (const bucket of candidateNames) {
    if (options.budget?.isExhausted()) break;

    // AWS S3 Check
    const s3Url = `https://${bucket}.s3.amazonaws.com/`;
    try {
      const resp = await safeHead(s3Url, {
        budget: options.budget,
        signal: options.signal,
        timeoutMs: 3000,
      });

      if (resp.status === 200) {
        results.push({
          bucketName: bucket,
          provider: 'AWS_S3',
          url: s3Url,
          status: 'publicly_accessible',
          httpStatus: resp.status,
        });
      } else if (resp.status === 403) {
        results.push({
          bucketName: bucket,
          provider: 'AWS_S3',
          url: s3Url,
          status: 'private_bucket_exists',
          httpStatus: resp.status,
        });
      }
    } catch {
      // Bucket does not exist or network timed out
    }
  }

  return results;
}
