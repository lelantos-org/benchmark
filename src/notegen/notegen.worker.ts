// Worker shell around `createMinter`: mints one index range of the feed.

import { transferablesOf } from "@lelantos-org/sdk/internal";
import { configureJubjubWasm, Jubjub, Poseidon } from "@lelantos-org/sdk/primitives";

import { errMsg } from "../lib/errors";
import { JUBJUB_WASM } from "../sdk/artifacts";
import { createMinter } from "./mint";
import type { NotegenRequest, NotegenResponse } from "./protocol";

configureJubjubWasm({
    loadModule: () => import(/* @vite-ignore */ JUBJUB_WASM.jubjubModuleUrl),
    wasm: JUBJUB_WASM.jubjubWasmUrl,
});

// Both the DOM and WebWorker libs are in scope for src/, so `self` widens to
// `Window`. Pin the worker scope once rather than casting at each use.
const ctx = self as unknown as DedicatedWorkerGlobalScope;

async function handle({ from, to, mineBelow }: NotegenRequest): Promise<void> {
    const [J, P] = await Promise.all([Jubjub.build(), Poseidon.build()]);
    const minter = createMinter(J, P);
    const inputs = minter.mint(from, to, mineBelow);
    post({ type: "minted", ivk: minter.ivk.toString(), inputs }, transferablesOf(inputs));
}

function post(msg: NotegenResponse, transfer: Transferable[] = []): void {
    ctx.postMessage(msg, transfer);
}

// The listener stays synchronous: an async one returns a promise the event
// target discards, so a rejection would surface as an unhandled rejection
// instead of the error message the client awaits.
ctx.addEventListener("message", (ev: MessageEvent<NotegenRequest>) => {
    handle(ev.data).catch((e: unknown) => post({ type: "error", message: errMsg(e) }));
});
