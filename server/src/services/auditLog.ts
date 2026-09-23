import crypto from 'crypto';

export type AuditAction = 'demo_link_generated' | 'session_terminated' | 'data_exported';

export interface AuditEvent {
  id: string;
  action: AuditAction;
  demoRef: string | null;
  timestamp: string;
}

const events: AuditEvent[] = [];

export function recordAudit(action: AuditAction, demoId: string | null): AuditEvent {
  const event: AuditEvent = {
    id: `${Date.now()}-${events.length + 1}`,
    action,
    demoRef: demoId ? crypto.createHash('sha256').update(demoId).digest('hex').slice(0, 12) : null,
    timestamp: new Date().toISOString(),
  };
  events.push(event);
  return event;
}

export function getAuditEvents(): AuditEvent[] {
  return [...events].reverse();
}

export function clearAuditEvents(): void {
  events.length = 0;
}
