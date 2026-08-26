import React, { Component, ErrorInfo, ReactNode } from 'react';
import { clear as clearIdb } from 'idb-keyval';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught React Error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleClearCacheAndReload = async () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      await clearIdb();
    } catch (_) {}
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "Une erreur inconnue s'est produite.";
      const stack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 border-t-4 border-t-[#E85D42] p-8 shadow-2xl rounded-none text-left">
            <div className="flex items-center justify-between mb-6">
              <div className="w-10 h-10 bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#E85D42] bg-[#E85D42]/10 border border-[#E85D42]/20 px-2 py-0.5">
                RÉCUPÉRATION SYSTÈME
              </span>
            </div>
            
            <h1 className="text-lg font-black uppercase tracking-wider mb-2 text-white">
              Une interruption d'affichage est survenue
            </h1>
            <p className="text-zinc-400 text-xs leading-relaxed mb-4">
              L'interface a intercepté une exception dans le rendu. Vos données enregistrées restent en sécurité.
            </p>

            <div className="bg-black/70 border border-zinc-800 p-3 mb-6 overflow-x-auto rounded max-h-40">
              <p className="text-[11px] font-mono text-red-400 font-bold break-words mb-1">
                {errorMessage}
              </p>
              {stack && (
                <pre className="text-[9px] font-mono text-zinc-500 whitespace-pre-wrap line-clamp-4">
                  {stack}
                </pre>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 bg-[#E85D42] hover:bg-[#D45037] text-white text-xs font-black uppercase tracking-widest py-3 px-4 transition-colors text-center cursor-pointer"
              >
                Recharger
              </button>
              <button
                onClick={this.handleClearCacheAndReload}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-wider py-3 px-4 transition-colors text-center border border-zinc-700 cursor-pointer"
              >
                Vider le Cache &amp; Accueil
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
