import { createRoot } from "react-dom/client";
import React from "react";
// import App from "./App.tsx";
// import "./index.css";

console.log("🚀 STARTING APP RENDER... (v14)");

try {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(React.createElement("div", { 
      style: { 
        background: "#000", 
        color: "#0f0", 
        height: "100vh", 
        display: "flex", 
        flexDirection: "column",
        alignItems: "center", 
        justifyContent: "center", 
        fontFamily: "monospace" 
      } 
    }, [
      React.createElement("h1", null, "✅ V14 SYSTEM ONLINE"),
      React.createElement("p", null, "Entry point is executing correctly.")
    ]));
    console.log("✅ Render call sent to ReactDOM (v14).");
  } else {
    console.error("❌ ROOT NOT FOUND");
  }
} catch (err) {
  console.error("💥 MAIN.TSX CRASHED (v14):", err);
}
