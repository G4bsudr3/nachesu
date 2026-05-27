import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootReadingPreferences } from "./hooks/useReadingPreferences";
import { RootErrorBoundary } from "./components/system/RootErrorBoundary";

bootReadingPreferences();

createRoot(document.getElementById("root")!).render(
  <RootErrorBoundary scope="root">
    <App />
  </RootErrorBoundary>,
);
