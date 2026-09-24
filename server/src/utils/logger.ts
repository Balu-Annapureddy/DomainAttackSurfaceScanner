export function logEvent(event: string, fields: Record<string, string | number | boolean | undefined> = {}): void {
  console.info(JSON.stringify({ timestamp: new Date().toISOString(), event, ...fields }));
}

export function logError(event: string, error: unknown, fields: Record<string, string | number | boolean | undefined> = {}): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    error: error instanceof Error ? error.message : String(error),
    ...fields,
  }));
}
