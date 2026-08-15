import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './index.css'

// Listen for dynamic import errors emitted by Vite when a new deployment occurs
window.addEventListener('vite:preloadError', (event) => {
  console.warn('[Deployment Updated]: Reloading page to fetch the latest application build...');
  window.location.reload();
});

interface Props {
  children?: ReactNode;
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
    console.error('Uncaught error in React Component Tree:', error, errorInfo);

    // Auto-reload seamlessly if a new build deleted old hashed JS chunks
    const isChunkError =
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('Loading chunk');

    if (isChunkError) {
      const lastReload = sessionStorage.getItem('last_chunk_reload');
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload) > 8000) {
        sessionStorage.setItem('last_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Failed to fetch');

      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">!</div>
            <h2 className="text-lg font-bold">{isChunkError ? 'New Update Available' : 'Something went wrong'}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isChunkError
                ? 'A new system update was deployed. Please reload to load the latest version.'
                : (this.state.error?.message || 'An unexpected UI error occurred.')}
            </p>
            <button
              onClick={() => {
                sessionStorage.removeItem('last_chunk_reload');
                sessionStorage.removeItem('page_has_been_force_refreshed');
                window.location.reload();
              }}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 font-bold text-xs rounded-xl transition-all shadow-md"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
