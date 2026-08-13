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

| Recipe | Does |
|---|---|
| `just serve [port]` | Dev server on `port` (default 8787), after `install` and `prepare` |
| `just preview [port]` | Production build, served the same way |
| `just prepare` | Regenerate `public/input.2x2.json` and `input.3x3.json` |
| `just check` | `tsc -b` (app + Node projects) and ESLint |
| `just lint` | ESLint only |

`HTTPS=0 npm run dev` disables TLS for localhost-only work.

### Cross-origin isolation and Safari

Both benches run in workers under `COOP: same-origin` + `COEP: require-corp`,
which is what makes `SharedArrayBuffer` (and so the rayon thread pool)
available. WebKit enforces that policy on the worker *script* response as well:
a response without the headers cannot start a worker, and Vite's `server.headers`
do not reach the `304 Not Modified` replies it sends on revalidation. So
`server/bench-api.ts` stamps the isolation headers on every response itself.

Without that, the scan bench fails on iOS Safari while the proof bench looks
fine: the scan pool spawns several workers from one URL at once, so the first
gets a `200` and the rest revalidate into header-less `304`s and are blocked.
Chromium accepts those, which is why it only reproduces on Safari.

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
| macOS · Chrome 150 · 16 cores | 2x2 | cold | **760 ms** | 761 | 751 | 769 | 317 ms |
| macOS · Chrome 150 · 16 cores | 3x3 | cold | **914 ms** | 909 | 903 | 931 | 295 ms |
| macOS · Chrome 150 · 16 cores | 2x2 | warm | **755 ms** | 751 | 747 | 771 | 258 ms |
| macOS · Chrome 150 · 16 cores | 3x3 | warm | **913 ms** | 913 | 909 | 919 | 198 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 2x2 | cold | **2,773 ms** | 2,796 | 2,642 | 2,854 | 2,743 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 3x3 | cold | **3,747 ms** | 3,751 | 3,689 | 3,787 | 2,504 ms |

- The iPhone proves ~3.6× (2x2) and ~4.1× (3x3) slower than the Mac, on 4
  reported hardware threads against 16.
- Going from 2x2 to 3x3 costs ~20% on the Mac and ~35% on the iPhone.
- Prepare covers worker spawn, artifact load and thread-pool init. Warming the
  artifact cache takes it from 317→258 ms (2x2) and 295→198 ms (3x3) on the Mac.
- From SDK 0.9.0 the prover persists artifacts to the Cache API, which is
  origin-scoped and therefore shared by the page and the prover worker. Rows
  record which state they measured in `cachedArtifacts`, the summary tile reads
  *prepare (cold)* or *prepare (warm)*, and **Clear artifact cache** in the
  proof panel puts the device back to cold. Only compare prepare across rows in
  the same state.

### What changed since the 0.8.1 rows

The previous table (2026-08-12, SDK 0.8.1) recorded the iPhone at 5,902 ms
(2x2) / 7,411 ms (3x3) with an ~11 s prepare. Both figures roughly halved
without the prover itself changing, and **the artifact cache does not explain
it** — both iPhone rows above are `cachedArtifacts: false`, and in any case
artifact caching only moves *prepare*, never the timed prove loop.

Two things are unaccounted for and worth pinning down before either table is
cited as a baseline:

- **Prepare 11.5 s → 2.7 s on a cold run.** Most likely the browser's own HTTP
  disk cache: artifacts are served `immutable`, so a device that has fetched
  them before skips the transfer even when the SDK-level cache is cold. That
  makes "cold" mean two different things depending on visit history.
- **The prove loop halving.** No SDK change between the two dates touches
  steady-state proving. Thermal state, low-power mode, or background load on
  the earlier run are the plausible candidates. Untested.

Re-run both devices from a cleared HTTP cache before treating either set as
authoritative.

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