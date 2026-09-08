"use client";

import React, { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Next.js Error Boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-in fade-in duration-200">
        <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mx-auto mb-5 flex items-center justify-center text-2xl font-bold">
          💬
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {error?.message || "An unexpected error occurred while running the messenger application."}
        </p>
        <div className="flex items-center gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg active:scale-95"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            Reload Chat
          </button>
        </div>
      </div>
    </div>
  );
}
