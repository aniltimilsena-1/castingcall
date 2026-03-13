import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 CaastingCall Application Mounting...");

try {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element (#root) not found in index.html");
  
  createRoot(root).render(<App />);
  console.log("✅ Render call successful.");
} catch (err) {
  console.error("💥 CRITICAL RENDER FAILURE:", err);
}
