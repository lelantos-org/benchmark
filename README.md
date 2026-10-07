# MASP LAN Benchmark

Measures four SDK workloads on real devices across a LAN. All drive the code
`@lelantos-org/sdk` ships to wallets — there is no bench-local reimplementation —
so the timings reflect what a wallet would actually see.

| Workload | Under test | Circuit / input |
|---|---|---|
| Groth16 proving | `WorkerProver` over `@lelantos-org/sdk/prover-worker` — ark-groth16 in wasm, `wasm-bindgen-rayon` thread pool | 4x6 from `@lelantos-org/circuits` |
| Wallet scan throughput | `WorkerPoolScanner` over `@lelantos-org/sdk/scanner-worker` — trial-decrypt via `WasmJubjub` | Synthetic note feed, minted in a bench-owned worker outside the timed window |
| Wallet sync: FMD vs full | `syncWallet` cold — the real paging loop, cursor, checkpointing and scanner pool | Synthetic `NoteSource` over a minted note pool; the link is modelled, the crypto is not |
| Merkle tree rebuild | `TreeStore` — chunk paging, `MerkleTree` inserts, Poseidon wasm on the main thread | Synthetic `CommitmentFeed` of full-width field elements, built outside the timed window |

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

## Layout

| Path | Contents |
|---|---|
| `src/benches/{proof,scan,sync,tree}/` | One folder per panel: component, hook, and the React-free measurement code |
| `src/sdk/` | Thin adapters over `@lelantos-org/sdk`: artifact URLs and cache, workers, prover, scanner, poseidon, log sink |
| `src/notegen/` | Worker minting the synthetic notes the scan and sync benches consume |
| `src/components/`, `src/hooks/`, `src/lib/` | Shared UI, run state machine, and pure helpers |
| `shared/circuits.ts` | The circuit set, shared by the app, the server and the witness script |
| `server/` | Vite plugin serving circuit artifacts, SDK wasm and the results log; dev TLS cert |
| `scripts/prepare-input.ts` | Witness generator behind `just prepare` |
| `test/` | Unit tests for the pure modules and the server helpers (`just test`) |

`just check` typechecks, lints and runs the tests.

## Using the page

Four panels, each with a run button:

- **Groth16 proof** — proves every selected shape: one uncounted warm-up plus 5
  timed iterations. Appends one row per shape to `results.json`, including the
  SDK log records forwarded from the worker.
- **Wallet scan throughput** — mints `N` synthetic notes at a configurable
  mine percentage, then scans them through the SDK worker pool. Reports hits,
  total, per-note and notes/s. Client-side only; nothing is posted.
- **Wallet sync: FMD vs full** — runs a cold `syncWallet` twice over the same
  scanner pool, once per note-feed strategy, and reports the two side by side.
  Client-side only; nothing is posted.
- **Merkle tree rebuild** — fills a `TreeStore` from leaf 0, then restores it
  from what it would have persisted, with and without the internal nodes.
  Client-side only; nothing is posted.

## Wallet sync panel

The SDK offers two note feeds. `full` (`FmdNoteSource`, `/v1/notes`) pulls every
note on chain; `matches` (`FmdMatchesNoteSource`, `/v1/matches`) pulls only what
the server's FMD filter kept — the wallet's own notes plus false positives at
`2^-γ`. Behind them the trial-decrypt path is identical, so the whole difference
is rows fetched, rows parsed and rows decrypted. The panel measures that
difference on a **cold sync**: a wallet restored from its key with an empty
store, paging the whole chain. That is the case FMD is argued about, and the one
that grows with the chain.

### What is real and what is modelled

**Real** — `syncWallet` itself, with its paging, cursors and checkpoints; pages
built as JSON text and parsed back with the SDK's own hex codecs, so the fetch
phase carries the response-handling cost that scales with rows; the
`WorkerPoolScanner` trial-decrypting genuine ciphertexts; `NoteCache.addHits`
dedupe. A run asserts `stoppedBy = exhausted` and that every own note was found,
so a number can only come from a sync that actually completed. The scanner pool
is warmed before timing, so neither strategy is charged for worker startup.

**Modelled** — the chain and the link. Foreign notes are cycled from a pool of
4096 rather than minted per row (trial-decrypt costs the same either way, and
the pool stays larger than a page so no page compresses better than a real one),
the FMD filter is a hash firing at `2^-γ` rather than a detection key, and each
page waits `rtt + bytes / bandwidth` — over the *compressed* size, measured with
`CompressionStream` off a real page, because hex JSON gzips around 2.3x and
ignoring that would hand FMD a bandwidth win it has not earned.

Server-side costs are out of scope on both sides: the indexer's FMD filter and a
new subscription's backfill are the price `matches` pays off the client, and
`backend/crates/crypto/benches/filter_batch.rs` measures them.

### Controls

Chain size, own notes, γ, page size, and a network profile. γ is clamped exactly as the server clamps it — to
`FMD_SENDER_GAMMA` and to whatever still leaves 64 expected decoys — and the
applied value is shown, so a small chain cannot claim a filter it would not be
granted. The `ideal` profile drops the network term entirely and leaves the
device's own decrypt and decode cost.

`full` at a large chain size is genuinely slow: it is parsing and scanning every
row. **Stop** aborts at the next page boundary.

## Merkle tree panel

The wallet keeps the whole commitment tree locally, so that asking for a Merkle
path does not reveal which note is being spent. The panel times the three ways
it comes to hold that tree:

| Tile | What runs | When a wallet pays it |
|---|---|---|
| cold sync | `sync()` from leaf 0, then `root()` | No stored tree, or `reset()` after the tree diverged from the chain |
| restore, leaves only | `loadState` without `nodes`, then `root()` | A `TreePersistence` that does not store `TreeStoreState.nodes` |
| restore, with nodes | `loadState` with `nodes`, then `root()` | Every ordinary page load |

The first two hash every internal node — about a third of the leaf count, the
*hashes* tile — and *per hash* is the leaves-only restore divided by that. The
third should hash nothing; what is left is the cost of re-inserting the saved
nodes.

The log line splits cold sync into `sync` and `root`, because which of the two
does the hashing depends on the SDK version: 0.42.0 only inserts leaves in
`sync()` and hashes the lot in the first `root()`, one uninterrupted block on
the main thread, while later versions hash each chunk as it arrives and release
the event loop in between. The total is comparable across versions; the split
shows how long the page is frozen.

**Real** — `TreeStore` and everything under it: `pageChunks`, the contiguity
check, `MerkleTree.bulkInsert`, the node cache, and `Poseidon` on the wasm
backend. It runs on the main thread because that is where a wallet runs it. A
run asserts that every leaf was synced and that all three trees agree on the
root.

**Modelled** — the feed. Leaves are full-width field elements rather than real
commitments, which Poseidon cannot tell apart, and chunks are handed over
already decoded with no latency. Fetching and parsing `/v1/commitments` is
therefore not in any number here.

The badge next to the result names the Poseidon backend. `Poseidon.build()`
falls back to JS tables when the wasm fails to load, without an error; a run
showing *JS fallback* measured that instead.

Depth defaults to the benched circuit's. It bounds capacity at `4^depth` and
adds one hash per level above the last full one, so it barely moves the times.

## Reference results

Recorded 2026-10-07 against SDK 0.47.0 and circuits 0.20.0, over HTTPS on a LAN.
The circuit is `Transact(11, 4, 6)` compiled at `--O2`: 28,775 constraints, FFT
domain 2^15. Each row is one run: 5 timed iterations, warm-up excluded.
*Artifacts* is the `cachedArtifacts` flag — whether the SDK's Cache API already
held the zkey.

| Device | Shape | Artifacts | Mean | Median | Min | Max | Prepare |
|---|---|---|---|---|---|---|---|
| macOS · Chrome 154 · 16 cores | 4x6 | cold | **230 ms** | 233 | 219 | 234 | 292 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 4x6 | cold | **1,015 ms** | 1,021 | 996 | 1,033 | 3,039 ms |
| iPhone · iOS 18.5 Safari · 4 cores | 4x6 | warm | **1,012 ms** | 1,008 | 986 | 1,040 | 173 ms |

A warm cache does not change the prove. It takes *prepare* on the iPhone from
~3 s to 173 ms: the 33 MB zkey and the witness wasm come from the Cache API
instead of the network.

### Where prove time goes

Per-iteration medians of the `lelantos:prover:wasm` records from the runs above —
logged at `debug` and posted to `results.json` with each row.

| Device | Threads | Witness | Groth16 | Total |
|---|---|---|---|---|
| macOS | 16 | 76 ms | 156 ms | ~233 ms |
| iPhone, cold | 4 | 75 ms | 946 ms | ~1,021 ms |
| iPhone, warm | 4 | 78 ms | 931 ms | ~1,008 ms |

Witness generation is single-threaded and costs the same ~75 ms on both devices.
Groth16 is the parallel part: a third of the prove is witness on the 16-thread
Mac, 7% on the 4-thread iPhone.

### Against the `--O1` circuit

The last runs before circuits 0.20.0, 2026-10-04 and 2026-10-05, proved the same
4x6 statement compiled at `--O1`: just under 70,000 constraints, domain 2^17.
Rows do not record the SDK or circuits version; these are matched by date. The
Mac ran Chrome 153 then and 154 now.

| Device | | `--O1` | `--O2` | Speedup |
|---|---|---|---|---|
| macOS · 16 threads | Prove, mean | 386 ms | 230 ms | 1.7x |
| | Groth16 | 305–312 ms | 156 ms | 2.0x |
| | Witness | 72–73 ms | 76 ms | — |
| iPhone · 4 threads | Prove, mean | 2,373–2,572 ms | 1,012–1,015 ms | 2.3–2.5x |
| | Groth16 | 2,259–2,422 ms | 931–946 ms | 2.4–2.6x |
| | Witness | 90–137 ms | 75–78 ms | — |

The gain is all in Groth16. Witness time stays at ~75 ms, so on the Mac it caps
the total at 1.7x while Groth16 itself halves.

### Earlier circuit sets

The numbers below predate circuits 0.11, which replaced the 2x2/3x3/4x4 set with
a single 4x6 arity at Merkle depth 11. They are not comparable to a 4x6 run;
`results.json` still holds those rows, which the chart skips and the table shows
under their own shape.

Recorded 2026-08-25 against SDK 0.20.0 and circuits 0.10.0. Every row in this
session was a cold fetch.

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

Per-iteration medians of the `lelantos:prover:wasm` records from the 2026-08-25
runs.

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
