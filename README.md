# MASP LAN Benchmark

Measures two SDK workloads on real devices across a LAN. Both drive the code
`@lelantos-org/sdk` ships to wallets — there is no bench-local reimplementation —
so the timings reflect what a wallet would actually see.

| Workload | Under test | Circuit / input |
|---|---|---|
| Groth16 proving | `WorkerProver` over `@lelantos-org/sdk/prover-worker` — ark-groth16 in wasm, `wasm-bindgen-rayon` thread pool | 2x2 and 3x3 from `@lelantos-org/circuits` |
| Wallet scan throughput | `WorkerPoolScanner` over `@lelantos-org/sdk/scanner-worker` — trial-decrypt via `WasmJubjub` | Synthetic note feed, minted in a bench-owned worker outside the timed window |

The dev server binds `0.0.0.0`: any device on the same network opens the URL,
runs the benches, and posts its results back to the host.

## Quick start

Requires Node, npm, `just`, `openssl` on `PATH`, and access to the
`@lelantos-org` GitHub npm registry (see `.npmrc`). Nothing is built from
source: the prover and jubjub wasm ship inside the SDK, the circuit
`.wasm`/`.zkey` inside `@lelantos-org/circuits`.

```bash
just serve               # install, generate witnesses, serve HTTPS on :8787
```

It prints the URLs to open, including one per LAN interface:

```
bench: https://localhost:8787
lan:   https://192.168.1.42:8787
```

## Using the page

Two panels, each with a run button:

- **Groth16 proof** — proves every selected shape: one uncounted warm-up plus 5
  timed iterations. Appends one row per shape to `results.json`, including the
  SDK log records forwarded from the worker.
- **Wallet scan throughput** — mints `N` synthetic notes at a configurable
  mine percentage, then scans them through the SDK worker pool. Reports hits,
  total, per-note and notes/s. Client-side only; nothing is posted.

## Reference results

Recorded 2026-08-13 against SDK 0.9.0 and circuits 0.8.0, over HTTPS on a LAN.
Each row is one run: 5 timed iterations, warm-up excluded. *Artifacts* is the
`cachedArtifacts` flag — whether the SDK's Cache API already held the zkey.

| Device | Shape | Artifacts | Mean | Median | Min | Max | Prepare |
|---|---|---|---|---|---|---|---|
| macOS · Chrome 150 · 16 cores | 2x2 | warm | **755 ms** | 751 | 747 | 771 | 258 ms |
| macOS · Chrome 150 · 16 cores | 3x3 | warm | **913 ms** | 913 | 909 | 919 | 198 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 2x2 | cold | **2,773 ms** | 2,796 | 2,642 | 2,854 | 2,743 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 3x3 | cold | **3,747 ms** | 3,751 | 3,689 | 3,787 | 2,504 ms |

### Where prove time goes

Measured in-process on a 16-core Mac (Node, not the browser), warm — the split
is logged at `debug` on `lelantos:prover:wasm` and printed by the SDK's
`npm run test:bench`:

| Shape | Witness | Groth16 | Total |
|---|---|---|---|
| 2x2 | 177 ms | 560 ms | ~740 ms |
| 3x3 | 259 ms | 665 ms | ~925 ms |

Witness generation is single-threaded and does not respond to thread count.
Groth16 is the parallel part — 3x3 on the same machine: 1,288 ms at 4 threads,
774 ms at 8, 665 ms at 16.

- Run-to-run spread is low single digits. An earlier session on that Mac under
  Chrome 141, which reported 15 cores, gave 700 ms (2x2) and 873 ms (3x3).