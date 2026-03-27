import { supabase } from "@/integrations/supabase/client";

export type LogLevel = 'info' | 'warn' | 'error' | 'security';

export const loggingService = {
  async log(level: LogLevel, message: string, extra: any = {}) {
    const timestamp = new Date().toISOString();
    const logInfo = {
      timestamp,
      level,
      message,
      extra: JSON.stringify(extra),
      user_agent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'N/A'
    };

    // 1. Console Output
    const styles = {
        info: 'color: #00bcd4',
        warn: 'color: #ff9800',
        error: 'color: #f44336; font-weight: bold',
        security: 'color: #ff5722; font-weight: bold; text-transform: uppercase'
    };
    
    console.log(`%c[${level.toUpperCase()}] ${message}`, (styles as any)[level], extra);

    // 2. Persistent Storage (Custom "system_logs" table in Supabase)
    try {
      const { error } = await (supabase as any).from("system_logs").insert([logInfo]);
      
      // Fallback to crash_reports if system_logs doesn't exist
      if (error && level === 'error') {
        await supabase.from("crash_reports").insert([{
            error_message: message,
            metadata: logInfo as any,
            url: logInfo.url,
            user_agent: logInfo.user_agent
        }]);
      }
    } catch (e) {
      // Don't loop or crash if logging itself fails
    }
  },

  async logAuthFailure(method: string, error: any) {
    await this.log('security', `Authentication Failure: ${method}`, { error: error?.message || error });
  },

  async logError(error: Error | any, context: string) {
    await this.log('error', `Runtime Error in ${context}`, { 
      message: error?.message || String(error),
      stack: error?.stack 
    });
  }
};
