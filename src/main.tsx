import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootReadingPreferences } from "./hooks/useReadingPreferences";

bootReadingPreferences();

createRoot(document.getElementById("root")!).render(<App />);
