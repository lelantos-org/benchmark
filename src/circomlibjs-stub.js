// Empty stub. Bench worker never calls circomlibjs (uses WasmJubjub).
// Static imports of `buildBabyjub`/`buildPoseidon`/`buildPedersenHash` from
// `Jubjub`/`Poseidon` class files resolve here; runtime execution would
// throw, but those classes' `.build()` is never invoked in the browser.
export const buildBabyjub = () => { throw new Error("circomlibjs stubbed in bench browser bundle"); };
export const buildPoseidon = () => { throw new Error("circomlibjs stubbed in bench browser bundle"); };
export const buildPedersenHash = () => { throw new Error("circomlibjs stubbed in bench browser bundle"); };
