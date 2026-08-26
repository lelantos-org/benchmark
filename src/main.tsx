import { requestPersistentStorage } from "@lelantos-org/sdk/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import "./styles.css";

// The SDK persists downloaded prover artifacts to the Cache API (~85 MB across
// all shapes, origin-scoped). WebKit evicts that storage after roughly 7 days
// without a visit, which restores the cold zkey download and makes a warm
// `prepare` measurement read as a first run. Chrome grants persistence from an
// engagement heuristic, so `false` is informational rather than a failure.
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
