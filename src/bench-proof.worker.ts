// Proof bench worker. Wraps SDK WasmProver (ark-groth16 + circom witness calc).
// Receives paths via "prepare", runs prove() on each "prove" message.

import { WasmProver, configureProverWasm } from "@lelantos-org/sdk/wasm-prover";

// Load prover pkg dynamically from its served URL at runtime, NOT from the esbuild
// bundle. This preserves import.meta.url inside workerHelpers.js so rayon's
// startWorkers() can spawn sub-workers at the correct path:
//   /wasm/prover/pkg/snippets/wasm-bindgen-rayon-.../workerHelpers.js
// If the bundled copy were used, import.meta.url = bundled worker URL → wrong path → timeout.
configureProverWasm({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore — absolute URL import intentionally not type-checked
    loadModule: () => import("/wasm/prover/pkg/prover.js"),
    wasm: "/wasm/prover/pkg/prover_bg.wasm",
});

type Msg =
    | { type: "prepare"; wasmPath: string; zkeyPath: string }
    | { type: "prove"; input: Record<string, unknown> }
    | { type: "dispose" };

let prover: WasmProver | null = null;

const post = (m: unknown): void =>
    (self as unknown as { postMessage: (m: unknown) => void }).postMessage(m);

const dbg = (stage: string, info?: unknown): void =>
    post({ type: "debug", stage, info: info ?? {} });

async function prepare(req: Extract<Msg, { type: "prepare" }>): Promise<void> {
    const isolated = (self as any).crossOriginIsolated as boolean;
    const cores = (self as any).navigator?.hardwareConcurrency ?? 0;
    dbg("init-start", { isolated, cores });
    const t0 = performance.now();
    prover = await WasmProver.build({ wasmPath: req.wasmPath, zkeyPath: req.zkeyPath });
    const buildMs = performance.now() - t0;
    dbg("build-done", { ms: buildMs });
    post({ type: "prepared", threads: cores, isolated, prepareMs: buildMs });
}

async function prove(req: Extract<Msg, { type: "prove" }>): Promise<void> {
    if (!prover) throw new Error("not prepared");
    const t0 = performance.now();
    const result = await prover.prove(req.input);
    const ms = performance.now() - t0;
    post({ type: "proved", ms, proof: result.proof, publicSignals: result.publicSignals });
}

self.addEventListener("message", async (ev: MessageEvent) => {
    const msg = ev.data as Msg;
    try {
        if (msg.type === "prepare") await prepare(msg);
        else if (msg.type === "prove") await prove(msg);
        else if (msg.type === "dispose") { prover = null; post({ type: "disposed" }); }
    } catch (e) {
        post({ type: "error", message: e instanceof Error ? e.message : String(e) });
    }
});
