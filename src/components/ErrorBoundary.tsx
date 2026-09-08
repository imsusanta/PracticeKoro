import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h1>
                        <p className="text-slate-500 mb-4">
                            We encountered an unexpected error. Please try refreshing the page.
                        </p>

                        {this.state.error && (
                            <div className="mb-6 p-3 rounded-xl bg-red-50 border border-red-200 text-left overflow-auto max-h-36 text-xs text-red-700 font-mono">
                                <p className="font-bold">{this.state.error.message}</p>
                                {this.state.error.stack && (
                                    <pre className="text-[10px] text-red-500 mt-1 whitespace-pre-wrap truncate">
                                        {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <Button
                                onClick={() => window.location.reload()}
                                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2"
                            >
                                <RefreshCw className="w-5 h-5" />
                                Refresh Page
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => window.location.href = "/"}
                                className="w-full h-12 border-slate-200 text-slate-600 rounded-xl gap-2"
                            >
                                <Home className="w-5 h-5" />
                                Back to Home
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
