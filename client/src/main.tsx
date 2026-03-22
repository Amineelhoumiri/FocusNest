// src/main.tsx
// Application entry point. Mounts the React component tree into the DOM.

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
