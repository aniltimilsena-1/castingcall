import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 CaastingCall Application Mounting...");

// Universal error handler for blank screen debugging
window.onerror = (msg, url, lineNo, columnNo, error) => {
  console.error("❌ GLOBAL ERROR:", msg, "at", url, ":", lineNo, ":", columnNo, error);
  const root = document.getElementById("root");
  if (root && root.innerHTML === "") {
    root.innerHTML = `<div style="color: white; background: black; height: 100vh; display: flex; align-items: center; justify-content: center; font-family: sans-serif; text-align: center; padding: 20px;">
      <div>
        <h1 style="color: #FFD700;">Initialization Error</h1>
        <p>The application failed to start. This is usually due to missing configuration or a network issue.</p>
        <pre style="background: #1a1a1a; padding: 10px; border-radius: 8px; color: #ff6b6b; font-size: 12px; margin-top: 20px; text-wrap: wrap;">${msg}</pre>
        <button onclick="window.location.reload()" style="margin-top: 20px; background: #FFD700; color: black; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-weight: bold;">Retry</button>
      </div>
    </div>`;
  }
  return false;
};

try {
  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element not found");
  
  createRoot(rootElement).render(<App />);
  console.log("✅ Render call completed.");
} catch (err) {
  console.error("💥 FAILED TO RENDER APP:", err);
}
