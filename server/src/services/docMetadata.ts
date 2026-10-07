import { safeGet } from './safeHttp';
import type { ScanRequestBudget } from './scanBudget';

export interface DocumentMetadataRecord {
  url: string;
  fileType: 'PDF' | 'DOCX' | 'XLSX';
  creationTool?: string;
  softwareVersion?: string;
  creationDate?: string;
  hasAuthorField: boolean;
  authorFieldSanitized?: string;
}

export interface DocumentMetadataOptions {
  budget?: ScanRequestBudget;
  signal?: AbortSignal;
}

/**
 * Extracts links to public PDF/DOCX/XLSX files from already-fetched HTML page bodies.
 * Strictly avoids new crawling or URL guessing.
 */
export function findLinkedDocuments(htmlBodies: string[], targetDomain: string): string[] {
  const found = new Set<string>();
  const linkRegex = /href=["']([^"']+\.(pdf|docx|xlsx))(?:\?[^"']*)?["']/gi;

  for (const body of htmlBodies) {
    if (!body) continue;
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(body)) !== null) {
      const rawUrl = match[1];
      if (!rawUrl) continue;
      try {
        const fullUrl = new URL(rawUrl, `https://${targetDomain}/`);
        // Only inspect documents hosted under target domain or child subdomain
        if (
          fullUrl.hostname === targetDomain ||
          fullUrl.hostname.endsWith(`.${targetDomain}`)
        ) {
          found.add(fullUrl.toString());
        }
      } catch {
        // Invalid URL
      }
    }
  }

  return Array.from(found);
}

/**
 * Inspects public documents linked on the target domain for embedded metadata (software version, tool).
 *
 * SCOPE BOUNDARY COMPLIANCE:
 * - Strictly redacts any personal employee names from author fields.
 * - Extracts only tooling, software versions, and creation timestamps.
 */
export async function extractDocumentMetadata(
  documentUrls: string[],
  options: DocumentMetadataOptions = {},
): Promise<DocumentMetadataRecord[]> {
  const results: DocumentMetadataRecord[] = [];
  const urlsToInspect = documentUrls.slice(0, 2); // Cap at 2 documents to conserve budget

  for (const docUrl of urlsToInspect) {
    if (options.budget?.isExhausted()) break;

    try {
      const resp = await safeGet(docUrl, {
        budget: options.budget,
        signal: options.signal,
        timeoutMs: 4000,
      });

      const body = resp.body || '';
      const isPdf = docUrl.toLowerCase().includes('.pdf');
      const isDocx = docUrl.toLowerCase().includes('.docx');
      const isXlsx = docUrl.toLowerCase().includes('.xlsx');

      const fileType: 'PDF' | 'DOCX' | 'XLSX' = isPdf ? 'PDF' : isDocx ? 'DOCX' : isXlsx ? 'XLSX' : 'PDF';

      let creationTool: string | undefined;
      let creationDate: string | undefined;
      let hasAuthor = false;

      if (isPdf) {
        // Parse PDF trailer dictionary string entries
        const creatorMatch = body.match(/\/Creator\s*\(([^)]+)\)/i);
        const producerMatch = body.match(/\/Producer\s*\(([^)]+)\)/i);
        const dateMatch = body.match(/\/CreationDate\s*\(([^)]+)\)/i);
        const authorMatch = body.match(/\/Author\s*\(([^)]+)\)/i);

        if (creatorMatch) creationTool = creatorMatch[1];
        else if (producerMatch) creationTool = producerMatch[1];

        if (dateMatch?.[1]) creationDate = dateMatch[1];
        if (authorMatch?.[1]?.trim()) hasAuthor = true;
      } else if (isDocx || isXlsx) {
        // Inspect XML tags embedded inside OpenXML files
        const appMatch = body.match(/<Application>([^<]+)<\/Application>/i);
        const verMatch = body.match(/<AppVersion>([^<]+)<\/AppVersion>/i);
        const dateMatch = body.match(/<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/i);
        const creatorMatch = body.match(/<dc:creator>([^<]+)<\/dc:creator>/i);

        if (appMatch?.[1]) {
          creationTool = verMatch?.[1] ? `${appMatch[1]} (v${verMatch[1]})` : appMatch[1];
        }
        if (dateMatch?.[1]) creationDate = dateMatch[1];
        if (creatorMatch?.[1]?.trim()) hasAuthor = true;
      }

      results.push({
        url: docUrl,
        fileType,
        creationTool: creationTool || undefined,
        creationDate: creationDate || undefined,
        hasAuthorField: hasAuthor,
        // STRICT SCOPE BOUNDARY: Redact any individual personal identity
        authorFieldSanitized: hasAuthor ? '[Author field populated — redacted for privacy]' : undefined,
      });
    } catch {
      // Continue gracefully if document cannot be fetched
    }
  }

  return results;
}
