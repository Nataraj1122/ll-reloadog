import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-white">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-8">
            <AlertTriangle size={40} />
          </div>
          <h1 className="text-3xl font-serif mb-4 uppercase tracking-tighter">Something went wrong</h1>
          <p className="text-zinc-500 max-w-md mb-10 text-sm leading-relaxed uppercase tracking-widest font-medium">
            We encountered an unexpected error while loading this page. 
            The RELOAD team has been notified.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-3 px-10 py-4 bg-black text-white text-[11px] uppercase tracking-[0.3em] font-bold hover:bg-zinc-800 transition-all shadow-xl"
          >
            <RefreshCw size={16} />
            Refresh Page
          </button>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mt-12 p-6 bg-zinc-50 border border-zinc-100 rounded text-left max-w-2xl w-full overflow-auto">
              <p className="text-xs font-bold text-red-600 mb-2 uppercase tracking-widest">Error Details (Dev Only):</p>
              <pre className="text-[10px] text-zinc-600 font-mono whitespace-pre-wrap">
                {this.state.error.toString()}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
