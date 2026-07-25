import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import App from './App'
import './index.css'

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
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="max-w-md bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">!</div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-xs text-slate-400 font-mono bg-slate-900 p-3 rounded-lg overflow-x-auto text-left">
              {this.state.error?.message || 'An unexpected UI error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2 bg-brand-500 hover:bg-brand-600 font-bold text-xs rounded-xl transition-all"
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
