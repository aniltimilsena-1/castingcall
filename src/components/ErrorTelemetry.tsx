import React, { Component, ErrorInfo, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldAlert, RefreshCcw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  userId?: string;
}

interface State {
  hasError: boolean;
  errorMsg: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorMsg: ""
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMsg: error.message };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("🚨 APP CRASH DETECTED:", error, errorInfo);
    
    // Send report to telemetry table
    this.reportCrash(error, errorInfo);
  }

  private async reportCrash(error: Error, errorInfo: ErrorInfo) {
    try {
      await (supabase.from('crash_reports' as any) as any).insert({
        user_id: this.props.userId || null,
        error_message: error.message || 'Unknown Error',
        error_stack: error.stack || null,
        component_stack: errorInfo.componentStack || null,
        url: window.location.href,
        user_agent: navigator.userAgent,
        metadata: {
           screenWidth: window.innerWidth,
           screenHeight: window.innerHeight,
           language: navigator.language
        }
      });
    } catch (e) {
      console.warn("Failed to send crash report:", e);
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-white text-center">
          <div className="max-w-md w-full space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-2xl shadow-red-500/10">
                <ShieldAlert size={48} className="text-red-500 animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl font-display uppercase tracking-widest text-white">System <span className="text-red-500">Stability</span> Issue</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                CaastingCall encountered an unexpected runtime error. A diagnostic report has been sent to our command center for inspection.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-left overflow-hidden">
                <p className="text-[0.6rem] text-muted-foreground uppercase tracking-widest mb-1 opacity-50 font-bold">Error Signature</p>
                <code className="text-[0.65rem] text-red-400 font-mono break-all">{this.state.errorMsg}</code>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => window.location.reload()}
                className="flex-1 bg-white text-black py-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/90 transition-all"
              >
                <RefreshCcw size={14} /> Restart System
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="flex-1 bg-white/5 border border-white/10 py-4 rounded-2xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
              >
                <Home size={14} /> Back Home
              </button>
            </div>
            
            <p className="text-[0.5rem] text-muted-foreground uppercase tracking-widest opacity-30 mt-12">
              Automated Diagnostic Telemetry v1.0.1
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
