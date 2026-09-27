// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

function BuggyComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Simulated WebGL/DOM Crash');
  }
  return <div data-testid="normal-content">System Operational</div>;
}

describe('ErrorBoundary render-crash behavior', () => {
  beforeEach(() => {
    // Suppress React / console.error output during deliberate throw
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children without error when no crash occurs', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId('normal-content')).toBeDefined();
    expect(screen.getByText('System Operational')).toBeDefined();
  });

  it('catches render errors and displays workstation fallback UI', () => {
    render(
      <ErrorBoundary>
        <BuggyComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText(/OPERATIONAL EXCEPTION INTERCEPTED/i)).toBeDefined();
    expect(screen.getByText(/Simulated WebGL\/DOM Crash/i)).toBeDefined();
    expect(screen.getByText(/RELOAD WORKSTATION/i)).toBeDefined();
    expect(screen.getByText(/RETURN TO DASHBOARD/i)).toBeDefined();
  });
});
