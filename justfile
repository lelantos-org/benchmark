set shell := ["bash", "-ceuo", "pipefail"]

ROOT := justfile_directory() / ".."
BENCH := justfile_directory()
WASM_WORKSPACE := ROOT / "sdk" / "wasm"
PROVER := WASM_WORKSPACE / "prover"

default:
    @just --list

# Install bench's own ts-node + types if missing.
install:
    cd "{{BENCH}}" && [ -d node_modules ] || npm install --no-audit --no-fund

# Build canonical witness for the LAN benchmark UI (bench/public/input.json).
prepare: install
    cd "{{BENCH}}" && node --import ./register.mjs prepare.ts

# Build the Rust ark-circom prover and copy the wasm-pack output into bench/prover-pkg/.
# Requires nightly toolchain + rust-src component + wasm-pack on PATH.
prover-build:
    cd "{{WASM_WORKSPACE}}" && just prover-build
    rm -rf "{{BENCH}}/prover-pkg"
    cp -R "{{PROVER}}/pkg" "{{BENCH}}/prover-pkg"
    @echo "copied {{PROVER}}/pkg -> bench/prover-pkg"

# Build the wallet-scan bench worker (esbuild bundles SDK + WasmJubjub).
# Re-run after editing bench/src/scan-worker.ts.
scan-build: install
    cd "{{BENCH}}" && npm run scan-bench-build

# Run LAN benchmark webserver on :8787 (override with PORT=).
# HTTPS-only (self-signed cert auto-generated): multi-thread Rust prover on
# mobile Safari needs a secure context for SharedArrayBuffer.
serve PORT="8787": install
    cd "{{BENCH}}" && HTTPS=1 PORT={{PORT}} node --import ./register.mjs server.ts
