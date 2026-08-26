import React, { Component, ErrorInfo, ReactNode } from 'react';
import { clear as clearIdb } from 'idb-keyval';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleClearCacheAndReload = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await clearIdb();
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 p-8 shadow-2xl rounded-none text-left">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center mb-6">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            
            <h1 className="text-xl font-black uppercase tracking-wider mb-2 text-white">
              Une erreur est survenue
            </h1>
            <p className="text-zinc-400 text-xs leading-relaxed mb-6">
              L&apos;application a rencontré une interruption inattendue. Vous pouvez tenter de recharger ou réinitialiser le cache local.
            </p>

            {this.state.error?.message && (
              <div className="bg-black/50 border border-zinc-800 p-3 mb-6 overflow-x-auto">
                <p className="text-[11px] font-mono text-red-400 font-semibold break-words">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={this.handleReset}
                className="w-full bg-[#E85D42] hover:bg-[#D45037] text-white text-xs font-black uppercase tracking-widest py-3 px-4 transition-colors text-center"
              >
                Recharger l&apos;application
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider py-2 px-4 transition-colors text-center border border-zinc-700"
              >
                Vider le cache local &amp; Relancer
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
