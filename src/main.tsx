import { requestPersistentStorage } from "@lelantos-org/sdk/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

// SDK 0.9.0 persists downloaded prover artifacts to the Cache API by default —
// ~85 MB across both shapes, origin-scoped, so a reload and the prover worker
// share one copy. WebKit evicts that storage after ~7 days without a visit,
// which would silently restore the cold zkey download and make a warm `prepare`
// number read like a first run. Chrome decides on an engagement heuristic
// rather than a prompt, so a `false` is informational, not a failure.
void requestPersistentStorage().then(granted => {
    console.info(`persistent storage: ${granted ? "granted" : "not granted"}`);
});

const root = document.getElementById("root");
if (!root) throw new Error("#root missing");

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>,
);
