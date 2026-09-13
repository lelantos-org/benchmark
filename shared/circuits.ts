// The circuit set the bench measures, shared by everything that has to agree on
// it: the witness generator (scripts/prepare-input.ts), the routes serving the
// artifacts (server/bench-api.ts) and the app (src/sdk/artifacts.ts).
//
// It lives outside src/ because the Node side imports it too, and must stay free
// of anything that exists only inside the Vite bundle, such as the
// `__CIRCUITS_VERSION__` define.

/** One `Transact(depth, nIn, nOut)` instance shipped by `@lelantos-org/circuits`. */
export interface Circuit {
    /** Artifact basename: `<name>.wasm`, `<name>_final.zkey`, `input.<name>.json`. */
    name: string;
    /** Merkle depth the circuit was compiled with; the witness must match it. */
    depth: number;
    nIn: number;
    nOut: number;
}

/**
 * Mirrors `circuit.template` in the package's own vectors — for 4x6, that is
 * `Transact(11, 4, 6)` in `@lelantos-org/circuits/vectors/transact-4x6.json`.
 * A circuit set shipping further arities needs one more entry here and nothing
 * else.
 */
export const CIRCUITS = [
    { name: "4x6", depth: 11, nIn: 4, nOut: 6 },
] as const satisfies readonly Circuit[];

/** Arity names, in the order the bench proves and charts them. */
export type Shape = (typeof CIRCUITS)[number]["name"];
export const SHAPES: readonly Shape[] = CIRCUITS.map(c => c.name);

/**
 * Narrows a recorded shape string. results.json is append-only across circuit
 * sets, so it also holds arities the installed circuits no longer ship.
 */
export const isShape = (s: string): s is Shape =>
    (SHAPES as readonly string[]).includes(s);

/** File names for one shape, relative to wherever each is served from. */
export const artifactNames = (shape: Shape) => ({
    wasm: `${shape}.wasm`,
    zkey: `${shape}_final.zkey`,
    witness: `input.${shape}.json`,
}) as const;
