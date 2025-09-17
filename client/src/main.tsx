import { createRoot } from "react-dom/client";
import App from "./App";
import "./index-critical.css";

// Load non-critical CSS after initial render
const loadNonCriticalCSS = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/src/index-non-critical.css';
  link.media = 'print';
  link.onload = () => {
    link.media = 'all';
  };
  document.head.appendChild(link);
};

// Load non-critical CSS after initial render
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadNonCriticalCSS);
} else {
  loadNonCriticalCSS();
}

createRoot(document.getElementById("root")!).render(
  <App />
);
