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

Recorded 2026-08-12 against SDK 0.8.1 and circuits 0.8.0, over HTTPS on a LAN.
Each row is one run: 5 timed iterations, warm-up excluded.

| Device | Shape | Mean | Median | Min | Max | Prepare |
|---|---|---|---|---|---|---|
| macOS · Chrome 150 · 16 cores | 2x2 | **750 ms** | 748 | 746 | 757 | 275 ms |
| macOS · Chrome 150 · 16 cores | 3x3 | **932 ms** | 933 | 925 | 941 | 296 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 2x2 | **5,902 ms** | 5,951 | 5,679 | 6,092 | 11,494 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 3x3 | **7,411 ms** | 7,492 | 7,183 | 7,573 | 10,550 ms |

- The iPhone proves ~7.9× (2x2) and ~8.0× (3x3) slower than the Mac, on 4
  reported hardware threads against 16.
- Going from 2x2 to 3x3 costs ~24% on the Mac and ~26% on the iPhone.
- Prepare covers worker spawn, artifact fetch and thread-pool init. The
  iPhone's ~11 s is dominated by the first LAN download of the zkey; artifacts
  are served `immutable`, so later runs on that device skip it.
- Run-to-run spread is low single digits: a repeat 3x3 run on the same Mac
  measured 916 ms (−1.7%). An earlier session on that machine under Chrome 141,
  which reported 15 cores, gave 700 ms (2x2) and 873 ms (3x3).