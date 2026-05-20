set shell := ["bash", "-ceuo", "pipefail"]

ROOT := justfile_directory() / ".."
BENCH := justfile_directory()

default:
    @just --list

# Install bench dependencies if missing.
install:
    cd "{{BENCH}}" && [ -d node_modules ] || npm install --no-audit --no-fund

# Build canonical witness for the LAN benchmark UI (bench/public/input.json).
prepare: install
    cd "{{BENCH}}" && npm run prepare-input

# Build the proof bench worker (esbuild bundles SDK WasmProver).
# Re-run after editing bench/src/bench-proof.worker.ts.
proof-build: install
    cd "{{BENCH}}" && npm run proof-bench-build

# Build the wallet-scan bench worker (esbuild bundles SDK + WasmJubjub).
# Re-run after editing bench/src/scan-worker.ts.
scan-build: install
    cd "{{BENCH}}" && npm run scan-bench-build

# Build both bench workers.
bench-build: install
    cd "{{BENCH}}" && npm run bench-build

# Run LAN benchmark webserver on :8787 (override with PORT=).
# HTTPS-only (self-signed cert auto-generated): SharedArrayBuffer requires secure context.
serve PORT="8787": install
    cd "{{BENCH}}" && HTTPS=1 PORT={{PORT}} npm run serve
