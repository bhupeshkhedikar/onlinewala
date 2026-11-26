import { useEffect } from "react";
import "./WeddingInvitation.css";

// Faithful React host for the original invitation experience.
// The original React-SVG illustrations, CSS animations and interaction logic
// live in wedding-runtime.js so they can be kept intact rather than redrawn.

const SCRIPT_URLS = [
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "https://unpkg.com/htm@3.1.1/dist/htm.umd.js",
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.scripts].find((script) => script.src === src);
    if (existing?.dataset.loaded === "true") return resolve();
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function App() {
  useEffect(() => {
    if (!window.__kabirMeeraRuntimePromise) {
      window.__kabirMeeraRuntimePromise = (async () => {
        try {
          for (const src of SCRIPT_URLS) {
            await loadScript(src);
          }
          const runtime = document.createElement("script");
          runtime.src = "/wedding-runtime.js";
          runtime.async = false;
          runtime.onload = () => {
            window.__kabirMeeraRuntimeStarted = true;
          };
          runtime.onerror = () => {
            window.__kabirMeeraRuntimePromise = null;
            console.error("Could not load wedding-runtime.js. Put it in the public folder.");
          };
          document.body.appendChild(runtime);
        } catch (error) {
          window.__kabirMeeraRuntimePromise = null;
          console.error("Could not load the wedding invitation dependencies.", error);
        }
      })();
    }
  }, []);

  return (
    <div className="wedding-react-host">
      <canvas id="petals" aria-hidden="true" />
      <button id="music" type="button" aria-pressed="false" aria-label="Music">
        <span className="bars"><i /><i /><i /></span>
      </button>
      <div id="app" />
    </div>
  );
}
