import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] flex items-center justify-center p-4 font-mono">
          <div className="w-full max-w-lg console-panel p-6 sm:p-8 space-y-4 border border-[#dc2626] dark:border-[#ff4d5e] shadow-2xl text-center rounded-xl">
            <div className="w-12 h-12 rounded-full bg-[#dc2626]/10 text-[#dc2626] dark:text-[#ff4d5e] flex items-center justify-center mx-auto">
              <AlertOctagon size={24} />
            </div>

            <div>
              <h1 className="text-base font-bold tracking-wider uppercase text-[var(--text-primary)]">
                OPERATIONAL EXCEPTION INTERCEPTED
              </h1>
              <p className="text-xs text-[var(--text-secondary)] font-sans mt-1">
                An unhandled render exception occurred within the workstation interface.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-[var(--bg-panel-inset)] border border-[var(--border-muted)] rounded-lg text-left text-[11px] font-mono text-[#dc2626] dark:text-[#ff4d5e] max-h-36 overflow-y-auto break-all">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="console-btn console-btn-primary w-full sm:w-auto px-4 py-2 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={13} />
                <span>RELOAD WORKSTATION</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="console-btn w-full sm:w-auto px-4 py-2 text-xs cursor-pointer"
              >
                RETURN TO DASHBOARD
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
