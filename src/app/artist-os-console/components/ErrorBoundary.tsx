"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to show when an error occurs */
  fallback?: ReactNode;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Reset key - changing this resets the error boundary */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary component that catches rendering errors in child components.
 * Prevents crashes from propagating and provides a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when resetKey changes
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-icon">⚠️</div>
          <div className="error-boundary-message">
            <strong>Something went wrong</strong>
            <p>{this.state.error?.message ?? "An unexpected error occurred"}</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Inline error boundary for json-render blocks.
 * Shows a compact error message that doesn't disrupt the message flow.
 */
export class JsonRenderErrorBoundary extends Component<
  { children: ReactNode; content?: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; content?: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[JsonRenderErrorBoundary] Component render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="json-render-error">
          <strong>Render error</strong>
          <p>{this.state.error?.message ?? "Failed to render component"}</p>
          {this.props.content && (
            <details>
              <summary>Show payload</summary>
              <pre className="json-render-raw">
                <code>{this.props.content}</code>
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
