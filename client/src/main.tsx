import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@cometchat/chat-uikit-react/css-variables.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
