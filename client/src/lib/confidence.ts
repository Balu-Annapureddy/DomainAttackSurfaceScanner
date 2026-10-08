/**
 * Formats a confidence level into a clean human label and styled badge classes.
 */
export function formatConfidence(confidence?: string): string {
  const c = (confidence || 'high').toLowerCase();
  if (c === 'high') return 'Confidence: High';
  if (c === 'medium') return 'Confidence: Medium';
  return 'Confidence: Low';
}

export function getConfidenceBadgeClass(confidence?: string): string {
  const c = (confidence || 'high').toLowerCase();
  if (c === 'high') {
    return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  }
  if (c === 'medium') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400';
  }
  return 'border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400';
}
