// Bridge between the DOM `Worker` type and the `WorkerLike` shape the SDK expects.

import type { WorkerProver } from "@lelantos-org/sdk/prover";

/** The SDK's structural `WorkerLike` type, which it does not export by name. */
export type SdkWorker = ConstructorParameters<typeof WorkerProver>[0]["worker"];

/**
 * A DOM `Worker` satisfies `WorkerLike` at runtime; the two differ only in the
 * contravariant `onmessage` handler types, which TypeScript cannot reconcile.
 * The cast is confined to this function.
 */
export const toSdkWorker = (worker: Worker): SdkWorker => worker as unknown as SdkWorker;
