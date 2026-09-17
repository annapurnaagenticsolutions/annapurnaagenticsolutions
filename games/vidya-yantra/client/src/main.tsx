import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./mirror-polish.css";
import "./return-observatory.css";
import "./confluence-refinement.css";
import "./return-observatory-game.css";

createRoot(document.getElementById("root")!).render(<App />);
const finishBootFrame = () => {
  const boot = document.getElementById("yantra-boot");
  boot?.classList.add("boot-hidden");
  window.setTimeout(() => boot?.remove(), 360);
};
if (document.readyState === "complete") window.setTimeout(finishBootFrame, 1450);
else window.addEventListener("load", () => window.setTimeout(finishBootFrame, 1450), { once: true });
