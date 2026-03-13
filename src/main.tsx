import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const root = document.getElementById("root");
if (root) {
  if (window.location.search.includes("debug=true")) {
     root.innerHTML = "<h1 style='color: white; padding: 20px;'>DEBUG MODE: SYSTEM IS ALIVE</h1>";
  } else {
     createRoot(root).render(<App />);
  }
}
