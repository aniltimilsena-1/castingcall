import { createRoot } from "react-dom/client";
import React from "react";

console.log("🚀 STARTING PURE REACT RENDER...");

try {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    const root = createRoot(rootElement);
    root.render(React.createElement("h1", { style: { color: "#FFD700", textAlign: "center", marginTop: "100px" } }, "⚛️ PURE REACT IS RENDERING"));
    console.log("✅ Render call sent.");
  } else {
    console.error("❌ ROOT NOT FOUND");
  }
} catch (err) {
  console.error("💥 REACT RENDER CRASHED:", err);
}
