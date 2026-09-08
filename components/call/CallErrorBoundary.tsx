"use client";

import React, { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class CallErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: any): State {
    return {
      hasError: true,
      errorMessage: error?.message || "A browser media error occurred during the call.",
    };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("CallErrorBoundary caught call error:", error, errorInfo);
  }

  handleDismiss = () => {
    this.setState({ hasError: false, errorMessage: "" });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto mb-4 flex items-center justify-center text-2xl font-bold">
              !
            </div>
            <h3 className="text-base font-semibold text-slate-100 mb-2">
              Call Disconnected
            </h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              {this.state.errorMessage || "Your device or browser encountered an issue with audio/video media."}
            </p>
            <button
              onClick={this.handleDismiss}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg active:scale-95"
            >
              Return to Chat
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
