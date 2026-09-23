async function fetchJsonWithTimeout(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`CT log lookup returned ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function runSubdomains(domain: string): Promise<{ available: boolean; total: number; subdomains: string[]; reason?: string; }> {
  try {
    const data = (await fetchJsonWithTimeout(`https://crt.sh/?q=%25.${encodeURIComponent(domain)}&output=json`)) as Array<Record<string, unknown>>;
    const names = new Set<string>();

    if (Array.isArray(data)) {
      for (const entry of data) {
        const rawNames = typeof entry?.name_value === 'string' ? entry.name_value : '';
        for (const value of rawNames.split(/\r?\n/)) {
          const cleaned = value.trim().toLowerCase().replace(/^\*\./, '');
          if (!cleaned) {
            continue;
          }

          if (cleaned === domain || cleaned.endsWith(`.${domain}`)) {
            names.add(cleaned);
          }
        }
      }
    }

    const subdomains = [...names].sort();
    return {
      available: true,
      total: subdomains.length,
      subdomains,
    };
  } catch (error) {
    return {
      available: false,
      total: 0,
      subdomains: [],
      reason: error instanceof Error ? error.message : 'Certificate Transparency data unavailable',
    };
  }
}
