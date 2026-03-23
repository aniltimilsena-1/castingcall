import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { VideoProvider } from "@/contexts/VideoContext";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Data is fresh for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
    },
  },
});

console.log("🛠️ App.tsx script loading... [v15]");

const App = () => {
  console.log("🎬 App component executing...");
  try {
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <VideoProvider>
              <ConfirmationProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/profile" element={<Index />} />
                      <Route path="/profile/:id" element={<Index />} />
                      <Route path="/search" element={<Index />} />
                      <Route path="/feed" element={<Index />} />
                      <Route path="/projects" element={<Index />} />
                      <Route path="/notifications" element={<Index />} />
                      <Route path="/messages" element={<Index />} />
                      <Route path="/settings" element={<Index />} />
                      <Route path="/saved" element={<Index />} />
                      <Route path="/analytics" element={<Index />} />
                      <Route path="/help" element={<Index />} />
                      <Route path="/terms" element={<Index />} />
                      <Route path="/premium" element={<Index />} />
                      <Route path="/admin" element={<Index />} />
                      <Route path="/:page" element={<Index />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </ConfirmationProvider>
            </VideoProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    );
  } catch (err) {
    console.error("💥 App component RENDER CRASHED:", err);
    return (
      <div style={{ background: 'red', color: 'white', padding: '20px' }}>
        <h1>App Component Crash</h1>
        <pre>{err instanceof Error ? err.message : String(err)}</pre>
      </div>
    );
  }
};

export default App;
