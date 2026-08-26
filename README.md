# MASP LAN Benchmark

Measures two SDK workloads on real devices across a LAN. Both drive the code
`@lelantos-org/sdk` ships to wallets — there is no bench-local reimplementation —
so the timings reflect what a wallet would actually see.

| Workload | Under test | Circuit / input |
|---|---|---|
| Groth16 proving | `WorkerProver` over `@lelantos-org/sdk/prover-worker` — ark-groth16 in wasm, `wasm-bindgen-rayon` thread pool | 2x2, 3x3 and 4x4 from `@lelantos-org/circuits` |
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

Recorded 2026-08-25 against SDK 0.20.0 and circuits 0.10.0, over HTTPS on a LAN.
Each row is one run: 5 timed iterations, warm-up excluded. *Artifacts* is the
`cachedArtifacts` flag — whether the SDK's Cache API already held the zkey; every
row in this session was a cold fetch.

| Device | Shape | Artifacts | Mean | Median | Min | Max | Prepare |
|---|---|---|---|---|---|---|---|
| macOS · Chrome 150 · 16 cores | 2x2 | cold | **476 ms** | 476 | 470 | 482 | 249 ms |
| macOS · Chrome 150 · 16 cores | 3x3 | cold | **562 ms** | 561 | 557 | 567 | 230 ms |
| macOS · Chrome 150 · 16 cores | 4x4 | cold | **780 ms** | 778 | 771 | 791 | 310 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 2x2 | cold | **1,627 ms** | 1,639 | 1,562 | 1,672 | 2,520 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 3x3 | cold | **2,092 ms** | 2,081 | 2,039 | 2,135 | 1,706 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 4x4 | cold | **3,249 ms** | 3,263 | 3,187 | 3,300 | 2,076 ms |

4x4 costs ~1.4x a 3x3 prove on the Mac and ~1.6x on the iPhone. Its zkey is also
~40 MB against 3x3's ~29 MB, so a cold run pays a longer fetch on top.

Earlier session, 2026-08-13 on SDK 0.9.0 / circuits 0.8.0 — 2x2 and 3x3 only, and
the only rows here with warm artifacts:

| Device | Shape | Artifacts | Mean | Median | Min | Max | Prepare |
|---|---|---|---|---|---|---|---|
| macOS · Chrome 150 · 16 cores | 2x2 | warm | **755 ms** | 751 | 747 | 771 | 258 ms |
| macOS · Chrome 150 · 16 cores | 3x3 | warm | **913 ms** | 913 | 909 | 919 | 198 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 2x2 | cold | **2,773 ms** | 2,796 | 2,642 | 2,854 | 2,743 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 3x3 | cold | **3,747 ms** | 3,751 | 3,689 | 3,787 | 2,504 ms |

The two sessions are not comparable run-for-run: the SDK got materially faster in
between.

### Where prove time goes

Per-iteration medians of the `lelantos:prover:wasm` records from the runs above —
logged at `debug` and posted to `results.json` with each row.

macOS · 16 threads:

| Shape | Witness | Groth16 | Total |
|---|---|---|---|
| 2x2 | 88 ms | 389 ms | ~476 ms |
| 3x3 | 128 ms | 433 ms | ~562 ms |
| 4x4 | 166 ms | 611 ms | ~780 ms |

iPhone · 4 threads:

| Shape | Witness | Groth16 | Total |
|---|---|---|---|
| 2x2 | 100 ms | 1,520 ms | ~1,627 ms |
| 3x3 | 147 ms | 1,933 ms | ~2,092 ms |
| 4x4 | 193 ms | 3,053 ms | ~3,249 ms |

Witness generation is single-threaded and does not respond to thread count; it
tracks constraint count almost linearly across the three shapes. Groth16 is the
parallel part, and it is what 4x4 pays for — on the 4-thread iPhone it is ~94% of
the prove. On the earlier SDK 0.9.0 in-process Node bench, 3x3 Groth16 ran
1,288 ms at 4 threads, 774 ms at 8, 665 ms at 16.

Run-to-run spread is low single digits of a percent within a session; across
sessions the SDK version dominates.
