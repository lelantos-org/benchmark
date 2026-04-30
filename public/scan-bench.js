// Wallet scan-throughput bench panel. Spawns the bundled
// `bench.scan.worker.js` (esbuild-bundled SDK + WasmJubjub).
//
// Wrapped in IIFE: bench.js declares `$` and `log` at top level, second
// global declaration throws SyntaxError and silently kills this script.

(() => {
    const $ = (id) => document.getElementById(id);
    const slog = (...a) => {
        const el = $("scan-log");
        el.textContent += a.join(" ") + "\n";
        el.scrollTop = el.scrollHeight;
    };
    const sStatus = (s, cls = "") => {
        const el = $("scan-status");
        el.textContent = s;
        el.className = cls;
    };

    let worker = null;
    function getWorker() {
        if (!worker) {
            worker = new Worker("/bench.scan.worker.js", { type: "module" });
            worker.addEventListener("error", (e) => {
                slog("worker error: " + (e.message || "unknown"));
                sStatus("worker error", "err");
            });
        }
        return worker;
    }

    function once(w, predicate) {
        return new Promise((resolve, reject) => {
            const fn = (ev) => {
                const m = ev.data;
                if (m?.type === "error") { w.removeEventListener("message", fn); reject(new Error(m.message)); return; }
                if (predicate(m)) { w.removeEventListener("message", fn); resolve(m); }
            };
            w.addEventListener("message", fn);
        });
    }

    async function runScan() {
        const btn = $("run-scan");
        btn.disabled = true;
        sStatus("preparing…");
        try {
            const w = getWorker();
            slog("loading WasmJubjub + generating keys…");
            const t0 = performance.now();
            w.postMessage({ type: "prepare" });
            await once(w, (m) => m.type === "prepared");
            slog(`prepared in ${(performance.now() - t0).toFixed(0)}ms`);

            const n = parseInt($("scan-n").value, 10);
            const mineFrac = Math.max(0, Math.min(100, parseFloat($("scan-mine").value))) / 100;

            slog(`generating ${n} synthetic notes (${(mineFrac * 100).toFixed(1)}% mine)…`);
            sStatus("scanning…");
            w.postMessage({ type: "run", n, mineFrac });
            const r = await once(w, (m) => m.type === "result");

            slog(`hits=${r.hits}  total=${r.totalMs.toFixed(0)}ms  per-note=${r.perNoteMs.toFixed(3)}ms  rate=${r.notesPerSec.toFixed(0)}/s`);
            sStatus("done", "ok");
        } catch (e) {
            slog("error: " + (e?.message || String(e)));
            sStatus("failed", "err");
        } finally {
            btn.disabled = false;
        }
    }

    $("run-scan").addEventListener("click", runScan);
})();
