import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App.tsx";
import "./index.css";

console.log("🚀 STARTING APP RENDER... (v13)");

try {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log("✅ Render call sent to ReactDOM.");
  } else {
    console.error("❌ ROOT NOT FOUND");
  }
} catch (err) {
  console.error("💥 MAIN.TSX CRASHED:", err);
}
