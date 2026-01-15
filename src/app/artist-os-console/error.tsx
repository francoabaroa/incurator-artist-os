"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ConsoleError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Console error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-8">
      <div className="w-full max-w-md rounded-xl border border-red-200 bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-5 w-5 text-red-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Console Error
          </h2>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Something went wrong while rendering the console. This is usually a
          temporary issue.
        </p>

        <pre className="mb-4 max-h-32 overflow-auto rounded-lg bg-slate-50 p-3 text-xs text-red-700">
          {error.message}
        </pre>

        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
            onClick={reset}
            type="button"
          >
            Try Again
          </button>
          <button
            className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => window.location.reload()}
            type="button"
          >
            Reload Page
          </button>
        </div>

        {error.digest && (
          <p className="mt-4 text-center text-xs text-slate-400">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
