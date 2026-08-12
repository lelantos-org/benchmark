// Bridge between DOM `Worker` and the `WorkerLike` shape the SDK expects.

import type { WorkerProver } from "@lelantos-org/sdk/prover";

/** The SDK's `WorkerLike` — structural, and not exported under its own name. */
export type SdkWorker = ConstructorParameters<typeof WorkerProver>[0]["worker"];

/**
 * A DOM `Worker` satisfies `WorkerLike` at runtime; only the declared
 * `onmessage` handler types are contravariant, which TS cannot reconcile. The
 * cast is confined to this one function.
 */
export const toSdkWorker = (worker: Worker): SdkWorker => worker as unknown as SdkWorker;
