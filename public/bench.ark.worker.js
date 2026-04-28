// Module worker: ark-circom + ark-groth16 (Rust → WASM, rayon-parallel).
// Loads the wasm pkg, plus snarkjs witness_calculator.js for witgen.

import init, { initThreadPool, ProverSession } from "/rust-prover/rust_prover.js";

let session = null;
let witCalc = null;

const dbg = (stage, info) => self.postMessage({ type: "debug", stage, info: info ?? {} });

// circom witness_calculator.js is CommonJS-ish: assigns module.exports = builder.
async function loadWitnessCalculator(wasmU8) {
    const r = await fetch("/witness_calculator.js");
    if (!r.ok) throw new Error("witness_calculator.js fetch failed: " + r.status);
    const wrapped = `(function(){const module={exports:null};${await r.text()};return module.exports;})()`;
    return (0, eval)(wrapped)(wasmU8);
}

async function prepare({ zkey, wasm }) {
    const t = performance.now();
    dbg("init-start", { isolated: !!self.crossOriginIsolated, cores: navigator.hardwareConcurrency });
    await init();
    dbg("init-done", { ms: performance.now() - t });

    const cores = navigator.hardwareConcurrency || 4;
    if (typeof initThreadPool === "function" && self.crossOriginIsolated) {
        dbg("threadpool-start", { cores });
        try {
            await initThreadPool(cores);
            dbg("threadpool-done", { ms: performance.now() - t });
        } catch (e) {
            dbg("threadpool-failed", { error: e?.message || String(e) });
        }
    } else {
        dbg("threadpool-skipped", { isolated: !!self.crossOriginIsolated });
    }

    dbg("session-build-start");
    session = new ProverSession(zkey);
    dbg("session-build-done", { ms: performance.now() - t });

    dbg("witcalc-load-start");
    witCalc = await loadWitnessCalculator(wasm);
    dbg("witcalc-load-done", { ms: performance.now() - t });

    return { type: "prepared", prepareMs: performance.now() - t, threads: cores, isolated: !!self.crossOriginIsolated };
}

async function prove({ input }) {
    const t = performance.now();
    const wtns = await witCalc.calculateWTNSBin(input, 0);
    const wtnsU8 = wtns instanceof Uint8Array ? wtns : new Uint8Array(wtns);
    const tProve = performance.now();
    const proof = session.prove(wtnsU8);
    const total = performance.now() - t;
    const witnessMs = tProve - t;
    const proveMs = performance.now() - tProve;
    return {
        type: "proved",
        ms: total,
        proveMs,
        witnessMs,
        profLine: `[ark-prof] witness=${witnessMs.toFixed(0)}ms prove=${proveMs.toFixed(0)}ms total=${total.toFixed(0)}ms`,
        prof: { engine: "ark-circom", witnessMs, proveMs, total },
        proof,
    };
}

const handlers = {
    prepare,
    prove,
    dispose: () => { session = null; witCalc = null; return { type: "disposed" }; },
};

self.addEventListener("message", async ({ data }) => {
    const fn = handlers[data?.type];
    if (!fn) return;
    try {
        self.postMessage(await fn(data));
    } catch (e) {
        self.postMessage({ type: "error", message: e?.message || String(e) });
    }
});
