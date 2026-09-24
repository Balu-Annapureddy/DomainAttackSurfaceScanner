import { config } from '../config';

export class ScanRequestBudget {
  private readonly maxRequests: number;
  private currentRequests = 0;

  constructor(maxRequests: number = config.maxExternalRequests) {
    this.maxRequests = maxRequests;
  }

  public consume(count = 1, reason?: string): void {
    if (this.currentRequests + count > this.maxRequests) {
      const err = new Error(`Scan request budget exhausted: requested ${count}, remaining ${this.remaining()}/${this.maxRequests}${reason ? ` (${reason})` : ''}`);
      err.name = 'BudgetExhaustedError';
      throw err;
    }
    this.currentRequests += count;
  }

  public tryConsume(count = 1): boolean {
    if (this.currentRequests + count > this.maxRequests) {
      return false;
    }
    this.currentRequests += count;
    return true;
  }

  public remaining(): number {
    return Math.max(0, this.maxRequests - this.currentRequests);
  }

  public consumed(): number {
    return this.currentRequests;
  }

  public isExhausted(): boolean {
    return this.currentRequests >= this.maxRequests;
  }
}
